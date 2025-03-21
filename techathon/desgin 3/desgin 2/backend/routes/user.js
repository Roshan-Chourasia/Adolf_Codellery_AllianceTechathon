const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        console.log('Fetching profile for user:', req.user._id);
        
        const user = await User.findById(req.user._id).select('-password');
        console.log('User found:', user ? 'Yes' : 'No');

        if (!user) {
            console.log('Profile not found');
            return res.status(404).json({ msg: 'User not found' });
        }

        // Format user data to match frontend expectations
        const userData = {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };

        console.log('Profile fetched successfully');
        res.json(userData);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
    try {
        console.log("Update profile route - Request body:", req.body);
        console.log("Update profile route - User from auth:", req.user);

        const { name } = req.body;
        
        if (!name) {
            console.log("Update profile route - Name is required");
            return res.status(400).json({ msg: 'Name is required' });
        }

        if (!req.user) {
            console.log("Update profile route - No user found in request");
            return res.status(401).json({ msg: 'User not authenticated' });
        }

        const user = await User.findOne({ _id: req.user._id });
        console.log("Update profile route - Found user:", user ? "Yes" : "No");

        if (!user) {
            console.log("Update profile route - User not found in database");
            return res.status(404).json({ msg: 'User not found' });
        }

        user.name = name;
        await user.save();
        console.log("Update profile route - User updated successfully");

        const userData = {
            msg: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
        console.log("Update profile route - Sending response:", userData);
        res.json(userData);
    } catch (error) {
        console.error("Update profile route - Error:", error);
        res.status(500).json({ msg: 'Error updating profile' });
    }
});

// Update user role to tutor
router.post('/update-role', auth, async (req, res) => {
    try {
        // Find the user by their ID
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update the role to tutor
        user.role = 'tutor';
        await user.save();

        console.log(`Updated user role to tutor for: ${user._id}`);
        res.json({ msg: 'User role updated to tutor', user });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ msg: 'Error updating user role', error: error.message });
    }
});

module.exports = router; 