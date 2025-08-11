const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const seatRoutes = require("./routes/seats");
const reservationRoutes = require("./routes/reservations");
const adminRoutes = require("./routes/admin");
const galleryRoutes = require("./routes/gallery");

const { sequelize } = require("./config/database");
const { success, error } = require("./utils/apiResponse");

const app = express();
app.set("trust proxy", 1);
const isDev = process.env.NODE_ENV !== "production";

// Build allowed client origins (support multiple localhost ports)
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173", // vite preview
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
];
const envOrigins = (process.env.CLIENT_URLS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const singleOrigin = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [];
const allowedOrigins = Array.from(
  new Set([...defaultOrigins, ...envOrigins, ...singleOrigin])
);

// Security middleware (allow cross-origin resource loading for static posters)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
// Response compression
app.use(compression());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // same-origin or server-to-server
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS not allowed from origin ${origin}`));
    },
    credentials: true,
  })
);

// Rate limiting (relaxed in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const postersDir = path.join(__dirname, "uploads", "posters");
fs.mkdirSync(postersDir, { recursive: true });
// Serve posters with dynamic CORS headers based on request origin
app.use(
  "/uploads/posters",
  (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    // Cache images for a week
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    next();
  },
  express.static(postersDir)
);

// Ensure gallery directory exists and serve with same headers
const galleryDir = path.join(__dirname, "uploads", "gallery");
fs.mkdirSync(galleryDir, { recursive: true });
app.use(
  "/uploads/gallery",
  (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    next();
  },
  express.static(galleryDir)
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/gallery", galleryRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "CCIS Ticketing System API is running",
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint for rate-limit/CORS diagnostics
app.get("/api/_debug/rate-limit", (req, res) => {
  res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    ip: req.ip,
    origin: req.headers.origin || null,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err); // already structured from asyncHandler
  if (res.headersSent) return next(err);
  return error(
    res,
    err.message || "Internal server error",
    err.statusCode || 500
  );
});

// 404 handler
// Express 5 (path-to-regexp v6) no longer supports bare "*". Use no path to catch all.
app.use((req, res) => {
  return error(res, "Route not found", 404);
});

const PORT = process.env.PORT || 3001;

// Database connection and server start
async function startServer() {
  try {
    // Fail fast on missing critical envs
    const required = ["JWT_SECRET"]; // DB envs are optional if defaults used
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw Object.assign(
        new Error(`Missing env vars: ${missing.join(", ")}`),
        { statusCode: 500 }
      );
    }
    await sequelize.authenticate();
    console.log("✅ Database connection has been established successfully.");

    // Sync database (create tables if they don't exist)
    await sequelize.sync(); // removed force:true after development
    console.log("✅ Database synchronized successfully.");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌐 API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
