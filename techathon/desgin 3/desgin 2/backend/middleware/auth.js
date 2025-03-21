const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Auth middleware - Token received:', token ? 'Yes' : 'No');

    // Check if no token
    if (!token) {
        console.log('Auth middleware - No token provided');
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Auth middleware - Decoded token:', decoded);

        // Check if token has the correct structure
        if (!decoded.userId) {
            console.log('Auth middleware - Invalid token structure');
            return res.status(401).json({ msg: 'Invalid token structure' });
        }

        // Load full user data from the database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            console.log('Auth middleware - User not found in database');
            return res.status(404).json({ msg: 'User not found' });
        }
        
        // Add complete user object to request
        req.user = user;
        console.log('Auth middleware - User loaded with role:', user.role);
        
        next();
    } catch (err) {
        console.error('Auth middleware - Token verification error:', err);
        res.status(401).json({ msg: 'Token is invalid or expired' });
    }
}; 