const express = require("express");
const { body, validationResult } = require("express-validator");
const { Announcement } = require("../models");
const multer = require("multer");
const path = require("path");
const { auth, authorize, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Public: list active announcements
router.get("/", optionalAuth, async (req, res) => {
  try {
    const now = new Date();
    const items = await Announcement.findAll({
      where: {
        isActive: true,
      },
      order: [
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    const filtered = items.filter((a) => {
      const startsOk = !a.startsAt || a.startsAt <= now;
      const endsOk = !a.endsAt || a.endsAt >= now;
      return startsOk && endsOk;
    });

    res.json({ announcements: filtered });
  } catch (error) {
    console.error("List announcements error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching announcements" });
  }
});

// Admin: CRUD
router.get("/admin", auth, authorize("admin", "staff"), async (req, res) => {
  try {
    const items = await Announcement.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json({ announcements: items });
  } catch (error) {
    console.error("Get admin announcements error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching announcements" });
  }
});

// Upload config for announcement images
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "..", "uploads", "announcements")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `announcement_${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (/image\/(png|jpe?g|webp)/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type"), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

router.post(
  "/admin",
  auth,
  authorize("admin", "staff"),
  upload.single("image"),
  [
    body("title").isLength({ min: 2 }).withMessage("Title is required"),
    body("message").isLength({ min: 2 }).withMessage("Message is required"),
    body("isActive").optional().isBoolean(),
    body("priority").optional().isInt({ min: 0, max: 100 }),
    body("startsAt").optional().isISO8601(),
    body("endsAt").optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const payload = {
        title: req.body.title,
        message: req.body.message,
        isActive:
          typeof req.body.isActive === "undefined"
            ? true
            : req.body.isActive === "true" || req.body.isActive === true,
        priority: req.body.priority ? parseInt(req.body.priority) : 0,
        startsAt: req.body.startsAt || null,
        endsAt: req.body.endsAt || null,
      };
      if (req.file)
        payload.imagePath = `/uploads/announcements/${req.file.filename}`;
      const item = await Announcement.create(payload);
      res
        .status(201)
        .json({ message: "Announcement created", announcement: item });
    } catch (error) {
      console.error("Create announcement error:", error);
      res
        .status(500)
        .json({ message: "Server error while creating announcement" });
    }
  }
);

router.put(
  "/admin/:id",
  auth,
  authorize("admin", "staff"),
  upload.single("image"),
  [
    body("title").optional().isLength({ min: 2 }),
    body("message").optional().isLength({ min: 2 }),
    body("isActive").optional().isBoolean(),
    body("priority").optional().isInt({ min: 0, max: 100 }),
    body("startsAt").optional().isISO8601(),
    body("endsAt").optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const item = await Announcement.findByPk(req.params.id);
      if (!item)
        return res.status(404).json({ message: "Announcement not found" });
      const updates = { ...req.body };
      if (typeof updates.isActive !== "undefined") {
        updates.isActive =
          updates.isActive === true || updates.isActive === "true";
      }
      if (typeof updates.priority !== "undefined") {
        updates.priority = parseInt(updates.priority);
      }
      if (req.file)
        updates.imagePath = `/uploads/announcements/${req.file.filename}`;
      await item.update(updates);
      res.json({ message: "Announcement updated", announcement: item });
    } catch (error) {
      console.error("Update announcement error:", error);
      res
        .status(500)
        .json({ message: "Server error while updating announcement" });
    }
  }
);

router.delete(
  "/admin/:id",
  auth,
  authorize("admin", "staff"),
  async (req, res) => {
    try {
      const item = await Announcement.findByPk(req.params.id);
      if (!item)
        return res.status(404).json({ message: "Announcement not found" });
      await item.destroy();
      res.json({ message: "Announcement deleted" });
    } catch (error) {
      console.error("Delete announcement error:", error);
      res
        .status(500)
        .json({ message: "Server error while deleting announcement" });
    }
  }
);

module.exports = router;
