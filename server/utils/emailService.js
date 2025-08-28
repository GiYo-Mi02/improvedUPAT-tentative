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

const resolveMode = (transporter) => {
  if (!transporter) return "error";
  if (transporter.__isEthereal) return "ethereal";
  if (transporter.__isNoop) return "disabled";
  if (transporter.__isError) return "error";
  return "real";
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

    // Prepare inline QR via CID (preferred for email clients)
    let attachments = [];
    let qrImgTag = "";
    const provided =
      typeof qrCode === "string" && qrCode.trim().length > 0
        ? qrCode.trim()
        : reservation?.qrCode || "";

    if (provided && typeof provided === "string") {
      // If a data URL, convert to CID attachment for better compatibility
      if (provided.startsWith("data:image")) {
        const match = provided.match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        );
        if (match) {
          const mime = match[1] || "image/png";
          const b64 = match[2];
          const ext = mime.split("/")[1] || "png";
          const cid = `qrcode-${reservation.reservationCode}@ccis`;
          attachments.push({
            filename: `ticket-${reservation.reservationCode}.${ext}`,
            content: b64,
            encoding: "base64",
            cid,
            contentType: mime,
          });
          qrImgTag = `<img src="cid:${cid}" alt="QR Code" />`;
        } else {
          // Fallback to direct data URL if parsing fails
          qrImgTag = `<img src="${provided}" alt="QR Code" />`;
        }
      } else if (/^https?:\/\//i.test(provided)) {
        // URL case: let client fetch (some clients block remote images)
        qrImgTag = `<img src="${provided}" alt="QR Code" />`;
      } else if (provided.includes("base64,")) {
        // Raw base64 with prefix somewhere
        const b64 = provided.split("base64,")[1];
        const cid = `qrcode-${reservation.reservationCode}@ccis`;
        attachments.push({
          filename: `ticket-${reservation.reservationCode}.png`,
          content: b64,
          encoding: "base64",
          cid,
          contentType: "image/png",
        });
        qrImgTag = `<img src="cid:${cid}" alt="QR Code" />`;
      }
    }

    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CCIS Ticket Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* Enhanced brand palette */
    :root { 
      --deep:#0b0f19; 
      --night:#101827; 
      --gold:#d4af37; 
      --champagne:#f7e7ce; 
      --ink:#0f172a; 
      --muted:#64748b;
      --gold-light:#e8d394;
      --luxury-shadow:0 20px 50px rgba(11,15,25,0.15);
    }
    
    body{
      margin:0;
      background:linear-gradient(135deg, #0b0f19 0%, #1a1f2e 100%);
      -webkit-text-size-adjust:100%;
      font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
    }
    
    .outer{
      width:100%;
      background:linear-gradient(135deg, #0b0f19 0%, #1a1f2e 100%);
      padding:32px 12px;
      min-height:100vh;
    }
    
    .container{
      max-width:700px;
      margin:0 auto;
      background:#ffffff;
      border-radius:20px;
      overflow:hidden;
      border:1px solid rgba(212,175,55,.3);
      box-shadow:var(--luxury-shadow);
      position:relative;
    }
    
    .container::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      height:4px;
      background:linear-gradient(90deg, var(--gold) 0%, var(--gold-light) 50%, var(--gold) 100%);
      z-index:10;
    }
    
    .hdr{
      background:linear-gradient(135deg, var(--deep) 0%, var(--night) 100%);
      padding:36px 32px 28px;
      color:#000000;
      text-align:center;
      position:relative;
      overflow:hidden;
    }
    
    .hdr::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      bottom:0;
      background:radial-gradient(circle at top right, rgba(212,175,55,0.1) 0%, transparent 50%);
      pointer-events:none;
    }
    
    h1{
      margin:0;
      font-family:'Marcellus',serif;
      font-size:28px;
      font-weight:400;
      letter-spacing:.6px;
      text-shadow:0 2px 4px rgba(0,0,0,0.2);
    }
    
    .sub{
      margin:8px 0 0;
      font-family:'Inter',sans-serif;
      font-size:14px;
      font-weight:300;
      color:#cbd5e1;
      letter-spacing:.3px;
    }
    
    .content{
      padding:28px 32px 16px;
      font-family:'Inter',sans-serif;
      color:#1f2937;
      line-height:1.6;
    }
    
    .hello{
      margin:0 0 12px;
      font-size:18px;
      font-weight:500;
      color:#111827;
    }
    
    .lead{
      margin:0 0 24px;
      color:#374151;
      font-size:15px;
      font-weight:400;
    }
    
    .ticket{
      border:2px solid rgba(212,175,55,.4);
      border-radius:16px;
      padding:0;
      margin:0 0 24px;
      background:linear-gradient(145deg, #ffffff 0%, #fefdf8 100%);
      box-shadow:0 8px 25px rgba(212,175,55,0.08);
      overflow:hidden;
    }
    
    .sec{
      padding:24px;
    }
    
    .sectitle{
      margin:0 0 16px;
      text-transform:uppercase;
      letter-spacing:1.5px;
      color:var(--gold);
      font-size:13px;
      font-family:'Marcellus',serif;
      font-weight:400;
      text-align:center;
      position:relative;
    }
    
    .sectitle::after{
      content:'';
      position:absolute;
      bottom:-8px;
      left:50%;
      transform:translateX(-50%);
      width:40px;
      height:1px;
      background:var(--gold);
    }
    
    .row{
      display:flex;
      justify-content:space-between;
      align-items:center;
      border-top:1px solid #f1f5f9;
      padding:14px 0;
    }
    
    .row:first-of-type{
      border-top:0;
      margin-top:8px;
    }
    
    .label{
      color:#4b5563;
      font-weight:500;
      font-size:14px;
    }
    
    .value{
      color:#111827;
      font-weight:600;
      font-size:14px;
      text-align:right;
    }
    
    .value.gold{
      color:var(--gold);
      font-weight:700;
    }
    
    .pill{
      display:inline-block;
      padding:4px 12px;
      border-radius:20px;
      background:linear-gradient(135deg, #10b981 0%, #059669 100%);
      color:#ffffff;
      font-weight:600;
      font-size:12px;
      text-transform:uppercase;
      letter-spacing:.5px;
      box-shadow:0 2px 4px rgba(16,185,129,0.3);
    }
    
    .qrwrap{
      text-align:center;
      padding:24px;
      background:linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
      border-top:1px solid #e2e8f0;
    }
    
    .qrframe{
      display:inline-block;
      padding:16px;
      border:2px solid var(--gold);
      border-radius:16px;
      background:#ffffff;
      box-shadow:0 8px 20px rgba(212,175,55,0.15);
      position:relative;
    }
    
    .qrframe::before{
      content:'';
      position:absolute;
      top:-2px;
      left:-2px;
      right:-2px;
      bottom:-2px;
      background:linear-gradient(45deg, var(--gold) 0%, var(--gold-light) 100%);
      border-radius:16px;
      z-index:-1;
    }
    
    .qrframe img{
      display:block;
      max-width:200px;
      height:auto;
      border-radius:8px;
    }
    
    .qrnote{
      display:block;
      margin-top:12px;
      color:#4b5563;
      font-size:13px;
      font-weight:500;
    }
    
    .note{
      margin:24px 0 16px;
      background:linear-gradient(135deg, var(--deep) 0%, var(--night) 100%);
      color:#000000;
      border:1px solid rgba(212,175,55,.3);
      border-radius:12px;
      padding:20px 24px;
      position:relative;
    }
    
    .note::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      width:4px;
      height:100%;
      background:var(--gold);
      border-radius:2px 0 0 2px;
    }
    
    .note strong{
      color:var(--champagne);
      font-weight:600;
      font-size:15px;
    }
    
    .note ul{
      margin:12px 0 0 20px;
      padding:0;
    }
    
    .note li{
      margin:8px 0;
      font-size:14px;
      line-height:1.5;
    }
    
    .sign{
      margin:24px 0 32px;
      color:#1f2937;
      font-size:15px;
      text-align:center;
      line-height:1.6;
    }
    
    .ftr{
      background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color:#4b5563;
      font-size:13px;
      text-align:center;
      border-top:1px solid #e2e8f0;
      padding:20px 24px;
    }
    
    .ftr div{
      margin:4px 0;
    }
    
    .gold{color:var(--gold)} 
    .champagne{color:var(--champagne)}
    
    /* Enhanced responsiveness */
    @media (max-width:600px){ 
      .outer{padding:16px 8px}
      .content{padding:20px 16px} 
      .hdr{padding:24px 16px 20px}
      .qrframe img{max-width:160px}
      .sec{padding:16px}
      h1{font-size:24px}
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body,table,td{font-family:Inter,Arial,sans-serif !important}
    .container{border-radius:0 !important}
    .ticket{border-radius:0 !important}
  </style>
  <![endif]-->
  </head>
<body>
  <table class="outer" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table class="container" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td class="hdr">
              <h1><span class="gold">CCIS</span> Ticket Confirmation</h1>
              <div class="sub">University of Makati • College of Computer and Information Science</div>
            </td>
          </tr>
          <tr>
            <td class="content">
              <p class="hello">Hello ${userName},</p>
              <p class="lead">Your reservation has been confirmed. Below are your ticket details.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ticket">
                <tr>
                  <td class="sec">
                    <div class="sectitle">Ticket Details</div>
                    <div class="row">
                      <div class="label">Reservation Code: &nbsp; </div>
                      <div class="value gold"> ${
                        reservation.reservationCode
                      }</div>
                    </div>
                    <div class="row">
                      <div class="label">Event: &nbsp; </div>
                      <div class="value"> ${event.title}</div>
                    </div>
                    <div class="row">
                      <div class="label">Date & Time: &nbsp; </div>
                      <div class="value"> ${eventDate}</div>
                    </div>
                    <div class="row">
                      <div class="label">Venue: &nbsp; </div>
                      <div class="value"> ${event.venue}</div>
                    </div>
                    <div class="row">
                      <div class="label">Seat: &nbsp; </div>
                      <div class="value"> ${seatInfo} ${
      seat.isVip
        ? '<span style="color:var(--gold);font-weight:700">(VIP)</span>'
        : ""
    }</div>
                    </div>
                    <div class="row">
                      <div class="label">Status: &nbsp; </div>
                      <div class="value"><span class="pill">${reservation.status.toUpperCase()}</span></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="qrwrap">
                    <div class="qrframe">
                      ${
                        qrImgTag ||
                        '<div style="color:#4b5563;font-size:14px;padding:20px">QR code will be generated shortly</div>'
                      }
                    </div>
                    <small class="qrnote">Present this QR code at the entrance<br/><strong style="color:#111827">${
                      reservation.reservationCode
                    }</strong></small>
                  </td>
                </tr>
              </table>

              <div class="note">
                <strong class="champagne">Important Information</strong>
                <ul>
                  <li><strong>Arrival:</strong> Please arrive at least 30 minutes before the event starts</li>
                  <li><strong>ID Required:</strong> Bring a valid government-issued ID for verification</li>
                  <li><strong>Digital Tickets:</strong> Screenshots of this QR code are accepted</li>
                  <li><strong>Policy:</strong> Tickets are non-transferable and non-refundable</li>
                </ul>
              </div>

              <p class="sign">We look forward to seeing you at <strong>${
                event.title
              }</strong>!<br/><br/>— CCIS Ticketing Team</p>
            </td>
          </tr>
          <tr>
            <td class="ftr">
              <div>This is an automated message. Please do not reply to this email.</div>
              <div>&copy; ${new Date().getFullYear()} University of Makati • College of Computer and Information Science</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const forcedTo =
      process.env.EMAIL_ALWAYS_TO &&
      process.env.EMAIL_ALWAYS_TO.trim().length > 0
        ? process.env.EMAIL_ALWAYS_TO.trim()
        : null;
    const mailOptions = {
      from: process.env.EMAIL_FROM || "CCIS Ticketing <noreply@ccis.edu.ph>",
      to: forcedTo || to,
      subject: `🎭 Ticket Confirmation - ${event.title} | ${reservation.reservationCode}`,
      html: emailHTML,
      attachments,
      ...(process.env.EMAIL_BCC && process.env.EMAIL_BCC.trim().length > 0
        ? { bcc: process.env.EMAIL_BCC.trim() }
        : {}),
    };

    const info = await transporter.sendMail(mailOptions);

    const mode = resolveMode(transporter);
    if (mode === "ethereal") {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log("[Email] Ethereal preview:", url);
      return { ...info, previewUrl: url || null, mode };
    }

    return { ...info, previewUrl: null, mode };
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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { 
      --deep:#0b0f19; 
      --night:#101827; 
      --gold:#d4af37; 
      --luxury-shadow:0 20px 50px rgba(11,15,25,0.15);
    }
    body{
      margin:0;
      background:linear-gradient(135deg, #0b0f19 0%, #1a1f2e 100%);
      font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
    }
    .outer{
      width:100%;
      padding:24px 12px;
    }
    .box{
      max-width:700px;
      margin:0 auto;
      background:#fff;
      border-radius:16px;
      overflow:hidden;
      border:1px solid rgba(212,175,55,.3);
      box-shadow:var(--luxury-shadow);
      position:relative;
    }
    .box::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      height:3px;
      background:linear-gradient(90deg, var(--gold) 0%, #e8d394 50%, var(--gold) 100%);
      z-index:10;
    }
    .hdr{
      padding:28px 24px;
      background:linear-gradient(135deg, var(--deep) 0%, var(--night) 100%);
      color:#ffffff;
      text-align:center;
      position:relative;
    }
    .hdr::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      bottom:0;
      background:radial-gradient(circle at top right, rgba(212,175,55,0.1) 0%, transparent 50%);
      pointer-events:none;
    }
    .ttl{
      margin:0;
      font:600 22px 'Marcellus',serif;
      letter-spacing:.5px;
      text-shadow:0 2px 4px rgba(0,0,0,0.2);
    }
    .content{
      padding:24px;
      font:400 15px 'Inter',sans-serif;
      color:#1f2937;
      line-height:1.6;
    }
    .ftr{
      background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color:#4b5563;
      font-size:13px;
      text-align:center;
      border-top:1px solid #e2e8f0;
      padding:18px 24px;
    }
    @media (max-width:600px){ 
      .outer{padding:16px 8px}
      .content{padding:18px 16px} 
      .hdr{padding:20px 16px}
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body,table,td{font-family:Inter,Arial,sans-serif !important}
    .box{border-radius:0 !important}
  </style>
  <![endif]-->
  </head>
<body>
  <table class="outer" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table class="box" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td class="hdr">
              <h2 class="ttl"><span style="color:var(--gold)">CCIS</span> Notification</h2>
            </td>
          </tr>
          <tr>
            <td class="content">
              <p style="margin:0 0 12px;font-weight:500;color:#111827">Hello ${userName},</p>
              <div style="margin:12px 0;color:#1f2937">${message}</div>
              <p style="margin-top:20px;color:#4b5563">— CCIS Team</p>
            </td>
          </tr>
          <tr>
            <td class="ftr">
              &copy; ${new Date().getFullYear()} University of Makati • College of Computer and Information Science
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const forcedTo =
      process.env.EMAIL_ALWAYS_TO &&
      process.env.EMAIL_ALWAYS_TO.trim().length > 0
        ? process.env.EMAIL_ALWAYS_TO.trim()
        : null;
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "CCIS Ticketing <noreply@ccis.edu.ph>",
      to: forcedTo || to,
      subject,
      html: emailHTML,
      ...(process.env.EMAIL_BCC && process.env.EMAIL_BCC.trim().length > 0
        ? { bcc: process.env.EMAIL_BCC.trim() }
        : {}),
    });

    const mode = resolveMode(transporter);
    if (mode === "ethereal") {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log("[Email] Ethereal preview:", url);
      return { ...info, previewUrl: url || null, mode };
    }
    return { ...info, previewUrl: null, mode };
  } catch (error) {
    console.error("Notification email error:", error);
    throw error;
  }
};

const getEmailStatus = async () => {
  try {
    const t = await createTransporter();
    const mode = resolveMode(t);
    const using =
      (process.env.EMAIL_SERVICE && process.env.EMAIL_SERVICE.toLowerCase()) ||
      process.env.EMAIL_HOST ||
      (mode === "ethereal" ? "ethereal" : "unknown");
    return { mode, using };
  } catch (e) {
    return { mode: "error", using: "unknown" };
  }
};

module.exports = {
  sendTicketEmail,
  sendNotificationEmail,
  getEmailStatus,
};
