const express = require("express");
const { body, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { Event, Seat, Reservation, User } = require("../models");
const { auth, authorize } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const { sequelize } = require("../config/database");
const {
  sendTicketEmail,
  sendNotificationEmail,
} = require("../utils/emailService");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
// Ensure all admin routes authenticate the user first
router.use(auth);

// Storage for poster uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/posters"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, `poster_${uniqueSuffix}`);
  },
});
const upload = multer({ storage });

// Venue capacities mapping
const VENUE_CAPACITY = {
  grand: 1196,
  auditorium: 300,
  mmr: 100,
  room: 50,
};

function getVenueCapacity(venue) {
  if (!venue) return VENUE_CAPACITY.grand;
  const v = String(venue).toLowerCase();
  if (v.includes("grand")) return VENUE_CAPACITY.grand;
  if (v.includes("auditorium")) return VENUE_CAPACITY.auditorium;
  if (v.includes("multi") || v.includes("mmr")) return VENUE_CAPACITY.mmr;
  if (v.includes("room")) return VENUE_CAPACITY.room;
  return VENUE_CAPACITY.grand;
}

function clamp(n, min, max) {
  const x = parseInt(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

// Simple in-memory job tracking for async bulk operations
const bulkJobs = new Map();

async function processWithConcurrency(items, handler, concurrency = 5) {
  let index = 0;
  let active = 0;
  let resolved = 0;
  const results = new Array(items.length);
  return await new Promise((resolve) => {
    const next = () => {
      if (resolved === items.length) return resolve(results);
      while (active < concurrency && index < items.length) {
        const i = index++;
        active++;
        Promise.resolve()
          .then(() => handler(items[i], i))
          .then((r) => {
            results[i] = { ok: true, value: r };
          })
          .catch((e) => {
            results[i] = { ok: false, error: e?.message || String(e) };
          })
          .finally(() => {
            active--;
            resolved++;
            setImmediate(next);
          });
      }
    };
    next();
  });
}

// ========== DASHBOARD ==========
// GET /api/admin/dashboard
router.get("/dashboard", authorize("admin"), async (req, res) => {
  try {
    const now = new Date();

    // Aggregate counts (flat shape expected by frontend)
    const [totalUsers, totalEvents, activeEvents] = await Promise.all([
      User.count(),
      Event.count(),
      Event.count({
        where: { status: "published", eventDate: { [Op.gte]: now } },
      }),
    ]);

    const recentReservations = await Reservation.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        { model: User, as: "user", attributes: ["id", "name", "email"] },
        {
          model: Event,
          as: "event",
          attributes: ["id", "title", "eventDate", "venue"],
        },
        {
          model: Seat,
          as: "seat",
          attributes: ["section", "row", "number", "isVip"],
        },
      ],
    });

    const upcomingEvents = await Event.findAll({
      where: { eventDate: { [Op.gte]: now } },
      order: [["eventDate", "ASC"]],
      limit: 5,
    });

    return res.json({
      statistics: { totalEvents, activeEvents, totalUsers },
      recentReservations,
      upcomingEvents,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res
      .status(500)
      .json({ message: "Server error while loading dashboard" });
  }
});

// ========== EVENTS ==========

// Per-event analytics
// GET /api/admin/events/analytics?range=all|upcoming|past&limit=50
router.get("/events/analytics", authorize("admin"), async (req, res) => {
  try {
    const now = new Date();
    const range = (req.query.range || "all").toString();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const where = {};
    if (range === "upcoming") where.eventDate = { [Op.gte]: now };
    if (range === "past") where.eventDate = { [Op.lt]: now };

    const events = await Event.findAll({
      where,
      order: [["eventDate", "ASC"]],
      limit,
    });

    const analytics = await Promise.all(
      events.map(async (ev) => {
        const [
          totalRes,
          pendingRes,
          confirmedRes,
          cancelledRes,
          soldSeats,
          availableSeats,
        ] = await Promise.all([
          Reservation.count({ where: { eventId: ev.id } }),
          Reservation.count({ where: { eventId: ev.id, status: "pending" } }),
          Reservation.count({ where: { eventId: ev.id, status: "confirmed" } }),
          Reservation.count({ where: { eventId: ev.id, status: "cancelled" } }),
          Seat.count({ where: { eventId: ev.id, status: "sold" } }),
          Seat.count({
            where: { eventId: ev.id, status: "available", isReserved: false },
          }),
        ]);

        const totalSeats = ev.maxSeats || 0;
        const occupancy =
          totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;
        const confirmationRate =
          totalRes > 0 ? Math.round((confirmedRes / totalRes) * 100) : 0;
        const daysUntil = Math.ceil(
          (new Date(ev.eventDate) - now) / (1000 * 60 * 60 * 24)
        );

        return {
          id: ev.id,
          title: ev.title,
          eventDate: ev.eventDate,
          venue: ev.venue,
          status: ev.status,
          totalSeats,
          soldSeats,
          availableSeats,
          reservations: {
            total: totalRes,
            pending: pendingRes,
            confirmed: confirmedRes,
            cancelled: cancelledRes,
          },
          occupancy, // % of seats sold
          confirmationRate, // % of reservations confirmed
          daysUntil,
        };
      })
    );

    return res.json({ analytics });
  } catch (error) {
    console.error("Events analytics error:", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching analytics" });
  }
});

// Per-event confirmation trends (daily counts)
// GET /api/admin/events/trends?rangeDays=14&range=upcoming|all|past&limit=10&eventIds=1,2
router.get("/events/trends", authorize("admin"), async (req, res) => {
  try {
    const rangeDays = Math.min(
      Math.max(parseInt(req.query.rangeDays) || 14, 3),
      60
    );
    const range = (req.query.range || "upcoming").toString();
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const idsParam = (req.query.eventIds || "").toString();
    const now = new Date();
    const start = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    let events;
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      events = await Event.findAll({
        where: { id: { [Op.in]: ids } },
        order: [["eventDate", "ASC"]],
      });
    } else {
      const where = {};
      if (range === "upcoming") where.eventDate = { [Op.gte]: now };
      if (range === "past") where.eventDate = { [Op.lt]: now };
      events = await Event.findAll({
        where,
        order: [["eventDate", "ASC"]],
        limit,
      });
    }

    // Build continuous day labels
    const labels = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      labels.push(d.toISOString().slice(0, 10));
    }

    // Helper to map rows to series aligned with labels
    const toSeries = (rows) => {
      const map = new Map();
      for (const r of rows) {
        const key = String(r.d);
        map.set(key, Number(r.count) || 0);
      }
      return labels.map((day) => map.get(day) || 0);
    };

    const trends = [];
    for (const ev of events) {
      // Aggregate confirmed reservations per day
      const rows = await Reservation.findAll({
        where: {
          eventId: ev.id,
          status: "confirmed",
          createdAt: { [Op.gte]: start },
        },
        attributes: [
          [sequelize.literal("DATE(Reservation.created_at)"), "d"],
          [sequelize.literal("COUNT(*)"), "count"],
        ],
        group: [sequelize.literal("DATE(Reservation.created_at)")],
        order: [[sequelize.literal("d"), "ASC"]],
        raw: true,
      });

      const series = toSeries(rows);
      const last7 = series.slice(-7).reduce((a, b) => a + b, 0);
      const prev7 = series.slice(-14, -7).reduce((a, b) => a + b, 0);
      const changePct =
        prev7 === 0
          ? last7 > 0
            ? 100
            : 0
          : Math.round(((last7 - prev7) / prev7) * 100);

      trends.push({
        id: ev.id,
        title: ev.title,
        eventDate: ev.eventDate,
        venue: ev.venue,
        labels,
        series,
        last7,
        prev7,
        changePct,
      });
    }

    return res.json({ rangeDays, labels, trends });
  } catch (error) {
    console.error("Events trends error:", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching trends" });
  }
});

// Create event
router.post(
  "/events",
  authorize("admin"),
  upload.single("posterImage"),
  [
    body("title").isLength({ min: 3 }).withMessage("Title is required"),
    body("eventDate").isISO8601().withMessage("Valid event date is required"),
  ],
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        description = "",
        type = "performance",
        category = "general",
        eventDate,
        endDate = null,
        venue = "Grand Theater",
        isPaid = false,
        basePrice = 0,
        vipPrice = 0,
        maxSeats = 100,
        organizer = "CCIS",
        requiresApproval = false,
      } = req.body;

      // VIP handling via metadata
      const vipCount = clamp(req.body.vipCount || 0, 0, 100000);
      const venueCap = getVenueCapacity(venue);
      const coreRequested = clamp(maxSeats, 1, venueCap);
      const derivedMaxSeats = clamp(coreRequested + vipCount, 1, venueCap);

      const event = await Event.create(
        {
          title,
          description,
          type,
          category,
          eventDate,
          endDate,
          venue,
          isPaid,
          basePrice,
          vipPrice,
          maxSeats: derivedMaxSeats,
          availableSeats: derivedMaxSeats,
          organizer,
          requiresApproval,
          status: requiresApproval ? "draft" : "published",
          metadata: { ...(req.body.metadata || {}), vipCount },
          ...(req.file
            ? { posterImage: `/uploads/posters/${req.file.filename}` }
            : {}),
        },
        { transaction: t }
      );

      await generateSeatsForEvent(
        event.id,
        event.maxSeats,
        basePrice,
        vipPrice,
        t,
        vipCount,
        venue
      );

      await t.commit();
      res.status(201).json({
        message: `Event created successfully${
          requiresApproval ? " (pending approval)" : " and published"
        }`,
        event,
      });
    } catch (error) {
      await t.rollback();
      console.error("Create event error:", error);
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          message:
            "Seat generation conflict. Please retry. (Possible duplicate generation attempt)",
          details: error.errors?.map((e) => e.message) || [],
        });
      }
      res.status(500).json({ message: "Server error while creating event" });
    }
  }
);

