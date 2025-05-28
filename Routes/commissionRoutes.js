const express = require("express");
const db = require("../Config/db"); // Import database connection

const router = express.Router();



router.get("/test", (req, res) => {
  console.log("✅ /api/rewards/test hit");
  res.send("Test route working");
});

router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  const query = "CALL GetUserCommissions(?)"; // Stored procedure

  try {
    const [results] = await db.execute(query, [userId]); // ✅ Use `execute()` with `await`
    res.json(results[0]); // Stored procedures return results in an array
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ error: "Database error" });
  }
});
router.get("/autospill/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const [results] = await db.query("CALL GetAutoSpillCommission(?)", [
      userId,
    ]);

    console.log("Raw Query Result:", results);

    if (!results || results.length === 0 || !results[0].length) {
      return res.status(404).json({ error: "No auto spill income found" });
    }

    res.json(results[0][0]); // Adjusting response structure
  } catch (error) {
    console.error("Error fetching auto spill commission:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.get("/direct/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const [results] = await db.query("CALL GetDirectCommission(?)", [userId]);

    console.log("Raw Query Result:", results); // Debugging Output

    if (!results || results.length === 0 || !results[0].length) {
      return res.status(404).json({ error: "No direct income found" });
    }

    console.log("Extracted Data:", results[0]); // Debugging Output

    res.json(results[0][0]); // Ensure correct extraction
  } catch (error) {
    console.error("Error fetching Direct commission:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
