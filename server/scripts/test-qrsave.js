const QRCode = require("qrcode");
const { saveQrToFile } = require("../utils/qr");

(async () => {
  try {
    const payload = { test: "qrsave", t: Date.now() };
    const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
      width: 120,
    });
    const saved = await saveQrToFile(dataUrl, "smoke-test");
    console.log("saveQrToFile returned:", saved);
    process.exit(0);
  } catch (err) {
    console.error("test-qrsave failed:", err?.message || err);
    process.exit(1);
  }
})();
