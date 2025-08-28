// Quick DB schema inspector for UPAT Ticketing core tables
// Usage: node scripts/inspect-db.js

require("dotenv").config();
const { sequelize } = require("../config/database");

async function describe(name) {
  const qi = sequelize.getQueryInterface();
  const desc = await qi.describeTable(name);
  return desc;
}

function summarize(desc) {
  const rows = Object.entries(desc).map(([col, info]) => ({
    column: col,
    type: info.type,
    allowNull: info.allowNull,
    defaultValue: info.defaultValue,
    primaryKey: info.primaryKey,
  }));
  return rows;
}

function checkReservations(desc) {
  const issues = [];
  const need = [
    "id",
    "user_id",
    "event_id",
    "seat_id",
    "reservation_code",
    "status",
    "total_amount",
    "payment_status",
    "qr_code",
    "email_sent",
    "expires_at",
    "created_at",
    "updated_at",
  ];
  for (const c of need) if (!desc[c]) issues.push(`Missing column: ${c}`);

  const idType = desc.id?.type || "";
  if (idType && !/char\(36\)|uuid|binary\(16\)/i.test(idType)) {
    issues.push(`id should be UUID/CHAR(36). Found: ${idType}`);
  }
  for (const fk of ["user_id", "event_id", "seat_id"]) {
    const t = desc[fk]?.type || "";
    if (t && !/char\(36\)|uuid|binary\(16\)/i.test(t)) {
      issues.push(`${fk} should be UUID/CHAR(36). Found: ${t}`);
    }
  }
  const qrType = desc.qr_code?.type || "";
  if (qrType && !/text|longtext/i.test(qrType))
    issues.push(`qr_code should be (LONG)TEXT. Found: ${qrType}`);
  if (!desc.email_sent)
    issues.push("email_sent missing (TINYINT(1) default 0)");
  return issues;
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to DB");
    const tables = ["users", "events", "seats", "reservations"];
    for (const t of tables) {
      try {
        const d = await describe(t);
        console.log(`\n=== ${t} ===`);
        console.table(summarize(d));
        if (t === "reservations") {
          const issues = checkReservations(d);
          if (issues.length) {
            console.log("⚠️ Issues detected:");
            for (const i of issues) console.log(" -", i);
          } else {
            console.log("✔ reservations schema looks compatible.");
          }
        }
      } catch (e) {
        console.log(`\n=== ${t} ===`);
        console.log("Describe failed:", e.message);
      }
    }
    await sequelize.close();
  } catch (e) {
    console.error("❌ DB inspect failed:", e);
    process.exit(1);
  }
})();
