const express = require("express");
const { Seat, Event, Reservation } = require("../models");
const { Op } = require("sequelize");
const { auth } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/seats/:seatId/hold
// @desc    Hold a seat temporarily
// @access  Private
router.post("/:seatId/hold", auth, async (req, res) => {
  try {
    const seat = await Seat.findByPk(req.params.seatId, {
      include: [{ model: Event, as: "event" }],
    });

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    if (seat.isReserved || seat.status !== "available") {
      return res.status(400).json({ message: "Seat is not available" });
    }

    if (seat.event.status !== "published") {
      return res
        .status(400)
        .json({ message: "Event is not available for booking" });
    }

    // Check if event date has passed
    if (new Date(seat.event.eventDate) < new Date()) {
      return res
        .status(400)
        .json({ message: "Cannot reserve seats for past events" });
    }

    // Hold the seat for 10 minutes
    const holdExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await seat.update({
      status: "reserved",
      isReserved: true,
      holdExpiry,
    });

    res.json({
      message: "Seat held successfully",
      seat: {
        id: seat.id,
        section: seat.section,
        row: seat.row,
        number: seat.number,
        // price removed for free CCIS events
        holdExpiry,
      },
      holdDuration: "10 minutes",
    });
  } catch (error) {
    console.error("Hold seat error:", error);
    res.status(500).json({ message: "Server error while holding seat" });
  }
});

// @route   POST /api/seats/:seatId/release
// @desc    Release a held seat
// @access  Private
router.post("/:seatId/release", auth, async (req, res) => {
  try {
    const seat = await Seat.findByPk(req.params.seatId);

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    // Only release if it's on hold and not confirmed
    if (
      seat.status === "reserved" &&
      seat.holdExpiry &&
      seat.holdExpiry > new Date()
    ) {
      await seat.update({
        status: "available",
        isReserved: false,
        holdExpiry: null,
      });

      res.json({ message: "Seat released successfully" });
    } else {
      res.status(400).json({ message: "Seat cannot be released" });
    }
  } catch (error) {
    console.error("Release seat error:", error);
    res.status(500).json({ message: "Server error while releasing seat" });
  }
});

// @route   GET /api/seats/availability/:eventId
// @desc    Get real-time seat availability for an event
// @access  Public
router.get("/availability/:eventId", async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const seats = await Seat.findAll({
      where: { eventId: req.params.eventId },
      attributes: [
        "id",
        "section",
        "row",
        "number",
        "status",
        "isVip",
        // "price", // removed from public payload
        "holdExpiry",
      ],
    });

    // Update expired holds
    const now = new Date();
    const expiredSeats = seats.filter(
      (seat) =>
        seat.holdExpiry && seat.holdExpiry < now && seat.status === "reserved"
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
    }

    // Refetch updated data
    const updatedSeats = await Seat.findAll({
      where: { eventId: req.params.eventId },
      attributes: [
        "id",
        "section",
        "row",
        "number",
        "status",
        "isVip",
        // "price", // removed from public payload
        "holdExpiry",
      ],
    });

    // Calculate statistics
    const totalSeats = updatedSeats.length;
    const availableSeats = updatedSeats.filter(
      (seat) => seat.status === "available"
    ).length;
    const reservedSeats = updatedSeats.filter(
      (seat) => seat.status === "reserved"
    ).length;
    const soldSeats = updatedSeats.filter(
      (seat) => seat.status === "sold"
    ).length;
    const vipSeats = updatedSeats.filter((seat) => seat.isVip).length;

    res.json({
      eventId: req.params.eventId,
      seats: updatedSeats,
      statistics: {
        totalSeats,
        availableSeats,
        reservedSeats,
        soldSeats,
        vipSeats,
        occupancyRate: (
          ((reservedSeats + soldSeats) / totalSeats) *
          100
        ).toFixed(2),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get availability error:", error);
    res
      .status(500)
      .json({ message: "Server error while checking availability" });
  }
});

module.exports = router;
