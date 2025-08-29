const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");

const dialect = process.env.DB_DIALECT || "mysql";
const ssl = process.env.DB_SSL === "true";
const caPath = process.env.DB_SSL_CA_PATH
  ? path.resolve(
      __dirname,
      "..",
      process.env.DB_SSL_CA_PATH.replace(/^\.\//, "")
    )
  : null;
const sslStrict = process.env.DB_SSL_STRICT !== "false"; // default strict unless explicitly disabled

// Build SSL options for mysql2/pg. Prefer CA; otherwise allow relaxing via DB_SSL_STRICT=false
const sslOptions = (() => {
  if (!ssl) return {};
  const caExists = caPath && fs.existsSync(caPath);
  if (caExists) {
    const ca = fs.readFileSync(caPath);
    return dialect === "postgres"
      ? { ssl: { require: true, ca, rejectUnauthorized: true } }
      : { ssl: { ca, rejectUnauthorized: true } };
  }
  // No CA provided
  if (sslStrict) {
    // Keep strict; may fail on self-signed chains
    return dialect === "postgres"
      ? { ssl: { require: true, rejectUnauthorized: true } }
      : { ssl: { rejectUnauthorized: true } };
  }
  // Relax verification to bypass self-signed errors (use only when needed)
  return dialect === "postgres"
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : { ssl: { rejectUnauthorized: false } };
})();

const sequelize = new Sequelize(
  process.env.DB_NAME || "upat_ticketing",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    dialect,
    dialectOptions: {
      ...sslOptions,
      // MySQL2 specific options
      charset: "utf8mb4",
      supportBigNumbers: true,
      bigNumberStrings: true,
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 60000),
      // Note: maxAllowedPacket must be set at MySQL server level, not in client
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 10000),
      // maxAllowedPacket is a server setting, not a client pool setting
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true, // Enables soft deletes
    },
  }
);

module.exports = { sequelize };
