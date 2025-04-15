const express = require("express");
const router = express.Router();
const db = require("../Config/db"); // Ensure db connection is imported

router.get("/user-rewards/:user_id", (req, res) => {
    const userId = req.params.user_id;
    console.log("Received user_id in backend:", userId); // Debugging

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    db.query("CALL GetUserRewardsData(?)", [userId], (err, results) => {
        if (err) {
            console.error("Error fetching user rewards:", err);
            return res.status(500).json({ error: "Database error" });
        }

        console.log("Database response:", results[0]); // Debugging
        res.json(results[0]); // Ensure correct response
    });
});

module.exports = router;
