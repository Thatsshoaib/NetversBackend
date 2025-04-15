const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Extract token from the Authorization header

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        // Verify the token using the secret key
        const decoded = jwt.verify(token, "SECRET_KEY");

        // Log the decoded token to verify if user_id exists
        console.log("Decoded token:", decoded);

        // Attach the decoded user information to the request object
        req.user = decoded;
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(400).json({ message: "Invalid token." });
    }
};
