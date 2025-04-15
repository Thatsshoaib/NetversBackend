const express = require("express");
const router = express.Router();
const db = require("../Config/db");

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
