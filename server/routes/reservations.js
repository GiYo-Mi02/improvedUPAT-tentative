const express = require("express");
const { body, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const QRCode = require("qrcode");
const { Reservation, Seat, Event, User, Payment } = require("../models");
const { auth } = require("../middleware/auth");
const { sendTicketEmail } = require("../utils/emailService");

const router = express.Router();

// @route   POST /api/reservations
// @desc    Create a new reservation
// @access  Private
router.post(
  "/",
  auth,
  [
    body("eventId").isUUID().withMessage("Valid event ID is required"),
    body("seatId").isUUID().withMessage("Valid seat ID is required"),
    body("paymentMethod")
      .isIn(["free", "cash", "gcash", "paymaya", "card"])
      .withMessage("Valid payment method is required"),
  ],
  async (req, res) => {
    const { sequelize } = require("../config/database");
    const t = await sequelize.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({ errors: errors.array() });
      }
      const { eventId, seatId, paymentMethod, paymentReference } = req.body;

      // Lock the seat row for update and load event
      let seat = await Seat.findByPk(seatId, {
        include: [{ model: Event, as: "event" }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }

      if (seat.status !== "reserved" || !seat.isReserved) {
        return res
          .status(400)
          .json({ message: "Seat is not held for reservation" });
      }

      if (seat.eventId !== eventId) {
        return res
          .status(400)
          .json({ message: "Seat does not belong to this event" });
      }

      // Check if seat hold has expired
      if (seat.holdExpiry && seat.holdExpiry < new Date()) {
        await seat.update(
          {
            status: "available",
            isReserved: false,
            holdExpiry: null,
          },
          { transaction: t }
        );
        await t.rollback();
        return res.status(400).json({ message: "Seat hold has expired" });
      }

      // Check event availability
      if (seat.event.status !== "published") {
        return res
          .status(400)
          .json({ message: "Event is not available for booking" });
      }

      if (new Date(seat.event.eventDate) < new Date()) {
        return res
          .status(400)
          .json({ message: "Cannot reserve seats for past events" });
      }

      // Check if user already has a reservation for this event
      const existingReservation = await Reservation.findOne({
        where: {
          userId: req.user.id,
          eventId,
          status: { [Op.in]: ["pending", "confirmed"] },
        },
      });

      if (existingReservation) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: "You already have a reservation for this event" });
      }

      // Calculate total amount
      const totalAmount = seat.price || 0;

      // Create reservation
      const reservation = await Reservation.create(
        {
          userId: req.user.id,
          eventId,
          seatId,
          totalAmount,
          paymentMethod,
          paymentReference,
          paymentStatus: totalAmount === 0 ? "paid" : "pending",
          status: totalAmount === 0 ? "confirmed" : "pending",
        },
        { transaction: t }
      );

      // Update seat status
      await seat.update(
        {
          status: totalAmount === 0 ? "sold" : "reserved",
          holdExpiry: null,
          isReserved: true,
        },
        { transaction: t }
      );

      // Generate QR code
      const qrData = {
        reservationId: reservation.id,
        reservationCode: reservation.reservationCode,
        eventId,
        seatInfo: `${seat.section.toUpperCase()}-${seat.row}${seat.number}`,
        userName: req.user.name,
        eventTitle: seat.event.title,
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: "M",
        type: "image/png",
        quality: 0.92,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      await reservation.update({ qrCode: qrCodeDataURL }, { transaction: t });

      // Create payment record for free events
      if (totalAmount === 0) {
        await Payment.create(
          {
            reservationId: reservation.id,
            amount: 0,
            paymentMethod: "free",
            status: "completed",
            processedAt: new Date(),
          },
          { transaction: t }
        );
      }

      // Commit transaction before slow operations
      await t.commit();

      // Send confirmation email (outside transaction)
      try {
        await sendTicketEmail({
          to: req.user.email,
          userName: req.user.name,
          reservation,
          event: seat.event,
          seat,
          qrCode: qrCodeDataURL,
        });
        await reservation.update({ emailSent: true });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Don't fail the reservation if email fails
      }

      // Fetch complete reservation data
      const completeReservation = await Reservation.findByPk(reservation.id, {
        include: [
          {
            model: Event,
            as: "event",
            attributes: ["id", "title", "eventDate", "venue", "type"],
          },
          {
            model: Seat,
            as: "seat",
            attributes: ["id", "section", "row", "number", "isVip"],
          },
        ],
      });

      res.status(201).json({
        message: "Reservation created successfully",
        reservation: completeReservation,
        qrCode: qrCodeDataURL,
      });
    } catch (error) {
      try {
        await t.rollback();
      } catch (_) {}
      console.error("Create reservation error:", error);
      res
        .status(500)
        .json({ message: "Server error while creating reservation" });
    }
  }
);

