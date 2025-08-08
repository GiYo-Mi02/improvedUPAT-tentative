require("dotenv").config();
const { User } = require("../models");

async function createAdmin() {
  try {
    const adminEmail = "admin@upat.local";
    const adminPassword = "Admin123!";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      console.log("Admin user already exists:", adminEmail);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: "System Administrator",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      phone: "+63123456789",
    });

    console.log("✅ Admin user created successfully!");
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);
    console.log("Role:", admin.role);

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();
