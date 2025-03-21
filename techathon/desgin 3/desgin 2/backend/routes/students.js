const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth');

// Get student dashboard data
router.get('/dashboard', auth, async (req, res) => {
    try {
        console.log('Fetching dashboard for student:', req.user._id);
        
        // Get enrolled courses
        const enrolledCourses = await Course.find({
            'enrolledStudents': req.user._id
        }).select('title subject level duration price image progress');
        
        // Get completed courses
        const completedCourses = await Course.find({
            'completedStudents': req.user._id
        }).select('title subject level duration price image');
        
        // Get latest available courses (not enrolled)
        const latestCourses = await Course.find({
            'enrolledStudents': { $ne: req.user._id }
        })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('title subject level duration price image');
        
        // Calculate statistics
        const totalHours = enrolledCourses.reduce((sum, course) => sum + course.duration, 0);
        const averageProgress = enrolledCourses.length > 0
            ? enrolledCourses.reduce((sum, course) => sum + (course.progress || 0), 0) / enrolledCourses.length
            : 0;
        
        // Format dashboard data
        const dashboardData = {
            enrolledCourses: enrolledCourses.length,
            completedCourses: completedCourses.length,
            totalHours: totalHours,
            averageProgress: Math.round(averageProgress),
            inProgressCourses: enrolledCourses.map(course => ({
                _id: course._id,
                title: course.title,
                subject: course.subject,
                level: course.level,
                image: course.image,
                progress: course.progress || 0
            })),
            latestCourses: latestCourses.map(course => ({
                _id: course._id,
                title: course.title,
                subject: course.subject,
                level: course.level,
                duration: course.duration,
                price: course.price,
                image: course.image
            }))
        };
        
        console.log('Dashboard data fetched successfully');
        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Update course progress
router.post('/courses/:courseId/progress', auth, async (req, res) => {
    try {
        const { progress } = req.body;
        const course = await Course.findById(req.params.courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Find or create student progress entry
        const studentIndex = course.enrolledStudents.findIndex(
            student => student.studentId.toString() === req.user._id.toString()
        );

        if (studentIndex === -1) {
            course.enrolledStudents.push({
                studentId: req.user._id,
                progress,
                lastAccessed: new Date()
            });
        } else {
            course.enrolledStudents[studentIndex].progress = progress;
            course.enrolledStudents[studentIndex].lastAccessed = new Date();
        }

        // If progress is 100%, add to completed students
        if (progress === 100) {
            const completedIndex = course.completedStudents.findIndex(
                student => student.studentId.toString() === req.user._id.toString()
            );
            if (completedIndex === -1) {
                course.completedStudents.push({
                    studentId: req.user._id,
                    completedAt: new Date()
                });
            }
        }

        await course.save();
        res.json({ message: 'Progress updated successfully' });
    } catch (error) {
        console.error('Error updating course progress:', error);
        res.status(500).json({ message: 'Error updating progress' });
    }
});

module.exports = router; 