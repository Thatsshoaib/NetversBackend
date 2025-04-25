const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../Config/db"); // ✅ Import the fixed MySQL connection
const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password, sponsor_id, plan_id, epin, role } = req.body;
        const userRole = role || "user";

        // ✅ Check if the email already exists
        const checkEmailQuery = `SELECT user_id FROM users WHERE email = ?`;
        const [existingUser] = await db.query(checkEmailQuery, [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email already registered!" });
        }

        let epinId = null;  // ✅ Declare epinId globally

        // ✅ E-PIN Validation (Only for users, not admins)
        if (userRole === "user") {
            const checkEpinQuery = `SELECT id, assigned_to, status FROM epins WHERE epin_code = ?`;
            const [epinResult] = await db.query(checkEpinQuery, [epin]);

            if (epinResult.length === 0) {
                return res.status(400).json({ message: "Invalid E-PIN! Please enter a valid E-PIN." });
            }

            const { id, assigned_to, status } = epinResult[0];
            epinId = id;  // ✅ Assign epinId here

            if (status !== "unused") {
                return res.status(400).json({ message: "E-PIN already used! Please enter a new E-PIN." });
            }

            if (Number(assigned_to) !== Number(sponsor_id)) {
                return res.status(400).json({ message: "E-PIN does not belong to the sponsor ID provided!" });
            }
        }

        // ✅ Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ Insert user into `users` table
        const insertUserQuery = `INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)`;
        const [userResult] = await db.query(insertUserQuery, [name, email, phone, hashedPassword, userRole]);
        const newUserId = userResult.insertId;

        // ✅ Call stored procedure for EVERY user (Admins and Users)
        await db.execute("CALL AssignUserToTree(?, ?, ?)", [newUserId, sponsor_id || null, plan_id]);

        // ✅ Mark the E-PIN as used after successful registration (Only for users)
        if (userRole === "user" && epinId) {  
            const updateEpinQuery = `UPDATE epins SET status = 'used', used_by = ? WHERE id = ?`;
            await db.query(updateEpinQuery, [newUserId, epinId]);
        }

        return res.status(201).json({ message: "User registered successfully!", role: userRole });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});





router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.query(`
            SELECT u.*, up.plan_id
            FROM users u
            LEFT JOIN userplans up ON u.user_id = up.user_id
            WHERE u.email = ?
          `, [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: "User not found" });
        }

        const user = rows[0]; // Get the first user object

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign({ user_id: user.user_id, role: user.role }, "SECRET_KEY", { expiresIn: "1h" });

        res.json({
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                sponsor_id: user.sponsor_id,
                plan_id: user.plan_id,
                role: user.role  
            },
            token
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});




// router.post("/login", async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const [rows] = await db.query(`
//             SELECT u.*, up.plan_id
//             FROM users u
//             LEFT JOIN userplans up ON u.user_id = up.user_id
//             WHERE u.email = ?
//           `, [email]);
//         if (rows.length === 0) {
//             return res.status(401).json({ message: "User not found" });
//         }

//         const user = rows[0]; // Get the first user object

//         // Check password
//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(401).json({ message: "Invalid credentials" });
//         }

//         // Generate JWT token
//         const token = jwt.sign({ user_id: user.user_id, role: user.role }, "SECRET_KEY", { expiresIn: "1h" });

//         res.json({
//             user: {
//                 user_id: user.user_id,
//                 name: user.name,
//                 email: user.email,
//                 sponsor_id: user.sponsor_id,
//                 plan_id: user.plan_id,
//                 role: user.role  
//             },
//             token
//         });

//     } catch (error) {
//         console.error("Login Error:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// });




module.exports = router;
