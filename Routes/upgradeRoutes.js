const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // ✅ Import the fixed MySQL connection

const router = express.Router();
// POST /api/admin/upgrade-plan
router.post('/admin/upgrade-plan', async (req, res) => {
  const { u_code, plan_id, epin_code, user_id } = req.body;

  try {
    // ✅ Step 1: Find user_id using u_code
    const [userResult] = await db.query(
      "SELECT user_id FROM users WHERE u_code = ?",
      [u_code]
    );

    if (!userResult.length) {
      return res.status(404).json({ error: "User not found for provided U-Code" });
    }

    const foundUserId = userResult[0].user_id;

    // ✅ Step 2: Check if the user is already enrolled in the specified plan
    const [userPlanResult] = await db.query(
      "SELECT * FROM userplans WHERE user_id = ? AND plan_id = ?",
      [foundUserId, plan_id]
    );

    if (userPlanResult.length) {
      return res.status(400).json({ error: "User is already enrolled in this plan" });
    }

    // ✅ Step 3: Check if the E-PIN is assigned to the user
    const [epinResult] = await db.query(
      "SELECT * FROM epins WHERE epin_code = ? AND assigned_to = ? AND status = 'unused'",  // Check if E-PIN exists and not yet used
      [epin_code, user_id]
    );

    if (!epinResult.length) {
      return res.status(400).json({ error: "E-PIN is either invalid, not assigned, or already used." });
    }

    // ✅ Step 4: Get sponsor_id from UserPlans
    const [sponsorResult] = await db.query(
      "SELECT sponsor_id FROM userplans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [foundUserId]
    );

    if (!sponsorResult.length) {
      return res.status(400).json({ error: "Sponsor not found for user" });
    }

    const sponsor_id = sponsorResult[0].sponsor_id;

    // ✅ Step 5: Call the stored procedure
    const [rows] = await db.query("CALL AssignUserToTree(?, ?, ?)", [foundUserId, sponsor_id, plan_id]);

    // ✅ Step 6: Mark the E-PIN as used and update used_by column with the current user's ID
    await db.query(
      "UPDATE epins SET status = 'used', used_by = ? WHERE epin_code = ?",
      [foundUserId, epin_code]  // Mark the E-PIN as used by the found user
    );

    // Response indicating that the request was successfully handled
    res.json({ message: "Plan upgraded successfully and E-PIN marked as used!" });

  } catch (err) {
    console.error("Error:", err);
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

