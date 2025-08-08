require("dotenv").config();
const { User } = require("../models");
(async () => {
  const admin = await User.findOne({
    where: { email: "admin@upat.local" },
    paranoid: false,
  });
  if (!admin) {
    await User.create({
      name: "Admin",
      email: "admin@upat.local",
      password: "Admin123!",
      role: "admin",
    });
    console.log("Admin created: admin@upat.local / Admin123!");
  } else {
    console.log("Admin exists");
  }
  process.exit(0);
})();
