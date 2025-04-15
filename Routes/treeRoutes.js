const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET XML-based user tree
router.get("/tree/:userId/:planId", async (req, res) => {
  const { userId, planId } = req.params;

  try {
    console.log(`Calling stored procedure GenerateTreeXML for user ID: ${userId}, plan ID: ${planId}`);

    // Call the stored procedure
    const [results] = await db.query("CALL GenerateTreeXML(?, ?)", [userId, planId]);

    // Stored procedure returns XML in results[0][0].TreeXML
    const treeXML = results[0][0]?.TreeXML;

    if (!treeXML) {
      return res.status(404).json({ error: "No tree data found" });
    }

    res.set("Content-Type", "application/xml");
    res.send(treeXML);
  } catch (error) {
    console.error("Error calling GetUserTreeXML:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

module.exports = router;
