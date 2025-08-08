const nodemailer = require("nodemailer");

// Create email transporter (fixed: use createTransport)
const createTransporter = () => {
  try {
    if (process.env.NODE_ENV === "development") {
      // Ethereal test account (static placeholders will fail). If no creds provided, just skip sending.
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn(
          "[Email] Missing EMAIL_USER/EMAIL_PASS in development. Emails will be logged only."
        );
        return {
          sendMail: async (opts) => {
            console.log("[Email:DEV-LOG] Simulated send:", {
              to: opts.to,
              subject: opts.subject,
            });
            return { messageId: "dev-log", preview: null };
          },
        };
      }
    }

    if (
      !process.env.EMAIL_HOST ||
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS
    ) {
      const missing = [];
      if (!process.env.EMAIL_HOST) missing.push("EMAIL_HOST");
      if (!process.env.EMAIL_USER) missing.push("EMAIL_USER");
      if (!process.env.EMAIL_PASS) missing.push("EMAIL_PASS");
      console.warn(
        `[Email] Incomplete email configuration. Missing: ${missing.join(
          ", "
        )}. Skipping real send.`
      );
      return {
        sendMail: async (opts) => {
          console.log("[Email:SKIP] Missing config. Would have sent:", {
            to: opts.to,
            subject: opts.subject,
          });
          return { messageId: "skip", preview: null };
        },
      };
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_SECURE === "true" || false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } catch (err) {
    console.error("[Email] Transporter creation failed:", err);
    return {
      sendMail: async (opts) => {
        console.log(
          "[Email:FALLBACK] Transport creation failed. Would have sent:",
          {
            to: opts.to,
            subject: opts.subject,
          }
        );
        return { messageId: "fallback", preview: null };
      },
    };
  }
};

const sendTicketEmail = async ({
  to,
  userName,
  reservation,
  event,
  seat,
  qrCode,
}) => {
  try {
    const transporter = createTransporter();

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
    <html>
    <head>
        <meta charset="utf-8">
        <title>CCIS Ticket Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; }
            .content { padding: 30px; }
            .ticket-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .info-label { font-weight: bold; color: #333; }
            .info-value { color: #666; }
            .qr-section { text-align: center; margin: 30px 0; }
            .qr-section img { border: 2px solid #ddd; border-radius: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .important { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; }
            .gold { color: #D4AF37; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎭 CCIS Ticketing System</h1>
                <p>College of Computing Information Sciences</p>
            </div>
            
            <div class="content">
                <h2>Hello ${userName}!</h2>
                <p>Your ticket reservation has been confirmed. Here are your event details:</p>
                
                <div class="ticket-info">
                    <h3 style="margin-top: 0; color: #1a1a2e;">🎫 Ticket Information</h3>
                    <div class="info-row">
                        <span class="info-label">Reservation Code:</span>
                        <span class="info-value gold">${
                          reservation.reservationCode
                        }</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Event:</span>
                        <span class="info-value">${event.title}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date & Time:</span>
                        <span class="info-value">${eventDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Venue:</span>
                        <span class="info-value">${event.venue}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Seat:</span>
                        <span class="info-value">${seatInfo} ${
      seat.isVip ? "(VIP)" : ""
    }</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Amount:</span>
                        <span class="info-value">₱${parseFloat(
                          reservation.totalAmount
                        ).toFixed(2)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="info-value" style="color: #28a745; font-weight: bold;">${reservation.status.toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="qr-section">
                    <h3>📱 Your Digital Ticket</h3>
                    <p>Present this QR code at the venue for entry:</p>
                    <img src="${qrCode}" alt="QR Code" style="max-width: 200px;" />
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">
                        QR Code: ${reservation.reservationCode}
                    </p>
                </div>
                
                <div class="important">
                    <h4 style="margin-top: 0;">📋 Important Reminders:</h4>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Please arrive at least 30 minutes before the event starts</li>
                        <li>Bring a valid ID for verification</li>
                        <li>Screenshots of this QR code are acceptable</li>
                        <li>This ticket is non-transferable and non-refundable</li>
                        <li>Lost tickets cannot be replaced</li>
                    </ul>
                </div>
                
                <p>We look forward to seeing you at <strong>${
                  event.title
                }</strong>!</p>
                
                <p style="margin-top: 30px;">
                    Best regards,<br>
                    <strong>CCIS Ticketing Team</strong><br>
                    College of Computing Information Sciences
                </p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>For support, contact us at support@ccis.edu.ph</p>
                <p>&copy; 2025 College of Computing Information Sciences</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from:
        process.env.EMAIL_FROM || "CCIS Ticketing System <noreply@ccis.edu.ph>",
      to,
      subject: `🎭 Ticket Confirmation - ${event.title} | ${reservation.reservationCode}`,
      html: emailHTML,
      attachments: [
        {
          filename: `ticket-${reservation.reservationCode}.png`,
          content: qrCode.split("base64,")[1],
          encoding: "base64",
          cid: "qrcode",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === "development") {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

const sendNotificationEmail = async ({ to, subject, message, userName }) => {
  try {
    const transporter = createTransporter();

    const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎭 CCIS Ticketing System</h1>
            </div>
            <div class="content">
                <h2>Hello ${userName}!</h2>
                <div>${message}</div>
                <p style="margin-top: 30px;">
                    Best regards,<br>
                    <strong>CCIS Team</strong>
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2025 College of Computing Information Sciences</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from:
        process.env.EMAIL_FROM || "CCIS Ticketing System <noreply@ccis.edu.ph>",
      to,
      subject,
      html: emailHTML,
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Notification email error:", error);
    throw error;
  }
};

module.exports = {
  sendTicketEmail,
  sendNotificationEmail,
};