// @route   GET /api/reservations
// @desc    Get user's reservations
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (status && status !== "all") {
      where.status = status;
    }

    const reservations = await Reservation.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Event,
          as: "event",
          attributes: [
            "id",
            "title",
            "eventDate",
            "venue",
            "type",
            "posterImage",
          ],
        },
        {
          model: Seat,
          as: "seat",
          attributes: ["id", "section", "row", "number", "isVip"],
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
    console.error("Get reservations error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching reservations" });
  }
});

// @route   GET /api/reservations/:id
// @desc    Get single reservation
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: [
        {
          model: Event,
          as: "event",
          attributes: [
            "id",
            "title",
            "description",
            "eventDate",
            "venue",
            "type",
            "posterImage",
            "organizer",
          ],
        },
        {
          model: Seat,
          as: "seat",
          attributes: [
            "id",
            "section",
            "row",
            "number",
            "isVip",
            "isAccessible",
          ],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "id",
            "amount",
            "paymentMethod",
            "status",
            "processedAt",
          ],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json({ reservation });
  } catch (error) {
    console.error("Get reservation error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching reservation" });
  }
});

// @route   PUT /api/reservations/:id/cancel
// @desc    Cancel a reservation
// @access  Private
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: [
        { model: Seat, as: "seat" },
        { model: Event, as: "event" },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    if (reservation.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Reservation is already cancelled" });
    }

    if (reservation.status === "used") {
      return res.status(400).json({ message: "Cannot cancel used tickets" });
    }

    // Check if event is still upcoming (allow cancellation up to 2 hours before)
    const eventDate = new Date(reservation.event.eventDate);
    const cancelDeadline = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);

    if (new Date() > cancelDeadline) {
      return res.status(400).json({
        message: "Cannot cancel reservations within 2 hours of the event",
      });
    }

    // Update reservation status
    await reservation.update({ status: "cancelled" });

    // Release the seat
    await reservation.seat.update({
      status: "available",
      isReserved: false,
      holdExpiry: null,
    });

    res.json({
      message: "Reservation cancelled successfully",
      reservation: {
        id: reservation.id,
        reservationCode: reservation.reservationCode,
        status: "cancelled",
      },
    });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    res
      .status(500)
      .json({ message: "Server error while cancelling reservation" });
  }
});

// @route   GET /api/reservations/:id/qr
// @desc    Get QR code for reservation
// @access  Private
router.get("/:id/qr", auth, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: { [Op.in]: ["confirmed", "pending"] },
      },
    });

    if (!reservation) {
      return res
        .status(404)
        .json({ message: "Reservation not found or not accessible" });
    }

    if (!reservation.qrCode) {
      return res
        .status(400)
        .json({ message: "QR code not available for this reservation" });
    }

    res.json({
      qrCode: reservation.qrCode,
      reservationCode: reservation.reservationCode,
    });
  } catch (error) {
    console.error("Get QR code error:", error);
    res.status(500).json({ message: "Server error while fetching QR code" });
  }
});

// @route   POST /api/reservations/:id/resend-email
// @desc    Resend ticket email
// @access  Private
router.post("/:id/resend-email", auth, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: { [Op.in]: ["confirmed", "pending"] },
      },
      include: [
        { model: Event, as: "event" },
        { model: Seat, as: "seat" },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Ensure QR code exists; generate if missing
    if (!reservation.qrCode) {
      try {
        const qrData = {
          reservationId: reservation.id,
          reservationCode: reservation.reservationCode,
          eventId: reservation.event.id,
          seatInfo: `${reservation.seat.section.toUpperCase()}-${
            reservation.seat.row
          }${reservation.seat.number}`,
          userName: req.user.name,
          eventTitle: reservation.event.title,
        };
        const QRCode = require("qrcode");
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
          errorCorrectionLevel: "M",
          type: "image/png",
          quality: 0.92,
          margin: 1,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        await reservation.update({ qrCode: qrCodeDataURL });
      } catch (e) {
        console.warn("Failed to regenerate QR code for resend:", e.message);
      }
    }

    await sendTicketEmail({
      to: req.user.email,
      userName: req.user.name,
      reservation,
      event: reservation.event,
      seat: reservation.seat,
      qrCode: reservation.qrCode,
    });

    res.json({ message: "Ticket email sent successfully" });
  } catch (error) {
    console.error("Resend email error:", error);
    res.status(500).json({ message: "Server error while sending email" });
  }
});

module.exports = router;
