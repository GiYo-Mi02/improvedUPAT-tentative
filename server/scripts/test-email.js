require("dotenv").config();
const { sendNotificationEmail } = require("../utils/emailService");

async function main() {
  const to =
    process.env.TEST_EMAIL_TO || process.env.EMAIL_USER || "test@example.com";
  console.log("Sending test email to:", to);
  try {
    const info = await sendNotificationEmail({
      to,
      subject: "CCIS Ticketing - Email Test",
      message:
        "<p>If you can read this, SMTP is configured. In development without credentials, check the Ethereal preview link printed in the server console.</p>",
      userName: "Tester",
    });
    console.log("Message sent:", info.messageId);
  } catch (e) {
    console.error("Test email failed:", e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();
