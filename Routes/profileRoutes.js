// routes/bankDetails.js
const express = require("express");
const router = express.Router();
const db = require("../Config/db");

// POST /api/bank-details
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      date_of_birth,
      profile_image_url,
      bank_name,
      holder_name,
      account_number,
      ifsc,
      branch,
      bank_city,
      account_type,
      bank_status,
      address,
      landmark,
      country,
      state,
      city,
      pincode,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "Missing user_id in request body" });
    }

    const sql = `
      INSERT INTO user_profiles (
        user_id, date_of_birth, profile_image_url, bank_name, holder_name, account_number,
        ifsc, branch, bank_city, account_type, bank_status,
        address, landmark, country, state, city, pincode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      user_id,
      date_of_birth,
      profile_image_url,
      bank_name,
      holder_name,
      account_number,
      ifsc,
      branch,
      bank_city,
      account_type,
      bank_status,
      address,
      landmark,
      country,
      state,
      city,
      pincode,
    ];

    const [result] = await db.query(sql, values);

    res.status(200).json({
      message: "Bank details saved successfully",
      insertId: result.insertId,
    });
  } catch (error) {
    console.error("Insert Error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});

router.get("/:user_id", async (req, res) => {
    const userId = req.params.user_id;
  
    try {
      const [results] = await db.query("SELECT * FROM user_profiles WHERE user_id = ?", [userId]);
  
      if (results.length === 0) {
        return res.status(200).json({ data: null });
      }
  
      res.status(200).json({ data: results[0] });
    } catch (err) {
      console.error("Error fetching profile:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  

module.exports = router;
