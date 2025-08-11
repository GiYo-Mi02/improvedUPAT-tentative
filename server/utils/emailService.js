const nodemailer = require("nodemailer");

// Create email transporter (async to allow Ethereal in dev)
const createTransporter = async () => {
  try {
    const isDev = process.env.NODE_ENV !== "production";

    // Dev fallback: Ethereal if no creds
    if (isDev && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      console.warn(
        "[Email] No EMAIL_USER/EMAIL_PASS found in development. Using Ethereal test SMTP."
      );
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      transporter.__isEthereal = true;
      return transporter;
    }

    // No-op if incomplete config
    if (
      !process.env.EMAIL_HOST ||
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS
    ) {
      console.warn(
        "[Email] Incomplete email configuration. Skipping real send."
      );
      return {
        __isNoop: true,
        sendMail: async (opts) => {
          console.log("[Email:SKIP] Missing config. Would have sent:", {
            to: opts.to,
            subject: opts.subject,
          });
          return { messageId: "skip", preview: null };
        },
      };
    }

    // Gmail convenience
    const isGmail =
      (process.env.EMAIL_SERVICE || "").toLowerCase() === "gmail" ||
      (process.env.EMAIL_HOST || "").includes("smtp.gmail.com");
    if (isGmail) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
    }

    // Generic SMTP
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === "true" || false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  } catch (err) {
    console.error("[Email] Transporter creation failed:", err);
    return {
      __isError: true,
      sendMail: async (opts) => {
        console.log(
          "[Email:FALLBACK] Transport creation failed. Would have sent:",
          { to: opts.to, subject: opts.subject }
        );
        return { messageId: "fallback", preview: null };
      },
    };
  }
};

