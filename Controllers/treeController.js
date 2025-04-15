const db = require("../config/db");

// ✅ Function to build hierarchical tree
const buildTree = (users, rootId) => {
  const userMap = {}; // Store users by ID

  // Convert array to a map for fast lookup
  users.forEach((user) => {
    userMap[user.user_id] = { ...user, children: [] };
  });

  let rootNode = null;

  // Construct the tree structure
  users.forEach((user) => {
    if (user.level_sponsor_id === null || user.user_id == rootId) {
      rootNode = userMap[user.user_id]; // Root user
    } else {
      if (userMap[user.level_sponsor_id]) {
        userMap[user.level_sponsor_id].children.push(userMap[user.user_id]);
      }
    }
  });

  return rootNode;
};

// ✅ API Controller to Fetch User Tree
const getUserTree = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch all users
    const [users] = await db.execute("SELECT * FROM user_plan");

    if (!users.length) {
      return res.status(404).json({ message: "No users found" });
    }

    // Build hierarchical tree
    const treeData = buildTree(users, userId);
    res.json(treeData);
  } catch (error) {
    console.error("Error fetching user tree:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getUserTree };
