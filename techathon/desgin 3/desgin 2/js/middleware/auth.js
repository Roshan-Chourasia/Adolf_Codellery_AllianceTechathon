const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token.replace("Bearer ", ""), "your_jwt_secret");
        req.user = decoded.userId; // Store user ID in request object
        next();
    } catch (err) {
        res.status(401).json({ msg: "Invalid token" });
    }
};
