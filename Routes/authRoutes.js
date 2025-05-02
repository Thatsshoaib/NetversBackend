const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../Config/db"); // ✅ Import the fixed MySQL connection
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, sponsor_id, plan_id, epin } = req.body;
    const userRole = "user";

    // ✅ Check if the email already exists
    const checkEmailQuery = `SELECT user_id FROM users WHERE email = ?`;
    const [existingUser] = await db.query(checkEmailQuery, [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email already registered!" });
    }

    let epinId = null;
    let sponsorUserId = null;

    // ✅ Lookup sponsor's numeric user_id using U_code
    if (sponsor_id) {
      const sponsorQuery = `SELECT user_id FROM users WHERE U_code = ?`;
      const [sponsorResult] = await db.query(sponsorQuery, [sponsor_id]);

      if (sponsorResult.length === 0) {
        return res.status(400).json({ message: "Invalid Sponsor ID (U_code)" });
      }

      sponsorUserId = sponsorResult[0].user_id;
    }

    // ✅ Check total users
    const [userCountResult] = await db.query(`SELECT COUNT(*) AS total FROM users`);
    const userCount = userCountResult[0].total;

    // ✅ E-PIN Validation (skip for first user only)
   // ✅ E-PIN Validation (skip for first user only)
if (userCount > 0) {
  if (!epin) {
    return res.status(400).json({ message: "E-PIN is required!" });
  }

  const checkEpinQuery = `SELECT id, assigned_to, status FROM epins WHERE epin_code = ?`;
  const [epinResult] = await db.query(checkEpinQuery, [epin]);

  if (epinResult.length === 0) {
    return res.status(400).json({ message: "Invalid E-PIN! Please enter a valid E-PIN." });
  }

  const { id, assigned_to, status } = epinResult[0];
  epinId = id;

  if (status !== "unused") {
    return res.status(400).json({ message: "E-PIN already used! Please enter a new E-PIN." });
  }

  if (Number(assigned_to) !== Number(sponsorUserId)) {
    return res.status(400).json({ message: "E-PIN does not belong to the sponsor ID provided!" });
  }

} else {
  // First user - no E-PIN required
  epinId = null;
  console.log("First user registration - skipping E-PIN check.");
}


    // ✅ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Generate U_code
    const serialQuery = `SELECT COUNT(*) AS count FROM users WHERE U_code LIKE ?`;
    const [serialResult] = await db.query(serialQuery, [`NT%`]);
    const serialCount = serialResult[0].count + 1;
    const U_code = `NT${serialCount}${String(serialCount).padStart(3, "0")}`;

    // ✅ Insert new user
    const insertUserQuery = `
      INSERT INTO users (name, email, phone, password, role, U_code)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [insertResult] = await db.query(insertUserQuery, [name, email, phone, hashedPassword, userRole, U_code]);
    const newUserId = insertResult.insertId;

    // ✅ Assign to tree using numeric sponsor ID
    await db.execute("CALL AssignUserToTree(?, ?, ?)", [newUserId, sponsorUserId || null, plan_id]);

    // ✅ Mark E-PIN as used (if applicable)
    if (epinId) {
      const updateEpinQuery = `UPDATE epins SET status = 'used', used_by = ? WHERE id = ?`;
      await db.query(updateEpinQuery, [newUserId, epinId]);
    }

    return res.status(201).json({ message: "User registered successfully!", role: userRole, u_code: U_code });

  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});





router.post("/login", async (req, res) => {
  const { u_code, password } = req.body;

  try {
    const [rows] = await db.query(
      `
            SELECT u.*, up.plan_id
            FROM users u
            LEFT JOIN userplans up ON u.user_id = up.user_id
            WHERE u.u_code = ?
          `,
      [u_code]
    );
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
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      "SECRET_KEY",
      { expiresIn: "1h" }
    );

    res.json({
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        sponsor_id: user.sponsor_id,
        plan_id: user.plan_id,
        role: user.role,
        u_code: user.u_code, // Include U_code in the response
      },
      token,
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
