const express = require("express");
const { body, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { Event, Seat, Reservation, User, Payment } = require("../models");
const { auth, authorize } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const { sequelize } = require("../config/database");
const { sendTicketEmail } = require("../utils/emailService");

const router = express.Router();

// Multer setup for poster image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "..", "uploads", "posters")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `poster_${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (/image\/(png|jpe?g|webp)/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type"), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Apply admin authorization to all routes
router.use(auth);
router.use(authorize("admin", "staff"));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Admin/Staff
router.get("/dashboard", async (req, res) => {
  try {
    const totalEvents = await Event.count();
    const activeEvents = await Event.count({
      where: {
        status: "published",
        eventDate: { [Op.gte]: new Date() },
      },
    });

    const totalUsers = await User.count();
    const totalReservations = await Reservation.count();
    const confirmedReservations = await Reservation.count({
      where: { status: "confirmed" },
    });

    const totalRevenue = await Payment.sum("amount", {
      where: { status: "completed" },
    });

    // Recent reservations
    const recentReservations = await Reservation.findAll({
      limit: 10,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
        {
          model: Event,
          as: "event",
          attributes: ["title", "eventDate"],
        },
        {
          model: Seat,
          as: "seat",
          attributes: ["section", "row", "number"],
        },
      ],
    });

    // Upcoming events
    const upcomingEvents = await Event.findAll({
      where: {
        eventDate: { [Op.gte]: new Date() },
        status: "published",
      },
      limit: 5,
      order: [["eventDate", "ASC"]],
      attributes: ["id", "title", "eventDate", "venue", "type"],
    });

    res.json({
      statistics: {
        totalEvents,
        activeEvents,
        totalUsers,
        totalReservations,
        confirmedReservations,
        totalRevenue: totalRevenue || 0,
      },
      recentReservations,
      upcomingEvents,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching dashboard data" });
  }
});

// EVENT MANAGEMENT

// @route   POST /api/admin/events
// @desc    Create a new event
// @access  Admin
router.post(
  "/events",
  authorize("admin"),
  // allow poster upload on create as well
  upload.single("posterImage"),
  [
    body("title")
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters"),
    body("eventDate").isISO8601().withMessage("Valid event date is required"),
    body("type")
      .isIn([
        "seminar",
        "workshop",
        "theater",
        "competition",
        "performance",
        "other",
      ])
      .withMessage("Invalid event type"),
    body("category")
      .isIn(["academic", "performance", "competition", "cultural"])
      .withMessage("Invalid category"),
    body("maxSeats")
      .isInt({ min: 1, max: 2500 })
      .withMessage("Max seats must be between 1 and 2500"),
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
        description,
        type,
        category,
        eventDate,
        endDate,
        venue = "CCIS Main Hall",
        isPaid = false,
        basePrice = 0,
        vipPrice = 0,
        maxSeats = 500,
        organizer = "CCIS",
        requiresApproval = false,
      } = req.body;

      // Accept VIP count (optional); store in metadata and derive maxSeats
      const vipCount = parseInt(req.body.vipCount || 0) || 0;
      const FIXED_NONVIP_TOTAL = 468 + 422 + 214 + 92; // orchestra + lower + upper + lodges
      const derivedMaxSeats = FIXED_NONVIP_TOTAL + vipCount;

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
        vipCount
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

// @route   GET /api/admin/events
// @desc    Get all events for admin
// @access  Admin/Staff
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

      const FIXED_NONVIP_TOTAL = 468 + 422 + 214 + 92;
      const derivedMaxSeats = FIXED_NONVIP_TOTAL + vipCount;
      const originalMax = event.maxSeats;
      const requestedMax = updates.maxSeats
        ? parseInt(updates.maxSeats)
        : derivedMaxSeats;
      const finalMax = requestedMax || derivedMaxSeats;
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
          vipCount
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
        await event.update(
          { maxSeats: parseInt(newMaxSeats) },
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
        vipCount
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
  vipCount = 0
) {
  const seats = [];

  // Clear any existing seats for idempotency
  await Seat.destroy({ where: { eventId }, transaction });

  // Fixed totals as per requirement
  const totals = {
    orchestra: 468,
    balcony: 422 + 214, // lower + upper combined in one 'balcony' section
    lodge_left: Math.floor(92 / 2),
    lodge_right: Math.ceil(92 / 2),
    vip: Math.max(0, parseInt(vipCount) || 0),
  };

  const makeSection = (name, total, isVip = false) => {
    let remaining = total;
    let rowIdx = 0;
    const perRow = 30; // arbitrary compact row length
    while (remaining > 0) {
      rowIdx += 1;
      const rowLetter = String.fromCharCode(64 + ((rowIdx - 1) % 26) + 1); // A..Z cycles
      const count = Math.min(perRow, remaining);
      for (let n = 1; n <= count; n++) {
        seats.push({
          eventId,
          section: name,
          row: rowLetter,
          number: n,
          isVip,
          price: isVip ? vipPrice : basePrice,
          status: "available",
          isReserved: false,
        });
      }
      remaining -= count;
    }
  };

  makeSection("orchestra", totals.orchestra, false);
  makeSection("balcony", totals.balcony, false);
  makeSection("lodge_left", totals.lodge_left, false);
  makeSection("lodge_right", totals.lodge_right, false);
  if (totals.vip > 0) makeSection("vip", totals.vip, true);

  // Safety: ensure we don't exceed maxSeats
  if (seats.length > maxSeats) seats.length = maxSeats;

  await Seat.bulkCreate(seats, { validate: true, transaction });
}

module.exports = router;