// Polished, brand-aligned ticket email
const sendTicketEmail = async ({
  to,
  userName,
  reservation,
  event,
  seat,
  qrCode,
}) => {
  try {
    const transporter = await createTransporter();

    const seatInfo = `${seat.section.toUpperCase()}-${seat.row}${seat.number}`;
    const eventDate = new Date(event.eventDate).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UPAT Ticket Confirmation</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@400;600;700&display=swap" />
  <style>
    .gold{color:#d4af37}.champagne{color:#f7e7ce}
    body{margin:0;padding:24px;background:#0b0f19;font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a}
    .wrapper{max-width:640px;margin:0 auto}
    .card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.25);border:1px solid rgba(212,175,55,.2)}
    .header{padding:28px 28px 18px;background:linear-gradient(135deg,#0b0f19,#101827);color:#f3f4f6;position:relative}
    .header:after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,#d4af37,#e3c766,#d4af37)}
  h1{margin:0;font-size:22px;letter-spacing:.5px;font-weight:700;font-family:'Marcellus',serif}
    .sub{margin:6px 0 0;font-size:13px;color:#cbd5e1}
    .content{padding:24px 28px 8px}
    .greeting{font-size:16px;color:#0f172a;margin:0 0 14px}
    .lead{margin:0 0 18px;color:#334155;font-size:14px}
    .ticket{border:1px dashed rgba(212,175,55,.6);border-radius:12px;padding:16px;background:linear-gradient(180deg,#fff,#fff9f0)}
  .section-title{font-size:13px;text-transform:uppercase;letter-spacing:1.2px;color:#6b7280;margin:0 0 10px;font-family:'Marcellus',serif}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .row:last-child{border-bottom:0}
    .label{color:#475569;font-weight:600;font-size:13px}
    .value{color:#0f172a;font-weight:600}
    .value.success{color:#16a34a;font-weight:700}
    .qr{text-align:center;padding:18px 0 4px}
    .qr .frame{display:inline-block;padding:10px;border:1px solid rgba(212,175,55,.5);border-radius:12px;background:#fff}
    .qr img{display:block;max-width:200px;height:auto}
    .qr small{display:block;margin-top:8px;color:#64748b}
    .note{background:#0b0f19;color:#e5e7eb;border-radius:10px;padding:14px 16px;margin:18px 0 8px;border:1px solid rgba(212,175,55,.25)}
    .note ul{margin:8px 0 0 18px;padding:0}
    .note li{margin:6px 0}
    .signoff{margin:18px 0 24px;color:#334155;font-size:14px}
    .footer{background:#f8fafc;padding:16px 20px;color:#64748b;font-size:12px;text-align:center;border-top:1px solid #e2e8f0}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1><span class="gold">UPAT</span> Ticket Confirmation</h1>
        <p class="sub">University of Makati • Performing Arts & Theater</p>
      </div>
      <div class="content">
        <p class="greeting">Hello ${userName},</p>
        <p class="lead">Your reservation has been confirmed. Below are your ticket details.</p>

        <div class="ticket">
          <p class="section-title">Ticket Details</p>
          <div class="row"><span class="label">Reservation Code: </span><span class="value gold">${
            reservation.reservationCode
          }</span></div>
          <div class="row"><span class="label">Event: </span><span class="value">${
            event.title
          }</span></div>
          <div class="row"><span class="label">Date & Time: </span><span class="value">${eventDate}</span></div>
          <div class="row"><span class="label">Venue: </span><span class="value">${
            event.venue
          }</span></div>
          <div class="row"><span class="label">Seat: </span><span class="value">${seatInfo} ${
      seat.isVip ? "(VIP)" : ""
    }</span></div>
          <div class="row"><span class="label">Status: </span><span class="value success">${reservation.status.toUpperCase()}</span></div>
        </div>

        <div class="qr">
          <div class="frame">
            <img src="${qrCode}" alt="QR Code" />
          </div>
          <small>Show this code at the entrance • ${
            reservation.reservationCode
          }</small>
        </div>

        <div class="note">
          <strong class="champagne">Before you go</strong>
          <ul>
            <li>Please arrive at least 30 minutes before the event starts.</li>
            <li>Bring a valid ID for verification.</li>
            <li>Screenshots of this QR code are accepted.</li>
            <li>Tickets are non-transferable and non-refundable.</li>
          </ul>
        </div>

        <p class="signoff">See you at <strong>${
          event.title
        }</strong>!<br/>— UPAT Ticketing Team</p>
      </div>
      <div class="footer">
        <p>This is an automated message. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} University of Makati • Performing Arts & Theater</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Attach QR image only if a valid data URL is provided
    const attachments = [];
    if (qrCode && typeof qrCode === "string" && qrCode.includes("base64,")) {
      attachments.push({
        filename: `ticket-${reservation.reservationCode}.png`,
        content: qrCode.split("base64,")[1],
        encoding: "base64",
        cid: "qrcode",
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || "UPAT Ticketing <noreply@upat.edu.ph>",
      to,
      subject: `🎭 Ticket Confirmation - ${event.title} | ${reservation.reservationCode}`,
      html: emailHTML,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    if (transporter.__isEthereal) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log("[Email] Ethereal preview:", url);
    }

    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

const sendNotificationEmail = async ({ to, subject, message, userName }) => {
  try {
    const transporter = await createTransporter();

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;margin:0;padding:20px;background:#0b0f19}
    .card{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid rgba(212,175,55,.2)}
    .header{padding:22px 24px;background:linear-gradient(135deg,#0b0f19,#101827);color:#f3f4f6}
    .content{padding:24px}
    .footer{background:#f8fafc;padding:14px 20px;color:#64748b;font-size:12px;text-align:center;border-top:1px solid #e2e8f0}
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><h2 style="margin:0;font-size:18px"><span style="color:#d4af37">UPAT</span> Notification</h2></div>
    <div class="content">
      <p style="margin:0 0 10px">Hello ${userName},</p>
      <div>${message}</div>
      <p style="margin-top:18px">— UPAT Team</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} University of Makati • Performing Arts & Theater</div>
  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "UPAT Ticketing <noreply@upat.edu.ph>",
      to,
      subject,
      html: emailHTML,
    });

    if (transporter.__isEthereal) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log("[Email] Ethereal preview:", url);
    }

    return info;
  } catch (error) {
    console.error("Notification email error:", error);
    throw error;
  }
};

module.exports = {
  sendTicketEmail,
  sendNotificationEmail,
};