// List events (admin)
router.get("/events", async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== "all") where.status = status;
    if (type && type !== "all") where.type = type;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { organizer: { [Op.like]: `%${search}%` } },
      ];
    }

    const events = await Event.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Reservation,
          as: "reservations",
          attributes: ["id", "status"],
          required: false,
        },
      ],
    });

    const eventsWithStats = events.rows.map((event) => {
      const reservations = event.reservations || [];
      const confirmedReservations = reservations.filter(
        (r) => r.status === "confirmed"
      ).length;
      const pendingReservations = reservations.filter(
        (r) => r.status === "pending"
      ).length;

      return {
        ...event.toJSON(),
        statistics: {
          totalReservations: reservations.length,
          confirmedReservations,
          pendingReservations,
          availableSeats: event.maxSeats - confirmedReservations,
        },
        reservations: undefined,
      };
    });

    res.json({
      events: eventsWithStats,
      totalPages: Math.ceil(events.count / limit),
      currentPage: parseInt(page),
      totalEvents: events.count,
    });
  } catch (error) {
    console.error("Get admin events error:", error);
    res.status(500).json({ message: "Server error while fetching events" });
  }
});

// Update event
router.put(
  "/events/:id",
  authorize("admin"),
  upload.single("posterImage"),
  [
    body("title")
      .optional()
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters"),
    body("eventDate")
      .optional()
      .isISO8601()
      .withMessage("Valid event date is required"),
    body("endDate").optional().isISO8601().withMessage("Invalid end date"),
    body("description")
      .optional()
      .isLength({ min: 10 })
      .withMessage("Description must be at least 10 characters"),
  ],
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({ errors: errors.array() });
      }

      const event = await Event.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!event) {
        await t.rollback();
        return res.status(404).json({ message: "Event not found" });
      }

      const allowedUpdates = [
        "title",
        "description",
        "type",
        "category",
        "eventDate",
        "endDate",
        "venue",
        "isPaid",
        "basePrice",
        "vipPrice",
        "maxSeats",
        "organizer",
        "status",
      ];

      const updates = {};
      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      if (req.file) {
        updates.posterImage = `/uploads/posters/${req.file.filename}`;
      }

      // Handle VIP count updates via metadata and derive max seats
      let vipCount = (event.metadata && event.metadata.vipCount) || 0;
      if (req.body.vipCount !== undefined) {
        const parsed = parseInt(req.body.vipCount);
        vipCount = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
      }

      const venueForEvent = updates.venue || event.venue;
      const venueCap = getVenueCapacity(venueForEvent);
      const requestedCore = updates.maxSeats
        ? clamp(updates.maxSeats, 1, venueCap)
        : clamp(event.maxSeats - vipCount, 1, venueCap);
      const derivedMaxSeats = clamp(requestedCore + vipCount, 1, venueCap);
      const originalMax = event.maxSeats;
      const finalMax = derivedMaxSeats;
      const willRegenerate =
        req.body.regenerateSeats === true ||
        req.body.regenerateSeats === "true" ||
        finalMax !== originalMax ||
        req.body.vipCount !== undefined;

      await event.update(
        {
          ...updates,
          maxSeats: finalMax,
          metadata: { ...(event.metadata || {}), vipCount },
          ...(req.file
            ? { posterImage: `/uploads/posters/${req.file.filename}` }
            : {}),
        },
        { transaction: t }
      );

      if (willRegenerate) {
        if (new Date(event.eventDate) < new Date()) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: "Cannot regenerate seats for past events" });
        }
        const existingReservations = await Reservation.count({
          where: { eventId: event.id },
          transaction: t,
        });
        const force = req.body.force === true || req.body.force === "true";
        if (existingReservations > 0 && !force) {
          await t.rollback();
          return res.status(409).json({
            message:
              "Event has reservations. Pass force=true to regenerate seats.",
            existingReservations,
          });
        }

        await generateSeatsForEvent(
          event.id,
          event.maxSeats,
          event.basePrice,
          event.vipPrice,
          t,
          vipCount,
          venueForEvent
        );
      }

      await t.commit();
      return res.json({
        message: willRegenerate
          ? "Event updated and seats regenerated"
          : "Event updated successfully",
        event,
      });
    } catch (error) {
      await t.rollback();
      console.error("Update event error:", error);
      return res
        .status(500)
        .json({ message: "Server error while updating event" });
    }
  }
);

