const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY || "SECRET_KEY");

        if (!decoded.user_id) {
            return res.status(400).json({ message: "Invalid token payload." });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(400).json({ message: "Invalid token." });
    }
};
