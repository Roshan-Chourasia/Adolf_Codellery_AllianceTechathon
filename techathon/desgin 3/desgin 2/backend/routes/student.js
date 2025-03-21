const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');
const mongoose = require('mongoose');

// Get student dashboard data
router.get('/dashboard', auth, async (req, res) => {
    try {
        // Use ObjectId for proper comparison
        const userId = req.user._id || req.user.id;
        const objectId = new mongoose.Types.ObjectId(userId);
        
        console.log('Getting dashboard for student:', userId);
        
        // Get student's enrolled courses
        const enrolledCourses = await Course.find({
            enrolledStudents: objectId
        });
        
        console.log(`Found ${enrolledCourses.length} enrolled courses`);

        // Calculate statistics
        const completedCourses = enrolledCourses.filter(course => 
            course.completedStudents.some(id => id.toString() === objectId.toString())
        ).length;

        const totalHours = enrolledCourses.reduce((total, course) => {
            return total + (course.duration || 0);
        }, 0);

        // Calculate average progress more safely
        let averageProgress = 0;
        if (enrolledCourses.length > 0) {
            const progressSum = enrolledCourses.reduce((total, course) => {
                let progress = 0;
                // Find student progress record
                const progressRecord = course.studentProgress && course.studentProgress.find(
                    record => record.studentId && record.studentId.toString() === objectId.toString()
                );
                
                if (progressRecord) {
                    const totalLessons = course.materials.length || 1;
                    const completedLessons = progressRecord.completedLessons.length || 0;
                    progress = Math.round((completedLessons / totalLessons) * 100);
                }
                return total + progress;
            }, 0);
            
            averageProgress = Math.round(progressSum / enrolledCourses.length);
        }

        // Get in-progress courses with progress details
        const inProgressCourses = enrolledCourses
            .filter(course => !course.completedStudents.some(id => id.toString() === objectId.toString()))
            .map(course => {
                // Find the progress record for this student
                const progressRecord = course.studentProgress && course.studentProgress.find(
                    record => record.studentId && record.studentId.toString() === objectId.toString()
                );
                
                const totalLessons = course.materials.length || 1;
                const completedLessons = progressRecord ? progressRecord.completedLessons.length : 0;
                const progress = Math.round((completedLessons / totalLessons) * 100);
                
                return {
                    _id: course._id,
                    title: course.title,
                    subject: course.subject,
                    level: course.level,
                    image: course.image,
                    progress: progress,
                    completedLessons: completedLessons,
                    totalLessons: totalLessons,
                    lastAccessed: progressRecord ? progressRecord.lastAccessed : null
                };
            });

        // Get latest available courses (not enrolled)
        const latestCourses = await Course.find({
            enrolledStudents: { $ne: objectId }
        })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('_id title subject level duration price image');

        res.json({
            enrolledCourses: enrolledCourses.length,
            completedCourses,
            totalHours,
            averageProgress,
            inProgressCourses,
            latestCourses
        });
    } catch (error) {
        console.error('Error fetching student dashboard:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Get student's enrolled courses
router.get('/courses', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const objectId = new mongoose.Types.ObjectId(userId);
        
        const courses = await Course.find({
            enrolledStudents: objectId
        });
        res.json(courses);
    } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        res.status(500).json({ message: 'Error fetching enrolled courses' });
    }
});

// Get student's completed courses
router.get('/completed-courses', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const objectId = new mongoose.Types.ObjectId(userId);
        
        const courses = await Course.find({
            completedStudents: objectId
        });
        res.json(courses);
    } catch (error) {
        console.error('Error fetching completed courses:', error);
        res.status(500).json({ message: 'Error fetching completed courses' });
    }
});

// Enroll in a course
router.post('/enroll/:courseId', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        console.log(`Enrolling student ${userId} in course ${req.params.courseId}`);
        
        // Find the course
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check if already enrolled
        if (course.enrolledStudents.some(id => id.toString() === userId.toString())) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }
        
        // Add student to enrolled students
        course.enrolledStudents.push(userId);
        await course.save();
        
        // Add course to student's enrolled courses
        const student = await User.findById(userId);
        if (!student.enrolledCourses) {
            student.enrolledCourses = [];
        }
        
        if (!student.enrolledCourses.some(id => id.toString() === course._id.toString())) {
            student.enrolledCourses.push(course._id);
            await student.save();
        }
        
        console.log(`Student ${userId} successfully enrolled in course ${req.params.courseId}`);
        
        res.status(200).json({ 
            message: 'Successfully enrolled in course',
            course: {
                _id: course._id,
                title: course.title,
                subject: course.subject,
                level: course.level,
                duration: course.duration
            }
        });
    } catch (error) {
        console.error('Error enrolling in course:', error);
        res.status(500).json({ message: 'Error enrolling in course' });
    }
});

// Update course progress
router.post('/progress/:courseId', auth, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const courseId = req.params.courseId;
        const { lessonId, completed } = req.body;
        
        console.log(`Updating progress for student ${userId} in course ${courseId}, lesson ${lessonId}, completed: ${completed}`);
        
        if (!lessonId) {
            return res.status(400).json({ message: 'Lesson ID is required' });
        }
        
        // Find the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Check if student is enrolled
        if (!course.enrolledStudents.some(id => id.toString() === userId.toString())) {
            // Auto-enroll if not already enrolled
            course.enrolledStudents.push(userId);
        }
        
        // Initialize studentProgress if it doesn't exist
        if (!course.studentProgress) {
            course.studentProgress = [];
        }
        
        // Find the student's progress record
        let progressRecord = course.studentProgress.find(
            record => record.studentId && record.studentId.toString() === userId.toString()
        );
        
        // Create progress record if it doesn't exist
        if (!progressRecord) {
            course.studentProgress.push({
                studentId: userId,
                completedLessons: completed ? [lessonId] : [],
                lastAccessed: new Date()
            });
        } else {
            // Update existing progress record
            if (completed && !progressRecord.completedLessons.includes(lessonId)) {
                progressRecord.completedLessons.push(lessonId);
            } else if (!completed && progressRecord.completedLessons.includes(lessonId)) {
                progressRecord.completedLessons = progressRecord.completedLessons.filter(id => id !== lessonId);
            }
            progressRecord.lastAccessed = new Date();
        }
        
        await course.save();
        
        // Get updated progress record after saving
        const updatedProgress = course.studentProgress.find(
            record => record.studentId && record.studentId.toString() === userId.toString()
        );
        
        // Calculate progress percentage
        const totalLessons = course.materials.length || 1;
        const completedLessons = updatedProgress ? updatedProgress.completedLessons.length : 0;
        const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
        
        console.log(`Progress updated. Completed ${completedLessons}/${totalLessons} lessons (${progressPercentage}%)`);
        
        res.status(200).json({
            message: 'Progress updated successfully',
            progress: {
                courseId,
                completedLessons: updatedProgress ? updatedProgress.completedLessons : [],
                totalLessons,
                progressPercentage
            }
        });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ message: 'Error updating progress' });
    }
});

module.exports = router; 