// Regenerate seats
router.post(
  "/events/:id/regenerate-seats",
  authorize("admin"),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { maxSeats: newMaxSeats, force = false } = req.body || {};
      const event = await Event.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!event) {
        await t.rollback();
        return res.status(404).json({ message: "Event not found" });
      }

      if (new Date(event.eventDate) < new Date()) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: "Cannot regenerate seats for past events" });
      }

      const existingReservations = await Reservation.count({
        where: { eventId: event.id },
        transaction: t,
      });
      if (existingReservations > 0 && !force) {
        await t.rollback();
        return res.status(409).json({
          message:
            "Event has reservations. Pass force=true to proceed (this will invalidate seat references).",
          existingReservations,
        });
      }

      if (newMaxSeats) {
        if (
          Number.isNaN(parseInt(newMaxSeats)) ||
          parseInt(newMaxSeats) < 1 ||
          parseInt(newMaxSeats) > 2500
        ) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: "maxSeats must be between 1 and 2500" });
        }
        const venueCap = getVenueCapacity(event.venue);
        await event.update(
          { maxSeats: clamp(newMaxSeats, 1, venueCap) },
          { transaction: t }
        );
      }

      const vipCount =
        req.body.vipCount !== undefined
          ? parseInt(req.body.vipCount) || 0
          : (event.metadata && event.metadata.vipCount) || 0;

      await generateSeatsForEvent(
        event.id,
        event.maxSeats,
        event.basePrice,
        event.vipPrice,
        t,
        vipCount,
        event.venue
      );

      await t.commit();
      return res.json({
        message: "Seats regenerated",
        eventId: event.id,
        maxSeats: event.maxSeats,
      });
    } catch (error) {
      await t.rollback();
      console.error("Regenerate seats error:", error);
      res
        .status(500)
        .json({ message: "Server error while regenerating seats" });
    }
  }
);

// Delete event
router.delete("/events/:id", authorize("admin"), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const reservationCount = await Reservation.count({
      where: { eventId: req.params.id },
    });

    if (reservationCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete event with existing reservations. Archive it instead.",
      });
    }

    await event.destroy();
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: "Server error while deleting event" });
  }
});

// Publish event
router.put(
  "/events/:id/publish",
  authorize("admin"),
  upload.single("posterImage"),
  [
    body("description")
      .optional()
      .isLength({ min: 10 })
      .withMessage("Description must be at least 10 characters"),
    body("endDate").optional().isISO8601().withMessage("Invalid end date"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.status !== "draft") {
        return res
          .status(400)
          .json({ message: "Only draft events can be published" });
      }
      if (new Date(event.eventDate) < new Date()) {
        return res
          .status(400)
          .json({ message: "Cannot publish an event in the past" });
      }
      const updates = { status: "published" };
      if (req.body.description) updates.description = req.body.description;
      if (req.body.endDate) updates.endDate = req.body.endDate;
      if (req.file)
        updates.posterImage = `/uploads/posters/${req.file.filename}`;
      await event.update(updates);
      return res.json({ message: "Event published successfully", event });
    } catch (error) {
      console.error("Publish event error (enhanced):", error);
      res.status(500).json({ message: "Server error while publishing event" });
    }
  }
);

// ========== USERS ==========

router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role && role !== "all") where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { studentId: { [Op.like]: `%${search}%` } },
      ];
    }

    const users = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Reservation,
          as: "reservations",
          attributes: ["id", "status"],
          required: false,
        },
      ],
    });

    const usersWithStats = users.rows.map((user) => {
      const reservations = user.reservations || [];
      return {
        ...user.toJSON(),
        totalReservations: reservations.length,
        confirmedReservations: reservations.filter(
          (r) => r.status === "confirmed"
        ).length,
        reservations: undefined,
      };
    });

    res.json({
      users: usersWithStats,
      totalPages: Math.ceil(users.count / limit),
      currentPage: parseInt(page),
      totalUsers: users.count,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

router.put("/users/:id/status", authorize("admin"), async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ isActive });

    res.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res
      .status(500)
      .json({ message: "Server error while updating user status" });
  }
});

// ========== RESERVATIONS ==========

router.get("/reservations", async (req, res) => {
  try {
    const { page = 1, limit = 10, status, eventId } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== "all") where.status = status;
    if (eventId) where.eventId = eventId;

    const reservations = await Reservation.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email", "studentId"],
        },
        {
          model: Event,
          as: "event",
          attributes: ["title", "eventDate", "venue"],
        },
        {
          model: Seat,
          as: "seat",
          attributes: ["section", "row", "number", "isVip"],
        },
      ],
    });

    res.json({
      reservations: reservations.rows,
      totalPages: Math.ceil(reservations.count / limit),
      currentPage: parseInt(page),
      totalReservations: reservations.count,
    });
  } catch (error) {
    console.error("Get admin reservations error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching reservations" });
  }
});

