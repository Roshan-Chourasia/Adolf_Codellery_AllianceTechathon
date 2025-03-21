const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const Session = require('../models/Session');
const Review = require('../models/Review');

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
    try {
        console.log('Fetching dashboard stats for user:', req.user._id, 'with role:', req.user.role);
        
        // Get total courses
        const courses = await Course.find({ tutorId: req.user._id });
        const totalCourses = courses.length;
        console.log('Found courses for dashboard:', totalCourses);
        
        // Get course IDs for enrollment checks
        const courseIds = courses.map(course => course._id);
        
        // Get total students (users who have enrolled in the tutor's courses)
        const totalStudents = await User.countDocuments({
            enrolledCourses: { $in: courseIds }
        });

        // Get total sessions
        const totalSessions = await Session.countDocuments({
            tutorId: req.user._id
        });

        // Get total earnings (sum of all completed sessions)
        const completedSessions = await Session.find({
            tutorId: req.user._id,
            status: 'completed'
        });
        const totalEarnings = completedSessions.reduce((sum, session) => sum + session.price, 0);

        // Get upcoming sessions
        const upcomingSessions = await Session.find({
            tutorId: req.user._id,
            status: 'scheduled',
            date: { $gte: new Date() }
        })
        .sort({ date: 1 })
        .limit(5)
        .populate('studentId', 'name email');

        // Get recent reviews
        const recentReviews = await Review.find({
            tutorId: req.user._id
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('studentId', 'name');

        res.json({
            totalStudents,
            totalCourses,
            totalSessions,
            totalEarnings,
            upcomingSessions,
            recentReviews
        });
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({ msg: 'Error fetching dashboard statistics' });
    }
});

// Get dashboard data for students
router.get('/student', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.role !== 'student') {
            return res.status(403).json({ msg: 'Access denied. Not a student account.' });
        }

        // Get enrolled courses
        const enrolledCourses = await Course.find({
            'enrolledStudents.studentId': userId
        }).populate('tutorId', 'name');

        // Calculate total courses and completed lessons
        const totalCourses = enrolledCourses.length;
        
        let completedLessons = 0;
        let totalLessons = 0;
        
        enrolledCourses.forEach(course => {
            const studentProgress = course.enrolledStudents.find(
                student => student.studentId.toString() === userId
            );
            
            if (studentProgress && studentProgress.completedLessons) {
                completedLessons += studentProgress.completedLessons.length;
            }
            
            if (course.materials) {
                totalLessons += course.materials.length;
            }
        });

        // Calculate completion percentage
        const completionPercentage = totalLessons > 0 
            ? Math.round((completedLessons / totalLessons) * 100) 
            : 0;

        // Get recent activity
        const recentCourses = enrolledCourses.slice(0, 3).map(course => ({
            id: course._id,
            title: course.title,
            tutor: course.tutorId ? course.tutorId.name : 'Unknown',
            subject: course.subject,
            level: course.level,
            progress: calculateProgress(course, userId)
        }));

        return res.json({
            totalCourses,
            completedLessons,
            totalLessons,
            completionPercentage,
            recentCourses
        });

    } catch (err) {
        console.error('Error in student dashboard:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
});

// Get dashboard data for tutors
router.get('/tutor', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.role !== 'tutor') {
            return res.status(403).json({ msg: 'Access denied. Not a tutor account.' });
        }

        // Get courses created by this tutor
        const courses = await Course.find({ tutorId: userId })
            .populate('enrolledStudents.studentId', 'name');

        // Calculate statistics
        const totalCourses = courses.length;
        
        // Get unique students across all courses
        const uniqueStudents = new Set();
        let totalEarnings = 0;
        let totalRatings = 0;
        let ratingCount = 0;

        courses.forEach(course => {
            // Count unique students
            course.enrolledStudents.forEach(student => {
                uniqueStudents.add(student.studentId.toString());
            });

            // Sum earnings
            totalEarnings += course.price * course.enrolledStudents.length;

            // Calculate average rating
            if (course.ratings && course.ratings.length > 0) {
                course.ratings.forEach(rating => {
                    totalRatings += rating.value;
                    ratingCount++;
                });
            }
        });

        const totalStudents = uniqueStudents.size;
        const averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;

        // Get recent activity (enrollments, ratings, etc.)
        const recentActivity = [];
        
        // Add student enrollments to activity
        courses.forEach(course => {
            course.enrolledStudents.forEach(enrollment => {
                if (enrollment.enrollmentDate) {
                    recentActivity.push({
                        type: 'enrollment',
                        courseId: course._id,
                        courseTitle: course.title,
                        studentName: enrollment.studentId.name,
                        createdAt: enrollment.enrollmentDate,
                        message: `${enrollment.studentId.name} enrolled in your course "${course.title}"`
                    });
                }
            });

            // Add ratings to activity
            if (course.ratings && course.ratings.length > 0) {
                course.ratings.forEach(rating => {
                    recentActivity.push({
                        type: 'rating',
                        courseId: course._id,
                        courseTitle: course.title,
                        rating: rating.value,
                        createdAt: rating.date,
                        message: `Your course "${course.title}" received a ${rating.value}-star rating`
                    });
                });
            }
        });

        // Sort activity by date (newest first) and limit to 10 items
        recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const limitedActivity = recentActivity.slice(0, 10);

        return res.json({
            totalCourses,
            totalStudents,
            totalEarnings,
            averageRating,
            recentActivity: limitedActivity
        });

    } catch (err) {
        console.error('Error in tutor dashboard:', err);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Helper function to calculate course progress
function calculateProgress(course, userId) {
    const studentProgress = course.enrolledStudents.find(
        student => student.studentId.toString() === userId
    );
    
    const totalLessons = course.materials ? course.materials.length : 0;
    const completedLessons = studentProgress && studentProgress.completedLessons 
        ? studentProgress.completedLessons.length 
        : 0;
    
    return totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100) 
        : 0;
}

module.exports = router; 