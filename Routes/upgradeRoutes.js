const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // ✅ Import the fixed MySQL connection

const router = express.Router();
// POST /api/admin/upgrade-plan
router.post('/admin/upgrade-plan', async (req, res) => {
  const { user_id, plan_id } = req.body;

  try {
    // ✅ Step 1: Get sponsor_id of this user
    const [result] = await db.query(
      "SELECT sponsor_id FROM UserPlans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [user_id] // ✅ This is correct now
    );

    if (!result.length) {
      return res.status(400).json({ error: "Sponsor not found for user" });
    }

    const sponsor_id = result[0].sponsor_id;

    // ✅ Step 2: Call procedure with correct sponsor_id
    await db.query("CALL AssignUserToTree(?, ?, ?)", [user_id, sponsor_id, plan_id]);

    res.json({ message: "Plan upgraded successfully using procedure!" });

  } catch (err) {
    console.error("Procedure Error:", err);
    res.status(500).json({ error: "Failed to upgrade plan using procedure" });
  }
});

  
  
  // GET all users
  router.get("/", async (req, res) => {
    try {
      const [rows] = await db.promise().query("SELECT * FROM users");
      res.json(rows);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  module.exports = router;

