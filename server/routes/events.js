const express = require("express");
const { Op } = require("sequelize");
const { Event, Seat, Reservation, User } = require("../models");
// Added sequelize import for categories route
const { sequelize } = require("../config/database");
const { auth, optionalAuth } = require("../middleware/auth");

// Helper to build absolute poster URL
function buildPosterUrl(posterPath) {
  if (!posterPath) return null;
  if (/^https?:/i.test(posterPath)) return posterPath; // already absolute
  const base =
    process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  const normalized = posterPath.startsWith("/") ? posterPath : `/${posterPath}`;
  return `${base}${normalized}`;
}

const router = express.Router();

// Move specific routes BEFORE dynamic :id to avoid conflicts
router.get("/featured/list", async (req, res) => {
  try {
    const featuredEvents = await Event.findAll({
      where: { status: "published", eventDate: { [Op.gte]: new Date() } },
      limit: 6,
      order: [["eventDate", "ASC"]],
      include: [
        {
          model: Seat,
          as: "seats",
          attributes: ["id", "isReserved"],
          required: false,
        },
      ],
    });

    const eventsWithAvailability = featuredEvents.map((event) => {
      const totalSeats = event.seats?.length || 0;
      const reservedSeats =
        event.seats?.filter((seat) => seat.isReserved).length || 0;
      const availableSeats = totalSeats - reservedSeats;

      return {
        ...event.toJSON(),
        posterImageUrl: buildPosterUrl(event.posterImage),
        availableSeats,
        isAvailable: availableSeats > 0,
        seats: undefined,
      };
    });

    res.json({ events: eventsWithAvailability });
  } catch (error) {
    console.error("Get featured events error (reordered):", error);
    res
      .status(500)
      .json({ message: "Server error while fetching featured events" });
  }
});

router.get("/meta/categories", async (req, res) => {
  try {
    const categories = await Event.findAll({
      where: {
        status: "published",
        eventDate: { [Op.gte]: new Date() },
      },
      attributes: [
        "category",
        [sequelize.fn("COUNT", sequelize.col("category")), "count"],
      ],
      group: ["category"],
      raw: true,
    });

    res.json({ categories });
  } catch (error) {
    console.error("Get categories error (reordered):", error);
    res.status(500).json({ message: "Server error while fetching categories" });
  }
});

// @route   GET /api/events
// @desc    Get all public events
// @access  Public
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      status = "published",
      search,
      upcoming = true,
      organizer,
      from,
      to,
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { status };

    // Filter by type
    if (type && type !== "all") {
      where.type = type;
    }

    // Filter by category
    if (category && category !== "all") {
      where.category = category;
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { organizer: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter by organizer
    if (organizer) {
      where.organizer = organizer;
    }

    // Date range filtering: if from/to provided, use them; otherwise if upcoming is true, filter for future
    if (from || to) {
      const dateWhere = {};
      if (from) dateWhere[Op.gte] = new Date(from);
      if (to) dateWhere[Op.lte] = new Date(to);
      where.eventDate = dateWhere;
    } else if (upcoming === "true") {
      where.eventDate = { [Op.gte]: new Date() };
    }

    const events = await Event.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["eventDate", "ASC"]],
      include: [
        {
          model: Seat,
          as: "seats",
          attributes: ["id", "section", "isReserved", "isVip"],
          required: false,
        },
      ],
    });

    // Calculate available seats for each event
    const eventsWithAvailability = events.rows.map((event) => {
      const totalSeats = event.seats?.length || 0;
      const reservedSeats =
        event.seats?.filter((seat) => seat.isReserved).length || 0;
      const availableSeats = totalSeats - reservedSeats;

      return {
        ...event.toJSON(),
        posterImageUrl: buildPosterUrl(event.posterImage),
        totalSeats,
        reservedSeats,
        availableSeats,
        isAvailable: availableSeats > 0,
        seats: undefined, // Remove seat details from list view
      };
    });

    res.json({
      events: eventsWithAvailability,
      totalPages: Math.ceil(events.count / limit),
      currentPage: parseInt(page),
      totalEvents: events.count,
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ message: "Server error while fetching events" });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: Seat,
          as: "seats",
          attributes: [
            "id",
            "section",
            "row",
            "number",
            "isReserved",
            "isVip",
            "isAccessible",
            "status",
          ],
          order: [
            ["section", "ASC"],
            ["row", "ASC"],
            ["number", "ASC"],
          ],
        },
        {
          model: Reservation,
          as: "reservations",
          attributes: ["id", "status", "seatId"],
          where: { status: { [Op.in]: ["pending", "confirmed"] } },
          required: false,
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event is published or user has admin/staff access
    if (
      event.status !== "published" &&
      (!req.user || !["admin", "staff"].includes(req.user.role))
    ) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Group seats by section
    const seatMap = {
      orchestra: [],
      balcony: [],
      lodge_left: [],
      lodge_right: [],
      vip: [],
    };

    event.seats?.forEach((seat) => {
      if (seatMap[seat.section]) {
        seatMap[seat.section].push(seat);
      }
    });

    // Calculate availability statistics
    const totalSeats = event.seats?.length || 0;
    const reservedSeats =
      event.seats?.filter((seat) => seat.isReserved || seat.status === "sold")
        .length || 0;
    const availableSeats = totalSeats - reservedSeats;
    const vipSeats = event.seats?.filter((seat) => seat.isVip).length || 0;

    res.json({
      ...event.toJSON(),
      posterImageUrl: buildPosterUrl(event.posterImage),
      // Hide VIP block from public seat map per requirement
      seatMap: { ...seatMap, vip: [] },
      statistics: {
        totalSeats,
        reservedSeats,
        availableSeats,
        vipSeats,
        isAvailable: availableSeats > 0,
        isSoldOut: availableSeats === 0,
      },
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({ message: "Server error while fetching event" });
  }
});

// @route   GET /api/events/:id/seats
// @desc    Get seats for a specific event
// @access  Public
router.get("/:id/seats", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      attributes: ["id", "title", "status"],
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.status !== "published") {
      return res
        .status(400)
        .json({ message: "Event is not available for booking" });
    }

    const seats = await Seat.findAll({
      where: { eventId: req.params.id },
      attributes: [
        "id",
        "section",
        "row",
        "number",
        "isReserved",
        "isVip",
        "isAccessible",
        "status",
        "holdExpiry",
      ],
      order: [
        ["section", "ASC"],
        ["row", "ASC"],
        ["number", "ASC"],
      ],
    });

    // Update expired holds
    const expiredSeats = seats.filter(
      (seat) =>
        seat.holdExpiry &&
        seat.holdExpiry < new Date() &&
        seat.status === "reserved"
    );

    if (expiredSeats.length > 0) {
      await Seat.update(
        {
          status: "available",
          isReserved: false,
          holdExpiry: null,
        },
        {
          where: {
            id: { [Op.in]: expiredSeats.map((seat) => seat.id) },
          },
        }
      );

      // Refresh seat data
      const updatedSeats = await Seat.findAll({
        where: { eventId: req.params.id },
        attributes: [
          "id",
          "section",
          "row",
          "number",
          "isReserved",
          "isVip",
          "isAccessible",
          "status",
          "holdExpiry",
        ],
        order: [
          ["section", "ASC"],
          ["row", "ASC"],
          ["number", "ASC"],
        ],
      });

      return res.json({ seats: updatedSeats });
    }

    res.json({ seats });
  } catch (error) {
    console.error("Get seats error:", error);
    res.status(500).json({ message: "Server error while fetching seats" });
  }
});

module.exports = router;
