const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        users.*, 
        userplans.plan_id 
      FROM users 
      LEFT JOIN userplans ON users.user_id = userplans.user_id
    `;
    
    const [rows] = await db.promise().query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users with plans:", error);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
