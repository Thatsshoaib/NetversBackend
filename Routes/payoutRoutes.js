const express = require("express");
const router = express.Router();
const db = require("../Config/db");

router.get("/income", async (req, res) => {
  const sql = `
    SELECT 
      u.user_id AS user_id,
      u.name AS user_name,
      COALESCE(SUM(c.total_amount), 0) AS total_income,
      0 AS feed_to_payout
    FROM users u
    LEFT JOIN wallet c ON u.user_id = c.user_id
    GROUP BY u.user_id, u.name
    HAVING total_income > 0
    ORDER BY total_income DESC;
  `;

  try {
    const [results] = await db.query(sql);
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("MySQL Error:", err.sqlMessage || err.message || err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Route to insert payout
router.post("/add", async (req, res) => {
  console.log("Incoming payout:", req.body); // 👈 Add this
  const { user_id, amount, transaction_id } = req.body;

  if (!user_id || !amount || isNaN(amount) || !transaction_id) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid input data" });
  }

  const sql = `
    INSERT INTO payouts (user_id, amount, payout_date, transaction_id)
    VALUES (?, ?, NOW(), ?)
  `;

  try {
    await db.query(sql, [user_id, amount || null, transaction_id]);
    return res
      .status(200)
      .json({ success: true, message: "Payout recorded successfully" });
  } catch (err) {
    console.error("Insert Error:", err.sqlMessage || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record payout" });
  }
});
router.get("/wallet-balance", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const [walletData] = await db.execute(
      "SELECT total_amount FROM wallet WHERE user_id = ?",
      [userId]
    );

    if (!walletData || walletData.length === 0) {
      return res.json({ wallet_balance: 0 });
    }

    // ✅ Correct field used here
    return res.json({ wallet_balance: walletData[0]?.total_amount || 0 });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT id, amount, payout_date, transaction_id FROM payouts WHERE user_id = ? ORDER BY payout_date DESC",
      [userId]
    );

    const total = rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    res.json({
      total,
      history: rows,
    });
  } catch (err) {
    console.error("Error fetching payout history:", err);
    res.status(500).json({ error: "Failed to fetch payout history" });
  }
});

router.get("/totals", async (req, res) => {
  try {
    const [results] = await db.execute(`
      SELECT 
        user_id,
        SUM(CASE WHEN type = 'direct' THEN amount ELSE 0 END) AS direct_commission,
        SUM(CASE WHEN type = 'Auto Spill' THEN amount ELSE 0 END) AS autospill_commission
      FROM commission
      GROUP BY user_id
    `);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching commission totals:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/all-payouts", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
     p.id, 
     p.amount, 
     p.payout_date, 
     p.transaction_id, 
     u.user_id AS user_id,
     u.name AS user_name,
     u.U_code
FROM payouts p
JOIN users u ON p.user_id = u.user_id
ORDER BY p.payout_date DESC`
    );

    const total = rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    res.json({
      total,
      history: rows,
    });
  } catch (err) {
    console.error("Error fetching payout history:", err);
    res.status(500).json({ error: "Failed to fetch payout history" });
  }
});

module.exports = router;