router.put("/reservations/bulk-approve", async (req, res) => {
  const { eventId, limit = 1000 } = req.body || {};
  if (!eventId) return res.status(400).json({ message: "eventId is required" });
  try {
    const pending = await Reservation.findAll({
      where: { eventId, status: "pending" },
      order: [["createdAt", "ASC"]],
      limit: Math.min(parseInt(limit) || 1000, 2000),
      include: [
        { model: Event, as: "event" },
        { model: Seat, as: "seat" },
        { model: User, as: "user", attributes: ["id", "name", "email"] },
      ],
    });

    let success = 0;
    for (const r of pending) {
      const t = await sequelize.transaction();
      try {
        if (new Date(r.event.eventDate) < new Date()) {
          await t.rollback();
          continue;
        }
        await r.update(
          {
            status: "confirmed",
            paymentStatus:
              parseFloat(r.totalAmount || 0) > 0 ? r.paymentStatus : "paid",
          },
          { transaction: t }
        );
        await r.seat.update(
          { status: "sold", isReserved: true, holdExpiry: null },
          { transaction: t }
        );
        await t.commit();
        success += 1;

        if (!r.emailSent) {
          try {
            if (!r.qrCode) {
              try {
                const QRCode = require("qrcode");
                const qrData = {
                  reservationId: r.id,
                  reservationCode: r.reservationCode,
                  eventId: r.event.id,
                  seatInfo: `${r.seat.section.toUpperCase()}-${r.seat.row}${
                    r.seat.number
                  }`,
                  userName: r.user.name,
                  eventTitle: r.event.title,
                };
                const qrCodeDataURL = await QRCode.toDataURL(
                  JSON.stringify(qrData)
                );
                await r.update({ qrCode: qrCodeDataURL });
              } catch (e) {
                console.warn(
                  "[Bulk Approve] QR regeneration failed for",
                  r.id,
                  e.message
                );
              }
            }
            await sendTicketEmail({
              to: r.user.email,
              userName: r.user.name,
              reservation: r,
              event: r.event,
              seat: r.seat,
              qrCode: r.qrCode,
            });
            await r.update({ emailSent: true });
          } catch (err) {
            console.warn("[Bulk Approve] email failed for", r.id, err.message);
          }
        }
      } catch (e) {
        await t.rollback();
        console.error("Bulk approve item failed:", e.message);
      }
    }

    return res.json({
      message: `Approved ${success} reservation(s)`,
      approved: success,
      attempted: pending.length,
    });
  } catch (error) {
    console.error("Bulk approve error:", error);
    res.status(500).json({ message: "Server error during bulk approve" });
  }
});

// Approve single reservation
router.put("/reservations/:id/approve", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: Event, as: "event" },
        { model: Seat, as: "seat" },
        { model: User, as: "user", attributes: ["id", "name", "email"] },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.status !== "pending") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Only pending reservations can be approved" });
    }
    if (new Date(reservation.event.eventDate) < new Date()) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Cannot approve reservation for past event" });
    }

    await reservation.update(
      {
        status: "confirmed",
        paymentStatus:
          reservation.totalAmount > 0 ? reservation.paymentStatus : "paid",
      },
      { transaction: t }
    );
    await reservation.seat.update(
      { status: "sold", isReserved: true, holdExpiry: null },
      { transaction: t }
    );

    await t.commit();

    if (!reservation.emailSent) {
      try {
        await sendTicketEmail({
          to: reservation.user.email,
          userName: reservation.user.name,
          reservation,
          event: reservation.event,
          seat: reservation.seat,
          qrCode: reservation.qrCode,
        });
        await reservation.update({ emailSent: true });
      } catch (emailErr) {
        console.error("Approve reservation email error:", emailErr.message);
      }
    }

    return res.json({ message: "Reservation approved", reservation });
  } catch (error) {
    await t.rollback();
    console.error("Approve reservation error:", error);
    res
      .status(500)
      .json({ message: "Server error while approving reservation" });
  }
});

// Reject reservation
router.put("/reservations/:id/reject", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: Seat, as: "seat" },
        { model: Event, as: "event" },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.status !== "pending") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Only pending reservations can be rejected" });
    }

    await reservation.update(
      {
        status: "cancelled",
        paymentStatus:
          reservation.paymentStatus === "paid"
            ? "refunded"
            : reservation.paymentStatus,
      },
      { transaction: t }
    );
    await reservation.seat.update(
      { status: "available", isReserved: false, holdExpiry: null },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      message: "Reservation rejected",
      reservation: { id: reservation.id, status: reservation.status },
    });
  } catch (error) {
    await t.rollback();
    console.error("Reject reservation error:", error);
    res
      .status(500)
      .json({ message: "Server error while rejecting reservation" });
  }
});

// ========== BULK MANDATORY INVITE ==========

