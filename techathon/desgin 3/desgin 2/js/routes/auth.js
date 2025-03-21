const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // ✅ Import JWT for authentication
const User = require("../models/User"); // ✅ Import the User model

const router = express.Router();

// ✅ Register Route
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // ✅ 1. Check if all fields are provided
        if (!name || !email || !password) {
            return res.status(400).json({ msg: "All fields are required!" });
        }

        // ✅ 2. Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: "User already exists!" });
        }

        // ✅ 3. Hash password before saving
        console.log("Hashing password for:", email);
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ 4. Save user in DB
        user = new User({ name, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ msg: "User registered successfully!" });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ msg: "Server error", error: err.message });
    }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
    try {
        console.log("🔹 Login request received:", req.body); // Debugging

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ msg: "All fields are required!" });
        }

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "Invalid credentials!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid credentials!" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ userId: user._id }, "your_jwt_secret", { expiresIn: "1h" });

        console.log("🔹 Token sent:", token); // Debugging log

        res.json({ msg: "Login successful!", token });
    } catch (err) {
        console.error("❌ Login Error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

// ✅ Profile Route
router.get("/profile", async (req, res) => {
    try {
        const token = req.header("Authorization").replace("Bearer ", "");
        const decoded = jwt.verify(token, "your_jwt_secret");

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        res.json(user);
    } catch (err) {
        console.error("Profile Error:", err);
        res.status(401).json({ msg: "Unauthorized" });
    }
});

// ✅ Save Completed Course Progress
router.post("/save-progress", authenticate, async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.userId; // Extract user ID from JWT token

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: "User not found!" });

        if (!user.progress.completedCourses.includes(courseId)) {
            user.progress.completedCourses.push(courseId);
            await user.save();
        }

        res.json({ msg: "Progress saved!", progress: user.progress });
    } catch (err) {
        console.error("Error saving progress:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
