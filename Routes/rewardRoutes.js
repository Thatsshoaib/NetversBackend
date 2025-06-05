const express = require("express");
const router = express.Router();
const db = require("../Config/db"); // MySQL connection file



router.get("/test", (req, res) => {
  console.log("✅ /api/rewards/test hit");
  res.send("Test route working");
});


// Add Reward
router.post("/add", async (req, res) => {
  const { plan_id, no_of_directs, title, image, description } = req.body;

  try {
    // Get plan name from plans table using the plan_id
    const [planResult] = await db.query(
      "SELECT plan_name FROM plans WHERE plan_id = ?",
      [plan_id]
    );

    if (!planResult.length) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid plan selected" });
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
    res.status(500).json({
      success: false,
      message: "Error adding reward",
      error: err.message,
    });
  }
});

// Fetch All Rewards
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM  direct_rewards");
    res.json({ success: true, data: rows });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching rewards", error: err });
  }
});

router.get("/user-rewards/:user_id", async (req, res) => {
  try {
    const userId = req.params.user_id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [results] = await db.execute("CALL GetUserRewardsData(?)", [userId]);

    res.json(results[0]);  // No need to manually add `paid` now
  } catch (err) {
    console.error("Error fetching user rewards:", err);
    res.status(500).json({ error: "Database error" });
  }
});



router.get("/eligible", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        ur.*, 
        u.U_code, 
        u.name 
      FROM userrewards ur
      JOIN users u ON ur.user_id = u.user_id
      WHERE ur.status = 'achieved' AND ur.paid = 'no';
    `);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching eligible reward candidates:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching eligible reward candidates",
    });
  }
});



router.post("/pay/:id", async (req, res) => {
  const rewardId = req.params.id;

  try {
    const [result] = await db.query(
      "UPDATE userrewards SET paid = 'yes' WHERE id = ?",
      [rewardId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reward not found" });
    }

    res.json({ success: true, message: "Reward marked as paid" });
  } catch (error) {
    console.error("Error updating reward payment status:", error);
    res.status(500).json({ success: false, message: "Server error updating reward payment status" });
  }
});


router.get("/paid-history", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        ur.*, 
        u.U_code, 
        u.name 
      FROM userrewards ur
      JOIN users u ON ur.user_id = u.user_id
      WHERE ur.status = 'achieved' AND ur.paid = 'yes';
    `);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching eligible reward candidates:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching eligible reward candidates",
    });
  }
});


router.get("/paid-status/:userId/:rewardId", async (req, res) => {
  const { userId, rewardId } = req.params;

  try {
    const [result] = await db.execute(
      "SELECT paid FROM userrewards WHERE user_id = ? AND reward_id = ? LIMIT 1",
      [userId, rewardId]
    );

    if (result.length === 0) {
      return res.status(200).json({ paid: "no" }); // respond with "no" if not found
    }

    return res.status(200).json({ paid: result[0].paid });
  } catch (err) {
    console.error("Error checking paid status:", err);
    return res.status(500).json({ message: "Server error", paid: "no" });
  }
});

module.exports = router;