router.post(
  "/events/:id/mandatory-invite",
  authorize("admin"),
  async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (new Date(event.eventDate) < new Date())
        return res
          .status(400)
          .json({ message: "Cannot invite for past event" });

      let {
        emails = [],
        message = "",
        sendTickets = false,
        limit = 1000,
        background = true,
        concurrency = 5,
      } = req.body || {};
      if (!Array.isArray(emails)) emails = [];
      limit = Math.min(parseInt(limit) || 1000, 2000);
      concurrency = clamp(concurrency, 1, 10);

      // Fallback to active students if no explicit list provided
      if (emails.length === 0) {
        const students = await User.findAll({
          where: { role: { [Op.in]: ["student", "user"] }, isActive: true },
          limit,
        });
        emails = students.map((u) => u.email);
      } else if (emails.length > limit) {
        emails = emails.slice(0, limit);
      }

      // Cap by available seats when issuing tickets
      if (sendTickets) {
        const available = await Seat.count({
          where: { eventId: event.id, status: "available", isReserved: false },
        });
        if (available <= 0) {
          return res
            .status(400)
            .json({ message: "No available seats left for this event" });
        }
        if (emails.length > available) emails = emails.slice(0, available);
      }

      const jobId = uuidv4();
      const job = {
        id: jobId,
        eventId: event.id,
        total: emails.length,
        notified: 0,
        ticketed: 0,
        failed: 0,
        status: "queued",
        errors: [],
      };
      bulkJobs.set(jobId, job);

      const work = async () => {
        job.status = "running";
        try {
          await processWithConcurrency(
            emails,
            async (email) => {
              try {
                // Ensure user exists
                let user = await User.findOne({ where: { email } });
                if (!user) {
                  user = await User.create({
                    name: email.split("@")[0],
                    email,
                    password: Math.random().toString(36).slice(2, 10),
                    role: "student",
                    isActive: true,
                  });
                }

                // Send notification (best-effort)
                try {
                  await sendNotificationEmail({
                    to: email,
                    subject: `Mandatory Attendance: ${event.title}`,
                    message:
                      message ||
                      `You are required to attend ${new Date(
                        event.eventDate
                      ).toLocaleString()}.`,
                    userName: user.name,
                  });
                  job.notified += 1;
                } catch (e) {
                  job.errors.push({
                    email,
                    stage: "notify",
                    error: e?.message || String(e),
                  });
                }

                if (!sendTickets) return;

                // Allocate a seat and issue ticket within a transaction
                const t = await sequelize.transaction();
                try {
                  const seat = await Seat.findOne({
                    where: {
                      eventId: event.id,
                      status: "available",
                      isReserved: false,
                    },
                    order: [
                      ["section", "ASC"],
                      ["row", "ASC"],
                      ["number", "ASC"],
                    ],
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                  });
                  if (!seat) {
                    await t.rollback();
                    job.errors.push({
                      email,
                      stage: "allocate",
                      error: "No seats left",
                    });
                    return;
                  }

                  const reservation = await Reservation.create(
                    {
                      userId: user.id,
                      eventId: event.id,
                      seatId: seat.id,
                      status: "confirmed",
                      totalAmount: 0,
                      paymentStatus: "paid",
                    },
                    { transaction: t }
                  );
                  await seat.update(
                    { status: "sold", isReserved: true, holdExpiry: null },
                    { transaction: t }
                  );
                  await t.commit();
                  job.ticketed += 1;

                  try {
                    if (!reservation.qrCode) {
                      const QRCode = require("qrcode");
                      const qrData = {
                        reservationId: reservation.id,
                        reservationCode: reservation.reservationCode,
                        eventId: event.id,
                        seatInfo: `${seat.section.toUpperCase()}-${seat.row}${
                          seat.number
                        }`,
                        userName: user.name,
                        eventTitle: event.title,
                      };
                      const qrCodeDataURL = await QRCode.toDataURL(
                        JSON.stringify(qrData)
                      );
                      await reservation.update({ qrCode: qrCodeDataURL });
                    }
                    await sendTicketEmail({
                      to: email,
                      userName: user.name,
                      reservation,
                      event,
                      seat,
                      qrCode: reservation.qrCode,
                    });
                    await reservation.update({ emailSent: true });
                  } catch (e) {
                    job.errors.push({
                      email,
                      stage: "email",
                      error: e?.message || String(e),
                    });
                  }
                } catch (e) {
                  try {
                    await t.rollback();
                  } catch {}
                  job.errors.push({
                    email,
                    stage: "tx",
                    error: e?.message || String(e),
                  });
                }
              } catch (outer) {
                job.errors.push({
                  email,
                  stage: "outer",
                  error: outer?.message || String(outer),
                });
              }
            },
            concurrency
          );

          await event.update({
            metadata: { ...(event.metadata || {}), mandatory: true },
          });
          job.status = "completed";
        } catch (e) {
          job.status = "failed";
          job.errors.push({ stage: "job", error: e?.message || String(e) });
        }
      };

      if (background) {
        setImmediate(work);
        return res.json({
          message: "Bulk invite started",
          jobId,
          total: job.total,
        });
      } else {
        await work();
        return res.json({
          message:
            `Invited ${job.notified} user(s)` +
            (sendTickets ? `, issued ${job.ticketed} ticket(s)` : ""),
          ...job,
        });
      }
    } catch (error) {
      console.error("Mandatory invite error:", error);
      return res
        .status(500)
        .json({ message: "Server error during mandatory invites" });
    }
  }
);

router.get("/bulk-jobs/:id", authorize("admin"), async (req, res) => {
  const job = bulkJobs.get(req.params.id);
  if (!job) return res.status(404).json({ message: "Job not found" });
  return res.json(job);
});

// ========== SEAT GENERATION ==========

async function generateSeatsForEvent(
  eventId,
  maxSeats,
  basePrice,
  vipPrice,
  transaction,
  vipCount = 0,
  venue
) {
  await Seat.destroy({ where: { eventId }, force: true, transaction });

  const venueCap = getVenueCapacity(venue);
  const total = clamp(maxSeats, 1, venueCap);
  const vipTotal = clamp(vipCount, 0, total);
  const coreTotal = total - vipTotal;

  const sections = (() => {
    if (venueCap >= 1000) {
      return [
        { name: "orchestra", weight: 0.5 },
        { name: "balcony", weight: 0.35 },
        { name: "lodge_left", weight: 0.075 },
        { name: "lodge_right", weight: 0.075 },
      ];
    }
    if (venueCap >= 300) {
      return [
        { name: "orchestra", weight: 0.7 },
        { name: "balcony", weight: 0.3 },
      ];
    }
    return [{ name: "orchestra", weight: 1.0 }];
  })();

  let allocated = 0;
  const seatDefs = [];
  sections.forEach((s, idx) => {
    let count = Math.floor(coreTotal * s.weight);
    if (idx === sections.length - 1) count = coreTotal - allocated;
    allocated += count;
    seatDefs.push({ name: s.name, total: count, isVip: false });
  });
  if (vipTotal > 0)
    seatDefs.push({ name: "vip", total: vipTotal, isVip: true });

  const perRow = venueCap >= 1000 ? 40 : venueCap >= 300 ? 24 : 16;
  const records = [];
  for (const def of seatDefs) {
    let remaining = def.total;
    let rowIdx = 0;
    while (remaining > 0) {
      rowIdx += 1;
      const rowLetter = String.fromCharCode(64 + ((rowIdx - 1) % 26) + 1);
      const count = Math.min(perRow, remaining);
      for (let n = 1; n <= count; n++) {
        records.push({
          eventId,
          section: def.name,
          row: rowLetter,
          number: n,
          isVip: def.isVip,
          price: def.isVip ? vipPrice : basePrice,
          status: "available",
          isReserved: false,
        });
      }
      remaining -= count;
    }
  }

  if (records.length > total) records.length = total;
  await Seat.bulkCreate(records, { validate: true, transaction });
}

module.exports = router;

