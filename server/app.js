const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const seatRoutes = require("./routes/seats");
const reservationRoutes = require("./routes/reservations");
const adminRoutes = require("./routes/admin");

const { sequelize } = require("./config/database");
const { success, error } = require("./utils/apiResponse");

const app = express();

// Security middleware (allow cross-origin resource loading for static posters)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const postersDir = path.join(__dirname, "uploads", "posters");
fs.mkdirSync(postersDir, { recursive: true });
app.use(
  "/uploads/posters",
  express.static(postersDir, {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader(
        "Access-Control-Allow-Origin",
        process.env.CLIENT_URL || "http://localhost:5173"
      );
    },
  })
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "CCIS Ticketing System API is running",
    timestamp: new Date().toISOString(),
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
