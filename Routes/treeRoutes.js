const express = require("express");
const router = express.Router();
const db = require("../Config/db");

// GET XML-based user tree
router.get("/tree/:userId/:planId", async (req, res) => {
  const { userId, planId } = req.params;

  try {
    // Set large max length for group_concat
    await db.query("SET SESSION group_concat_max_len = 10000000000;");

    // Call the stored procedure
    const [results] = await db.query("CALL GenerateTreeXML(?, ?)", [userId, planId]);

    const treeXML = results[0][0]?.TreeXML;

    if (!treeXML) {
      return res.status(404).json({ error: "You do not have tree of this Plan" });
    }

    res.set("Content-Type", "application/xml");
    res.send(treeXML);
  } catch (error) {
    console.error("Error calling GetUserTreeXML:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});




module.exports = router;
