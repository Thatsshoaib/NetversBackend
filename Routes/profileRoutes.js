const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../Config/db");
const fs = require("fs");

const router = express.Router();

// Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: "aadhaar_front", maxCount: 1 },
  { name: "aadhaar_back", maxCount: 1 },
  { name: "bank_passbook", maxCount: 1 },
]);

// Convert to base64
function toBase64(filePath) {
  if (!filePath) return null;
  try {
    const fullPath = path.join(__dirname, "..", "uploads", filePath);
    return fs.readFileSync(fullPath, { encoding: "base64" });
  } catch (e) {
    console.error("❌ File read failed:", filePath);
    return null;
  }
}

router.post("/profile-details", (req, res, next) => {
  uploadFields(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("❌ Multer error:", err);
      return res.status(400).json({ error: "File upload error", details: err.message });
    } else if (err) {
      console.error("❌ Unknown upload error:", err);
      return res.status(500).json({ error: "Unknown error during upload" });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log("📥 Body:", req.body);
    console.log("📸 Files:", req.files);

    const {
      user_id,
      address_line1,
      city,
      state,
      pincode,
      country,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
    } = req.body;

    const aadhaar_front_file = req.files?.aadhaar_front?.[0]?.filename || null;
    const aadhaar_back_file = req.files?.aadhaar_back?.[0]?.filename || null;
    const bank_passbook_file = req.files?.bank_passbook?.[0]?.filename || null;

    const aadhaar_front = toBase64(aadhaar_front_file);
    const aadhaar_back = toBase64(aadhaar_back_file);
    const bank_passbook = toBase64(bank_passbook_file);

    // Check if profile already exists
    const [existing] = await db.query("SELECT * FROM user_profiles WHERE user_id = ?", [user_id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Profile already exists" });
    }

    await db.query(
      `INSERT INTO user_profiles (
        user_id, address_line1, city, state, pincode, country,
        bank_name, account_holder_name, account_number, ifsc_code,
        aadhaar_front, aadhaar_back, bank_passbook
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        address_line1,
        city,
        state,
        pincode,
        country,
        bank_name,
        account_holder_name,
        account_number,
        ifsc_code,
        aadhaar_front,
        aadhaar_back,
        bank_passbook,
      ]
    );

    return res.status(201).json({ message: "✅ Profile created successfully" });
  } catch (error) {
    console.error("🔥 Internal server error:", error);
    return res.status(500).json({ error: "Server error while creating profile" });
  }
});


router.get("/all-user-images", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
  up.user_id,
  up.address_line1,
  up.bank_name,
  up.account_holder_name,
  up.account_number,
  up.aadhaar_front,
  up.aadhaar_back,
  up.bank_passbook,
  u.name,
  u.U_code
FROM user_profiles up
JOIN users u ON up.user_id = u.user_id
WHERE up.status = 'pending';
`
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching all user images:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/profile/update-status/:userId
router.put('/update-status/:userId', async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body; // "Approved" or "Rejected"

  try {
    await db.query(
      'UPDATE user_profiles SET status = ? WHERE user_id = ?',
      [status, userId]
    );
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});



// GET route - get status by user_id
router.get('/status/:user_id', async (req, res) => {
  const userId = req.params.user_id;

  const sql = `SELECT status FROM user_profiles WHERE user_id = ?`;

  try {
    const [results] = await db.execute(sql, [userId]);

    console.log("DB results for user_id", userId, ":", results);

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ status: results[0].status });
  } catch (err) {
    console.error("Error fetching user status:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.get("/details/:user_id", async (req, res) => {
  const userId = req.params.user_id;

  try {
    const [rows] = await db.query(
      `SELECT user_id, address_line1, city, state, pincode, country, 
              bank_name, account_holder_name, account_number, ifsc_code
       FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