// @route   PUT /api/admin/events/:id
// @desc    Update an event
// @access  Admin
router.put(
  "/events/:id",
  authorize("admin"),
  // Add file upload handling for poster change
  upload.single("posterImage"),
  [
    body("title")
      .optional()
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters"),
    body("eventDate")
      .optional()
      .isISO8601()
      .withMessage("Valid event date is required"),
    body("endDate").optional().isISO8601().withMessage("Invalid end date"),
    body("description")
      .optional()
      .isLength({ min: 10 })
      .withMessage("Description must be at least 10 characters"),
  ],
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({ errors: errors.array() });
      }

      const event = await Event.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!event) {
        await t.rollback();
        return res.status(404).json({ message: "Event not found" });
      }

      const allowedUpdates = [
        "title",
        "description",
        "type",
        "category",
        "eventDate",
        "endDate",
        "venue",
        "isPaid",
        "basePrice",
        "vipPrice",
        "maxSeats",
        "organizer",
        "status",
      ];

      const updates = {};
      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      if (req.file) {
        updates.posterImage = `/uploads/posters/${req.file.filename}`;
      }

      // Handle VIP count updates via metadata and derive max seats
      let vipCount = (event.metadata && event.metadata.vipCount) || 0;
      if (req.body.vipCount !== undefined) {
        const parsed = parseInt(req.body.vipCount);
        vipCount = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
      }

      const venueForEvent = updates.venue || event.venue;
      const venueCap = getVenueCapacity(venueForEvent);
      const requestedCore = updates.maxSeats
        ? clamp(updates.maxSeats, 1, venueCap)
        : clamp(event.maxSeats - vipCount, 1, venueCap); // core (non-VIP) portion best-effort
      const derivedMaxSeats = clamp(requestedCore + vipCount, 1, venueCap);
      const originalMax = event.maxSeats;
      const finalMax = derivedMaxSeats;
      const willRegenerate =
        req.body.regenerateSeats === true ||
        req.body.regenerateSeats === "true" ||
        finalMax !== originalMax ||
        req.body.vipCount !== undefined;

      // Apply updates (including poster) first
      await event.update(
        {
          ...updates,
          maxSeats: finalMax,
          metadata: { ...(event.metadata || {}), vipCount },
          ...(req.file
            ? { posterImage: `/uploads/posters/${req.file.filename}` }
            : {}),
        },
        { transaction: t }
      );

      if (willRegenerate) {
        // Safety checks
        if (new Date(event.eventDate) < new Date()) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: "Cannot regenerate seats for past events" });
        }
        const existingReservations = await Reservation.count({
          where: { eventId: event.id },
          transaction: t,
        });
        const force = req.body.force === true || req.body.force === "true";
        if (existingReservations > 0 && !force) {
          await t.rollback();
          return res.status(409).json({
            message:
              "Event has reservations. Pass force=true to regenerate seats.",
            existingReservations,
          });
        }

        await generateSeatsForEvent(
          event.id,
          event.maxSeats,
          event.basePrice,
          event.vipPrice,
          t,
          vipCount,
          venueForEvent
        );
      }

      await t.commit();
      return res.json({
        message: willRegenerate
          ? "Event updated and seats regenerated"
          : "Event updated successfully",
        event,
      });
    } catch (error) {
      await t.rollback();
      console.error("Update event error:", error);
      return res
        .status(500)
        .json({ message: "Server error while updating event" });
    }
  }
);

// @route   POST /api/admin/events/:id/regenerate-seats
// @desc    Regenerate seats for an event (DANGEROUS: deletes existing seats). Blocks if reservations exist unless force=true
// @access  Admin
router.post(
  "/events/:id/regenerate-seats",
  authorize("admin"),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { maxSeats: newMaxSeats, force = false } = req.body || {};
      const event = await Event.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!event) {
        await t.rollback();
        return res.status(404).json({ message: "Event not found" });
      }

      // Prevent modifications for past events
      if (new Date(event.eventDate) < new Date()) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: "Cannot regenerate seats for past events" });
      }

      const existingReservations = await Reservation.count({
        where: { eventId: event.id },
        transaction: t,
      });
      if (existingReservations > 0 && !force) {
        await t.rollback();
        return res.status(409).json({
          message:
            "Event has reservations. Pass force=true to proceed (this will invalidate seat references).",
          existingReservations,
        });
      }

      if (newMaxSeats) {
        if (
          Number.isNaN(parseInt(newMaxSeats)) ||
          parseInt(newMaxSeats) < 1 ||
          parseInt(newMaxSeats) > 2500
        ) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: "maxSeats must be between 1 and 2500" });
        }
        const venueCap = getVenueCapacity(event.venue);
        await event.update(
          { maxSeats: clamp(newMaxSeats, 1, venueCap) },
          { transaction: t }
        );
      }

      // Determine vipCount from event metadata unless provided
      const vipCount =
        req.body.vipCount !== undefined
          ? parseInt(req.body.vipCount) || 0
          : (event.metadata && event.metadata.vipCount) || 0;

      await generateSeatsForEvent(
        event.id,
        event.maxSeats,
        event.basePrice,
        event.vipPrice,
        t,
        vipCount,
        event.venue
      );

      await t.commit();
      return res.json({
        message: "Seats regenerated",
        eventId: event.id,
        maxSeats: event.maxSeats,
      });
    } catch (error) {
      await t.rollback();
      console.error("Regenerate seats error:", error);
      res
        .status(500)
        .json({ message: "Server error while regenerating seats" });
    }
  }
);

// @route   DELETE /api/admin/events/:id
// @desc    Delete an event
// @access  Admin
router.delete("/events/:id", authorize("admin"), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event has reservations
    const reservationCount = await Reservation.count({
      where: { eventId: req.params.id },
    });

    if (reservationCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete event with existing reservations. Archive it instead.",
      });
    }

    await event.destroy();

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: "Server error while deleting event" });
  }
});

// @route   PUT /api/admin/events/:id/publish
// @desc    Publish a draft event
// @access  Admin
router.put(
  "/events/:id/publish",
  authorize("admin"),
  upload.single("posterImage"),
  [
    body("description")
      .optional()
      .isLength({ min: 10 })
      .withMessage("Description must be at least 10 characters"),
    body("endDate").optional().isISO8601().withMessage("Invalid end date"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.status !== "draft") {
        return res
          .status(400)
          .json({ message: "Only draft events can be published" });
      }
      if (new Date(event.eventDate) < new Date()) {
        return res
          .status(400)
          .json({ message: "Cannot publish an event in the past" });
      }
      const updates = { status: "published" };
      if (req.body.description) updates.description = req.body.description;
      if (req.body.endDate) updates.endDate = req.body.endDate;
      if (req.file)
        updates.posterImage = `/uploads/posters/${req.file.filename}`;
      await event.update(updates);
      return res.json({ message: "Event published successfully", event });
    } catch (error) {
      console.error("Publish event error (enhanced):", error);
      res.status(500).json({ message: "Server error while publishing event" });
    }
  }
);

// USER MANAGEMENT

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin/Staff
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role && role !== "all") where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { studentId: { [Op.like]: `%${search}%` } },
      ];
    }

    const users = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Reservation,
          as: "reservations",
          attributes: ["id", "status"],
          required: false,
        },
      ],
    });

    const usersWithStats = users.rows.map((user) => {
      const reservations = user.reservations || [];
      return {
        ...user.toJSON(),
        totalReservations: reservations.length,
        confirmedReservations: reservations.filter(
          (r) => r.status === "confirmed"
        ).length,
        reservations: undefined,
      };
    });

    res.json({
      users: usersWithStats,
      totalPages: Math.ceil(users.count / limit),
      currentPage: parseInt(page),
      totalUsers: users.count,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status
// @access  Admin
router.put("/users/:id/status", authorize("admin"), async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ isActive });

    res.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res
      .status(500)
      .json({ message: "Server error while updating user status" });
  }
});

