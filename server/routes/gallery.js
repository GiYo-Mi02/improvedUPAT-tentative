const express = require("express");
const { body, validationResult } = require("express-validator");
const path = require("path");
const multer = require("multer");
const { auth, authorize } = require("../middleware/auth");
const { GalleryItem } = require("../models");

const router = express.Router();

// Public: list active gallery items
router.get("/", async (req, res) => {
  try {
    const items = await GalleryItem.findAll({
      where: { isActive: true },
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: "Failed to load gallery" });
  }
});

// Admin: upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "..", "uploads", "gallery")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `gallery_${Date.now()}${ext}`);
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

// Admin guard for routes below
router.use(auth);
router.use(authorize("admin", "staff"));

// Admin: list all items (active + inactive)
router.get("/admin", async (req, res) => {
  try {
    const items = await GalleryItem.findAll({
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: "Failed to load gallery (admin)" });
  }
});

// Create item
router.post(
  "/",
  upload.single("image"),
  [
    body("title").isLength({ min: 1 }).withMessage("Title is required"),
    body("description").optional().isLength({ max: 5000 }),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    try {
      if (!req.file)
        return res.status(400).json({ message: "Image is required" });
      const item = await GalleryItem.create({
        title: req.body.title,
        description: req.body.description || "",
        sortOrder: parseInt(req.body.sortOrder || "0"),
        imagePath: `/uploads/gallery/${req.file.filename}`,
        isActive: true,
      });
      res.status(201).json({ item });
    } catch (e) {
      console.error("Create gallery error:", e);
      res.status(500).json({ message: "Failed to create item" });
    }
  }
);

// Update item
router.put(
  "/:id",
  upload.single("image"),
  [
    body("title").optional().isLength({ min: 1 }),
    body("description").optional().isLength({ max: 5000 }),
    body("isActive").optional().isBoolean(),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    try {
      const item = await GalleryItem.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Not found" });
      const updates = { ...req.body };
      if (typeof updates.isActive !== "undefined") {
        updates.isActive =
          updates.isActive === true || updates.isActive === "true";
      }
      if (req.file) updates.imagePath = `/uploads/gallery/${req.file.filename}`;
      if (updates.sortOrder) updates.sortOrder = parseInt(updates.sortOrder);
      await item.update(updates);
      res.json({ item });
    } catch (e) {
      console.error("Update gallery error:", e);
      res.status(500).json({ message: "Failed to update item" });
    }
  }
);

// Delete item
router.delete("/:id", async (req, res) => {
  try {
    const item = await GalleryItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    await item.destroy();
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ message: "Failed to delete item" });
  }
});

module.exports = router;
