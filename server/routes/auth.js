const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { auth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const authController = require("../controllers/authController");

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV !== "production" ? 50 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts, please try again later.",
  },
});

// Validation rules
const registerValidation = [
  body("name")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["admin", "staff", "student", "user"])
    .withMessage("Invalid role"),
  body("studentId")
    .optional()
    .isLength({ min: 4 })
    .withMessage("Student ID must be at least 4 characters"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post(
  "/register",
  authLimiter,
  registerValidation,
  asyncHandler(authController.register)
);
router.post(
  "/login",
  authLimiter,
  loginValidation,
  asyncHandler(authController.login)
);
router.get("/me", auth, asyncHandler(authController.getMe));

router.put(
  "/profile",
  auth,
  [
    body("name")
      .optional()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("phone")
      .optional()
      .isMobilePhone()
      .withMessage("Please enter a valid phone number"),
  ],
  asyncHandler(authController.updateProfile)
);

router.post(
  "/change-password",
  auth,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  asyncHandler(authController.changePassword)
);

module.exports = router;
