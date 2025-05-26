

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the uploads/profiles folder exists
const uploadPath = "uploads/profiles";
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + file.fieldname + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

module.exports = upload;
