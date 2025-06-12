const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../Config/db");
const fs = require("fs");

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profiles");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + file.fieldname + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Helper to convert file to base64 string
const toBase64 = (fileName) => {
  if (!fileName) return null;
  
  const fullPath = path.join(__dirname, "..", "uploads", "profiles", fileName);
  const fileBuffer = fs.readFileSync(fullPath);
  return fileBuffer.toString("base64");
};

router.post(
  "/profile-details",
  upload.fields([
    { name: "aadhaar_front", maxCount: 1 },
    { name: "aadhaar_back", maxCount: 1 },
    { name: "bank_passbook", maxCount: 1 },
  ]),
  async (req, res) => {
     console.log("✅ Route hit");
    try {
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

      console.log("📥 Incoming form data:", req.body);
      console.log("📸 Incoming files:", req.files);

      const aadhaar_front_file = req.files?.aadhaar_front?.[0]?.filename || null;
      const aadhaar_back_file = req.files?.aadhaar_back?.[0]?.filename || null;
      const bank_passbook_file = req.files?.bank_passbook?.[0]?.filename || null;

      const aadhaar_front = aadhaar_front_file ? toBase64(aadhaar_front_file) : null;
      const aadhaar_back = aadhaar_back_file ? toBase64(aadhaar_back_file) : null;
      const bank_passbook = bank_passbook_file ? toBase64(bank_passbook_file) : null;

      // Check for existing profile
      const [existing] = await db.query(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [user_id]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: "Profile already exists" });
      }

      // Insert base64 strings into DB
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
      console.error("🔥 Server error in /profile-details route:", error.message);
      console.error("🧠 Stack trace:", error.stack);
      return res.status(500).json({ error: "Server error while creating profile" });
    }
  }
);



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