// RESERVATION MANAGEMENT

// @route   GET /api/admin/reservations
// @desc    Get all reservations
// @access  Admin/Staff
router.get("/reservations", async (req, res) => {
  try {
    const { page = 1, limit = 10, status, eventId } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== "all") where.status = status;
    if (eventId) where.eventId = eventId;

    const reservations = await Reservation.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email", "studentId"],
        },
        {
          model: Event,
          as: "event",
          attributes: ["title", "eventDate", "venue"],
        },
        {
          model: Seat,
          as: "seat",
          attributes: ["section", "row", "number", "isVip"],
        },
      ],
    });

    res.json({
      reservations: reservations.rows,
      totalPages: Math.ceil(reservations.count / limit),
      currentPage: parseInt(page),
      totalReservations: reservations.count,
    });
  } catch (error) {
    console.error("Get admin reservations error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching reservations" });
  }
});

// @route   PUT /api/admin/reservations/bulk-approve
// @desc    Approve all pending reservations for an event (optionally limited)
// @access  Admin/Staff
router.put("/reservations/bulk-approve", async (req, res) => {
  const { eventId, limit = 1000 } = req.body || {};
  if (!eventId) return res.status(400).json({ message: "eventId is required" });
  try {
    const pending = await Reservation.findAll({
      where: { eventId, status: "pending" },
      order: [["createdAt", "ASC"]],
      limit: Math.min(parseInt(limit) || 1000, 2000),
      include: [
        { model: Event, as: "event" },
        { model: Seat, as: "seat" },
        { model: User, as: "user", attributes: ["id", "name", "email"] },
      ],
    });

    let success = 0;
    for (const r of pending) {
      const t = await sequelize.transaction();
      try {
        // skip past events
        if (new Date(r.event.eventDate) < new Date()) {
          await t.rollback();
          continue;
        }
        await r.update(
          {
            status: "confirmed",
            paymentStatus:
              parseFloat(r.totalAmount || 0) > 0 ? r.paymentStatus : "paid",
          },
          { transaction: t }
        );
        await r.seat.update(
          { status: "sold", isReserved: true, holdExpiry: null },
          { transaction: t }
        );
        await t.commit();
        success += 1;

        // send ticket email best-effort
        if (!r.emailSent) {
          try {
            // Ensure QR exists before sending
            if (!r.qrCode) {
              try {
                const QRCode = require("qrcode");
                const qrData = {
                  reservationId: r.id,
                  reservationCode: r.reservationCode,
                  eventId: r.event.id,
                  seatInfo: `${r.seat.section.toUpperCase()}-${r.seat.row}${
                    r.seat.number
                  }`,
                  userName: r.user.name,
                  eventTitle: r.event.title,
                };
                const qrCodeDataURL = await QRCode.toDataURL(
                  JSON.stringify(qrData)
                );
                await r.update({ qrCode: qrCodeDataURL });
              } catch (e) {
                console.warn(
                  "[Bulk Approve] QR regeneration failed for",
                  r.id,
                  e.message
                );
              }
            }
            await sendTicketEmail({
              to: r.user.email,
              userName: r.user.name,
              reservation: r,
              event: r.event,
              seat: r.seat,
              qrCode: r.qrCode,
            });
            await r.update({ emailSent: true });
          } catch (err) {
            console.warn("[Bulk Approve] email failed for", r.id, err.message);
          }
        }
      } catch (e) {
        await t.rollback();
        console.error("Bulk approve item failed:", e.message);
      }
    }

    return res.json({
      message: `Approved ${success} reservation(s)`,
      approved: success,
      attempted: pending.length,
    });
  } catch (error) {
    console.error("Bulk approve error:", error);
    res.status(500).json({ message: "Server error during bulk approve" });
  }
});

// @route   POST /api/admin/events/:id/mandatory-invite
// @desc    Send bulk notifications and optionally auto-issue tickets to provided emails or to first N students
// @access  Admin
router.post(
  "/events/:id/mandatory-invite",
  authorize("admin"),
  async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (new Date(event.eventDate) < new Date())
        return res
          .status(400)
          .json({ message: "Cannot invite for past event" });

      let {
        emails = [],
        message = "",
        sendTickets = false,
        limit = 1000,
      } = req.body || {};
      if (!Array.isArray(emails)) emails = [];
      limit = Math.min(parseInt(limit) || 1000, 2000);

      // If no emails provided, target up to N active students
      if (emails.length === 0) {
        const students = await User.findAll({
          where: { role: { [Op.in]: ["student", "user"] }, isActive: true },
          limit,
        });
        emails = students.map((u) => u.email);
      } else if (emails.length > limit) {
        emails = emails.slice(0, limit);
      }

      let notified = 0;
      let ticketed = 0;

      for (const email of emails) {
        // Ensure user exists
        let user = await User.findOne({ where: { email } });
        if (!user) {
          user = await User.create({
            name: email.split("@")[0],
            email,
            password: Math.random().toString(36).slice(2, 10),
            role: "student",
            isActive: true,
          });
        }

        // Send notification email (best-effort)
        try {
          await sendNotificationEmail({
            to: email,
            subject: `Mandatory Attendance: ${event.title}`,
            message:
              message ||
              `You are required to attend ${event.title} on ${new Date(
                event.eventDate
              ).toLocaleString()}.`,
            userName: user.name,
          });
          notified += 1;
        } catch (e) {
          console.warn("Notify failed for", email, e.message);
        }

        if (sendTickets) {
          // Allocate first available seat
          const t = await sequelize.transaction();
          try {
            const seat = await Seat.findOne({
              where: {
                eventId: event.id,
                status: "available",
                isReserved: false,
              },
              order: [
                ["section", "ASC"],
                ["row", "ASC"],
                ["number", "ASC"],
              ],
              transaction: t,
              lock: t.LOCK.UPDATE,
            });
            if (!seat) {
              await t.rollback();
              continue;
            }

            // create reservation
            const reservation = await Reservation.create(
              {
                userId: user.id,
                eventId: event.id,
                seatId: seat.id,
                status: "confirmed",
                totalAmount: 0,
                paymentStatus: "paid",
              },
              { transaction: t }
            );
            await seat.update(
              { status: "sold", isReserved: true },
              { transaction: t }
            );
            await t.commit();
            ticketed += 1;

            // Email ticket (best-effort)
            try {
              // Ensure QR exists for the new reservation
              if (!reservation.qrCode) {
                try {
                  const QRCode = require("qrcode");
                  const qrData = {
                    reservationId: reservation.id,
                    reservationCode: reservation.reservationCode,
                    eventId: event.id,
                    seatInfo: `${seat.section.toUpperCase()}-${seat.row}${
                      seat.number
                    }`,
                    userName: user.name,
                    eventTitle: event.title,
                  };
                  const qrCodeDataURL = await QRCode.toDataURL(
                    JSON.stringify(qrData)
                  );
                  await reservation.update({ qrCode: qrCodeDataURL });
                } catch (e) {
                  console.warn(
                    "[Mandatory Invite] QR generation failed for",
                    email,
                    e.message
                  );
                }
              }
              await sendTicketEmail({
                to: email,
                userName: user.name,
                reservation,
                event,
                seat,
                qrCode: reservation.qrCode,
              });
              await reservation.update({ emailSent: true });
            } catch (e) {
              console.warn("Ticket email failed for", email, e.message);
            }
          } catch (err) {
            await t.rollback();
            console.error("Ticketing failed for", email, err.message);
          }
        }
      }

      // Mark event as mandatory in metadata
      await event.update({
        metadata: { ...(event.metadata || {}), mandatory: true },
      });

      return res.json({
        message: `Invited ${notified} user(s)${
          sendTickets ? `, issued ${ticketed} ticket(s)` : ""
        }`,
        notified,
        ticketed,
      });
    } catch (error) {
      console.error("Mandatory invite error:", error);
      return res
        .status(500)
        .json({ message: "Server error during mandatory invites" });
    }
  }
);

