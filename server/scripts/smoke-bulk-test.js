const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const path = require("path");

// Load models
const { Event, Seat, Reservation, User } = require("../models");
const { saveQrToFile } = require("../utils/qr");

(async () => {
  try {
    console.log("[smoke] Starting smoke test");
    const event = await Event.findOne({ where: { status: "published" } });
    if (!event) {
      console.error("[smoke] No published event found. Aborting.");
      process.exit(1);
    }

    const seat = await Seat.findOne({
      where: { eventId: event.id, status: "available", isReserved: false },
    });
    if (!seat) {
      console.error("[smoke] No available seat found for event", event.id);
      process.exit(1);
    }

    const testEmail = `smoke-${Date.now()}@example.com`;
    let user = await User.create({
      name: "SmokeTester",
      email: testEmail,
      password: Math.random().toString(36).slice(2, 10),
      role: "student",
      isActive: true,
    });

    const reservation = await Reservation.create({
      userId: user.id,
      eventId: event.id,
      seatId: seat.id,
      status: "confirmed",
      totalAmount: 0,
      paymentStatus: "paid",
    });

    const qrData = {
      reservationId: reservation.id,
      reservationCode: reservation.reservationCode,
      eventId: event.id,
      seatInfo: `${seat.section.toUpperCase()}-${seat.row}${seat.number}`,
      userName: user.name,
      eventTitle: event.title,
    };

    const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
    });
    const saved = await saveQrToFile(
      dataUrl,
      reservation.reservationCode || reservation.id
    );
    if (saved) {
      await reservation.update({ qrCode: saved });
      console.log("[smoke] QR saved to", saved);
    } else {
      await reservation.update({ qrCode: dataUrl });
      console.log("[smoke] QR saved as data URL in DB (fallback)");
    }

    console.log("[smoke] Reservation updated successfully:", reservation.id);
    process.exit(0);
  } catch (err) {
    console.error("[smoke] Test failed:", err?.message || err);
    process.exit(1);
  }
})();
