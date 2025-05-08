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
router.get("/user/:code", async (req, res) => {
  const userCode = req.params.code;

  try {
    const [user] = await db.query("SELECT name FROM users WHERE U_code = ?", [
      userCode,
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
router.post("/reshare-epin", async (req, res) => {
  const { epin_codes, receiver_ucode, sender_id } = req.body;
  console.log("Request body:", req.body); // Log the incoming data

  // Ensure all fields are present
  if (!Array.isArray(epin_codes) || epin_codes.length === 0 || !receiver_ucode || !sender_id) {
    console.log("⚠️ Missing or invalid fields in request:", { epin_codes, sender_id, receiver_ucode });
    return res.status(400).json({ error: "All fields are required and epin_codes must be a non-empty array." });
  }

  console.log("✅ /reshare-epin route hit with body:", req.body);

  try {
    // Step 1: Get user_id from users table using U_code
    const getUserQuery = `SELECT user_id FROM users WHERE U_code = ? LIMIT 1`;
    const [results] = await db.query(getUserQuery, [receiver_ucode]);

    console.log("SQL Result for receiver lookup:", results);  // Log query result

    if (results.length === 0) {
      console.error("❌ Receiver U_code not found.");
      return res.status(404).json({ error: "Receiver U_code not found." });
    }

    const receiver_id = results[0].user_id;
    console.log("✅ Resolved receiver_id:", receiver_id);

    // Step 2: Update the epins with new assigned_to
    const placeholders = epin_codes.map(() => '?').join(',');
    const updateQuery = `
      UPDATE epins 
      SET assigned_to = ? 
      WHERE epin_code IN (${placeholders})
    `;
    const params = [receiver_id, ...epin_codes];

    console.log("Executing query:", updateQuery, "with params:", params); // Log query for debugging

    const [updateResult] = await db.query(updateQuery, params);

    if (updateResult.affectedRows === 0) {
      console.error("❌ No rows were updated.");
      return res.status(404).json({ error: "No matching E-PINs found to update." });
    }

    console.log("✅ E-PINs reshared successfully!", updateResult);
    res.json({ message: "E-PINs reshared successfully!" });
  } catch (err) {
    console.error("❌ Error in /reshare-epin route:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
