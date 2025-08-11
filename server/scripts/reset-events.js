#!/usr/bin/env node
/*
  Reset all Events and related data (Seats, Reservations, Payments) and delete poster files.
  Usage:
    node scripts/reset-events.js --yes           # dangerous: resets ALL events
    node scripts/reset-events.js --keep-posters  # keep poster files
    node scripts/reset-events.js --only-future   # only future events

  Environment:
    Uses server/config/database.js for connection.
*/

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { sequelize } = require("../config/database");
const { Event, Seat, Reservation, Payment } = require("../models");
const { Op } = require("sequelize");

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    yes: args.includes("--yes") || args.includes("-y"),
    keepPosters: args.includes("--keep-posters"),
    onlyFuture: args.includes("--only-future"),
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const opts = parseArgs();
  if (!opts.yes && !opts.dryRun) {
    console.error(
      "Refusing to reset without --yes. Use --dry-run to preview or add --yes to proceed."
    );
    process.exit(1);
  }

  // Define where poster files are stored (relative to server root)
  const postersDir = path.resolve(__dirname, "..", "uploads", "posters");

  const where = opts.onlyFuture ? { eventDate: { [Op.gte]: new Date() } } : {};

  console.log("Connecting to database...");
  await sequelize.authenticate();

  const t = await sequelize.transaction();
  try {
    console.log("Fetching events to reset...");
    const events = await Event.findAll({ where, transaction: t });

    if (events.length === 0) {
      console.log("No events found matching criteria. Nothing to do.");
      await t.commit();
      process.exit(0);
    }

    const eventIds = events.map((e) => e.id);
    const posters = events.map((e) => e.posterImage).filter(Boolean);

    console.log(
      `Events to ${opts.dryRun ? "affect" : "delete"}: ${events.length}`
    );

    if (opts.dryRun) {
      console.log(
        "Sample event titles:",
        events.slice(0, 5).map((e) => e.title)
      );
      await t.rollback();
      await sequelize.close();
      console.log("Dry run complete. No changes made.");
      process.exit(0);
    }

    // Delete in dependency order
    console.log("Collecting related reservations...");
    const reservations = await Reservation.findAll({
      where: { eventId: { [Op.in]: eventIds } },
      attributes: ["id"],
      transaction: t,
    });
    const reservationIds = reservations.map((r) => r.id);

    console.log(`Deleting payments (${reservationIds.length} reservations)...`);
    if (reservationIds.length > 0) {
      await Payment.destroy({
        where: { reservationId: { [Op.in]: reservationIds } },
        force: true,
        transaction: t,
      });
    }

    console.log("Deleting reservations...");
    await Reservation.destroy({
      where: { eventId: { [Op.in]: eventIds } },
      force: true,
      transaction: t,
    });

    console.log("Deleting seats...");
    await Seat.destroy({
      where: { eventId: { [Op.in]: eventIds } },
      force: true,
      transaction: t,
    });

    console.log("Deleting events...");
    await Event.destroy({
      where: { id: { [Op.in]: eventIds } },
      force: true,
      transaction: t,
    });

    await t.commit();

    if (!opts.keepPosters) {
      console.log("Deleting poster files...");
      for (const p of posters) {
        try {
          // poster paths are stored like '/uploads/posters/filename.jpg'
          const rel = p.startsWith("/") ? p.slice(1) : p;
          const abs = path.resolve(__dirname, "..", rel);
          if (abs.startsWith(postersDir) && fs.existsSync(abs)) {
            fs.unlinkSync(abs);
            console.log("Deleted", abs);
          }
        } catch (e) {
          console.warn("Could not delete", p, e.message);
        }
      }
    } else {
      console.log("Keeping poster files as requested.");
    }

    console.log("Reset complete.");
  } catch (err) {
    console.error("Reset failed:", err);
    try {
      await t.rollback();
    } catch {}
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
