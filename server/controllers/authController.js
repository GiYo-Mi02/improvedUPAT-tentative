const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { success, error } = require("../utils/apiResponse");

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { name, email, password, role = "user", studentId, phone } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser)
      return error(res, "User already exists with this email", 400);

    if (studentId) {
      const existingStudentId = await User.findOne({ where: { studentId } });
      if (existingStudentId)
        return error(res, "Student ID is already registered", 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      studentId,
      phone,
    });
    const token = generateToken(user.id);

    return success(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
        },
      },
      "User registered successfully",
      201
    );
  } catch (err) {
    return next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return error(res, "Invalid credentials", 400);
    if (!user.isActive) return error(res, "Account is deactivated", 400);

    const isMatch = await user.checkPassword(password);
    if (!isMatch) return error(res, "Invalid credentials", 400);

    await user.update({ lastLogin: new Date() });
    const token = generateToken(user.id);

    return success(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
        },
      },
      "Login successful"
    );
  } catch (err) {
    return next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    return success(res, { user: req.user });
  } catch (err) {
    return next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const { name, phone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    await req.user.update(updateData);

    return success(res, { user: req.user }, "Profile updated successfully");
  } catch (err) {
    return next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    const isMatch = await user.checkPassword(currentPassword);
    if (!isMatch) return error(res, "Current password is incorrect", 400);

    await user.update({ password: newPassword });
    return success(res, {}, "Password changed successfully");
  } catch (err) {
    return next(err);
  }
};
