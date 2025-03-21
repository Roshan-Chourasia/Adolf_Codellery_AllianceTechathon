const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Session = require("../models/Session");

// Save session data
router.post("/save", auth, async (req, res) => {
    try {
        console.log("Session save - User ID:", req.user._id);
        console.log("Session save - Data:", req.body);

        const sessionData = {
            userId: req.user._id,
            sessionData: req.body,
            lastUpdated: new Date()
        };

        // Update or create session data
        const session = await Session.findOneAndUpdate(
            { userId: req.user._id },
            sessionData,
            { new: true, upsert: true }
        );

        res.json({ success: true, session });
    } catch (error) {
        console.error("Session save error:", error);
        res.status(500).json({ msg: "Error saving session data" });
    }
});

// Get session data
router.get("/load", auth, async (req, res) => {
    try {
        console.log("Session load - User ID:", req.user._id);

        const session = await Session.findOne({ userId: req.user._id });
        
        if (!session) {
            return res.json({ success: true, sessionData: null });
        }

        res.json({ success: true, sessionData: session.sessionData });
    } catch (error) {
        console.error("Session load error:", error);
        res.status(500).json({ msg: "Error loading session data" });
    }
});

module.exports = router; 