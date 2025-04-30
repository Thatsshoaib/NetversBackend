const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../Config/db'); // Adjust this based on your DB connection
const auth = require('../Middlewares/authMiddleware'); // Your JWT middleware
const router = express.Router();

router.post('/change-password', auth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Please provide both old and new passwords." });
    }

    try {
        const userId = req.user.user_id;

        // Fetch the current hashed password from DB
        const [userRows] = await db.query("SELECT password FROM users WHERE user_id = ?", [userId]);
        const user = userRows[0];

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Old password is incorrect." });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await db.query("UPDATE users SET password = ? WHERE user_id = ?", [hashedNewPassword, userId]);

        res.status(200).json({ message: "Password changed successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;