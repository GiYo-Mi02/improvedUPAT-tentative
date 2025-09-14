const fs = require("fs");
const path = require("path");

async function saveQrToFile(dataUrl, reservationCode) {
  try {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
    if (!m) return null;
    const mime = m[1];
    const b64 = m[2];
    const ext = (mime.split("/")[1] || "png").toLowerCase();
    // ensure path points to <workspace>/server/uploads/qrcodes
    const dir = path.join(process.cwd(), "uploads", "qrcodes");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `qr_${reservationCode}_${Date.now()}.${ext}`;
    const abs = path.join(dir, filename);
    fs.writeFileSync(abs, Buffer.from(b64, "base64"));
    return `/uploads/qrcodes/${filename}`;
  } catch (err) {
    console.warn("[QR] saveQrToFile failed", err?.message || err);
    return null;
  }
}

module.exports = { saveQrToFile };
