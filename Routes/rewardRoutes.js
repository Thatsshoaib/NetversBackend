const express = require("express");
const router = express.Router();
const db = require("../Config/db"); // MySQL connection file

// Add Reward
router.post("/add", async (req, res) => {
    const { plan_id, no_of_directs, title, image, description } = req.body;
  
    try {
      // Get plan name from plans table using the plan_id
      const [planResult] = await db.query("SELECT plan_name FROM plans WHERE plan_id = ?", [plan_id]);
  
      if (!planResult.length) {
        return res.status(400).json({ success: false, message: "Invalid plan selected" });
      }
  
      const plan_name = planResult[0].plan_name;
  
      const sql = `
        INSERT INTO direct_rewards (plan_name, no_of_directs, title, image, description)
        VALUES (?, ?, ?, ?, ?)
      `;
  
      await db.query(sql, [plan_name, no_of_directs, title, image, description]);
  
      res.json({ success: true, message: "Reward added successfully!" });
    } catch (err) {
      console.error("Database Error:", err);
      res.status(500).json({ success: false, message: "Error adding reward", error: err.message });
    }
  });
  

// Fetch All Rewards
router.get("/all", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM  direct_rewards");
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching rewards", error: err });
    }
});

router.get("/user-rewards/:user_id", async (req, res) => {
    try {
        const userId = req.params.user_id;
        console.log("Received user_id in backend:", userId); // ✅ Debugging

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        // ✅ Use async/await for database query
        const [results] = await db.execute("CALL GetUserRewardsData(?)", [userId]);

        console.log("Database response:", results); // ✅ Debugging
        res.json(results[0]); // MySQL stored procedures return data in results[0]
    } catch (err) {
        console.error("Error fetching user rewards:", err);
        res.status(500).json({ error: "Database error" });
    }
});
    





module.exports = router;

