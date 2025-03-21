const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register route
router.post('/register', async (req, res) => {
    try {
        console.log('Register attempt with full data:', req.body);
        console.log('Role from request:', req.body.role, 'Type:', typeof req.body.role);
        
        const { name, email, password, role, subjects, experience, education, hourlyRate, bio, availability } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        console.log('User exists:', user ? 'Yes' : 'No');

        if (user) {
            console.log('Registration failed - User already exists');
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'Name, email, and password are required' });
        }

        // Ensure role is set - default to student if not provided
        const userRole = role || 'student';
        console.log('Using role:', userRole);

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
        }

        // Validate tutor-specific fields if role is tutor
        if (userRole === 'tutor') {
            if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
                return res.status(400).json({ msg: 'At least one subject is required' });
            }
            if (!experience || isNaN(experience) || experience < 0) {
                return res.status(400).json({ msg: 'Valid experience is required' });
            }
            if (!education || typeof education !== 'string') {
                return res.status(400).json({ msg: 'Education is required' });
            }
            if (!hourlyRate || isNaN(hourlyRate) || hourlyRate < 0) {
                return res.status(400).json({ msg: 'Valid hourly rate is required' });
            }
            if (!bio || typeof bio !== 'string') {
                return res.status(400).json({ msg: 'Bio is required' });
            }
            if (!availability || !Array.isArray(availability) || availability.length === 0) {
                return res.status(400).json({ msg: 'At least one availability slot is required' });
            }
        }

        // Create new user
        user = new User({
            name,
            email,
            password,
            role: userRole,
            ...(userRole === 'tutor' && {
                subjects: subjects.map(s => s.trim()),
                experience: Number(experience),
                education: education.trim(),
                hourlyRate: Number(hourlyRate),
                bio: bio.trim(),
                availability: availability.map(slot => ({
                    day: slot.day.trim(),
                    startTime: slot.startTime.trim(),
                    endTime: slot.endTime.trim()
                }))
            })
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        console.log('Password hashed successfully');

        // Save user
        await user.save();
        console.log('User saved successfully');

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('Token created successfully');

        // Send response
        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        // Check if it's a validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        res.status(500).json({ msg: 'Server error' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', { email: req.body.email, role: req.body.role });
        
        const { email, password, role } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');

        if (!user) {
            console.log('Login failed - User not found');
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check role
        if (user.role !== role) {
            console.log('Login failed - Invalid role');
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch ? 'Yes' : 'No');

        if (!isMatch) {
            console.log('Login failed - Invalid password');
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('Token created successfully');

        // Send response
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router; 