// @route   PUT /api/admin/reservations/:id/approve
// @desc    Approve (confirm) a pending reservation (ticket)
// @access  Admin/Staff
router.put("/reservations/:id/approve", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: Event, as: "event" },
        { model: Seat, as: "seat" },
        { model: User, as: "user", attributes: ["id", "name", "email"] },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.status !== "pending") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Only pending reservations can be approved" });
    }
    // Prevent approving past events
    if (new Date(reservation.event.eventDate) < new Date()) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Cannot approve reservation for past event" });
    }

    // Update reservation & seat
    await reservation.update(
      {
        status: "confirmed",
        paymentStatus:
          reservation.totalAmount > 0 ? reservation.paymentStatus : "paid",
      },
      { transaction: t }
    );
    await reservation.seat.update(
      { status: "sold", isReserved: true, holdExpiry: null },
      { transaction: t }
    );

    await t.commit();

    // Send ticket email if not already sent (non-blocking failure)
    if (!reservation.emailSent) {
      try {
        await sendTicketEmail({
          to: reservation.user.email,
          userName: reservation.user.name,
          reservation,
          event: reservation.event,
          seat: reservation.seat,
          qrCode: reservation.qrCode, // already generated earlier; could regenerate if needed
        });
        await reservation.update({ emailSent: true });
      } catch (emailErr) {
        console.error("Approve reservation email error:", emailErr.message);
      }
    }

    return res.json({ message: "Reservation approved", reservation });
  } catch (error) {
    await t.rollback();
    console.error("Approve reservation error:", error);
    res
      .status(500)
      .json({ message: "Server error while approving reservation" });
  }
});

// @route   PUT /api/admin/reservations/:id/reject
// @desc    Reject (cancel) a pending reservation (ticket)
// @access  Admin/Staff
router.put("/reservations/:id/reject", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: Seat, as: "seat" },
        { model: Event, as: "event" },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.status !== "pending") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Only pending reservations can be rejected" });
    }

    await reservation.update(
      {
        status: "cancelled",
        paymentStatus:
          reservation.paymentStatus === "paid"
            ? "refunded"
            : reservation.paymentStatus,
      },
      { transaction: t }
    );
    await reservation.seat.update(
      { status: "available", isReserved: false, holdExpiry: null },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      message: "Reservation rejected",
      reservation: { id: reservation.id, status: reservation.status },
    });
  } catch (error) {
    await t.rollback();
    console.error("Reject reservation error:", error);
    res
      .status(500)
      .json({ message: "Server error while rejecting reservation" });
  }
});

// Helper function to generate seats
async function generateSeatsForEvent(
  eventId,
  maxSeats,
  basePrice,
  vipPrice,
  transaction,
  vipCount = 0,
  venue
) {
  // Hard-delete existing seats to avoid unique conflicts and free rows
  await Seat.destroy({ where: { eventId }, force: true, transaction });

  const venueCap = getVenueCapacity(venue);
  const total = clamp(maxSeats, 1, venueCap);
  const vipTotal = clamp(vipCount, 0, total);
  const coreTotal = total - vipTotal;

  // Choose sections based on venue size; smaller rooms have fewer sections
  const sections = (() => {
    if (venueCap >= 1000) {
      return [
        { name: "orchestra", weight: 0.5 },
        { name: "balcony", weight: 0.35 },
        { name: "lodge_left", weight: 0.075 },
        { name: "lodge_right", weight: 0.075 },
      ];
    }
    if (venueCap >= 300) {
      return [
        { name: "orchestra", weight: 0.7 },
        { name: "balcony", weight: 0.3 },
      ];
    }
    if (venueCap >= 100) {
      return [{ name: "orchestra", weight: 1.0 }];
    }
    return [{ name: "orchestra", weight: 1.0 }];
  })();

  // Distribute core seats by weight
  let allocated = 0;
  const seatDefs = [];
  sections.forEach((s, idx) => {
    let count = Math.floor(coreTotal * s.weight);
    if (idx === sections.length - 1) count = coreTotal - allocated; // remainder to last
    allocated += count;
    seatDefs.push({ name: s.name, total: count, isVip: false });
  });
  if (vipTotal > 0)
    seatDefs.push({ name: "vip", total: vipTotal, isVip: true });

  const perRow = venueCap >= 1000 ? 40 : venueCap >= 300 ? 24 : 16;
  const rowsPerSection = {};

  const records = [];
  for (const def of seatDefs) {
    let remaining = def.total;
    let rowIdx = 0;
    while (remaining > 0) {
      rowIdx += 1;
      const rowLetter = String.fromCharCode(64 + ((rowIdx - 1) % 26) + 1); // A..Z cycles
      const count = Math.min(perRow, remaining);
      for (let n = 1; n <= count; n++) {
        records.push({
          eventId,
          section: def.name,
          row: rowLetter,
          number: n,
          isVip: def.isVip,
          price: def.isVip ? vipPrice : basePrice,
          status: "available",
          isReserved: false,
        });
      }
      remaining -= count;
    }
    rowsPerSection[def.name] = rowIdx;
  }

  // Extra guard: trim to total to avoid accidental excess
  if (records.length > total) records.length = total;

  await Seat.bulkCreate(records, { validate: true, transaction });
}

module.exports = router;
