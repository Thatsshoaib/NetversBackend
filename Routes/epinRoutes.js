const express = require("express");
const db = require("../Config/db");

const router = express.Router();

// Route to Generate E-PINs Using Stored Procedure
router.post("/generate-epins", async (req, res) => {
  try {
    const { planID, epinCount, assignedUser } = req.body;

    if (!planID || !epinCount || !assignedUser) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Call Stored Procedure using async/await
    const [result] = await db.execute(`CALL GenerateRandomEpins(?, ?, ?)`, [
      planID,
      epinCount,
      assignedUser,
    ]);

    res.json({ message: "E-PINs generated successfully!", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/plans", async (req, res) => {
  try {
    const [plans] = await db.query("SELECT plan_id, plan_name FROM plans");
    res.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.get("/user/:id", async (req, res) => {
  const userID = req.params.id;

  try {
    const [user] = await db.query("SELECT name FROM users WHERE user_id = ?", [
      userID,
    ]);

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ name: user[0].name });
  } catch (error) {
    console.error("Error fetching user name:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.get("/user-epins", async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from JWT token

    const query = `
      SELECT epins.id, epins.epin_code, plans.plan_name, epins.status 
      FROM epins 
      JOIN plans ON epins.plan_id = plans.id
      WHERE epins.assigned_to = ?
    `;

    db.query(query, [userId], (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });

      res.json({ epins: results });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// Change the backend route from /api/history to /api/epins/history
router.get("/api/epins/history", async (req, res) => {
  try {
    // Query the database to get all rows from the 'epins' table
    const [epins] = await db.execute('SELECT id, epin_code, status, assigned_to, created_at, plan_id FROM epins');
    res.json(epins);  // Send the data as JSON response
  } catch (error) {
    console.error('Error fetching data from epins table:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });  // Send error response
  }
});

// Route to get E-PINs assigned to the logged-in user
router.get("/user-epins", async (req, res) => {
  try {
    // Get the user_id from the query parameters or request body
    const userId = req.query.user_id; // or you can get it from req.user.id if you are using JWT

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Query to fetch the E-PINs assigned to the user
    const [epins] = await db.execute(
      `SELECT epins.id, epins.epin_code, epins.status, epins.assigned_to, epins.created_at, epins.plan_id 
       FROM epins
       WHERE epins.assigned_to = ?`, [userId]
    );

    // Send the data as JSON response
    res.json(epins);
  } catch (error) {
    console.error("Error fetching assigned E-PINs:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/reshare-epin", (req, res) => {
  const { epin_code, sender_id, receiver_id } = req.body;

  if (!epin_code || !sender_id || !receiver_id) {
    console.log("⚠️ Missing fields in request:", { epin_code, sender_id, receiver_id });
    return res.status(400).json({ error: "All fields are required!" });
  }

  const query = `CALL ReshareEpin(?, ?, ?)`; // Ensure the stored procedure exists

  db.query(query, [epin_code, sender_id, receiver_id], (err, results) => {
    if (err) {
      console.error("❌ Error resharing E-PIN:", err);
      return res.status(500).json({ error: err.sqlMessage || "Database error" });
    }

    console.log("✅ E-PIN reshared successfully!", results);
    res.json({ message: "E-PIN reshared successfully!" });
  });
});

module.exports = router;
