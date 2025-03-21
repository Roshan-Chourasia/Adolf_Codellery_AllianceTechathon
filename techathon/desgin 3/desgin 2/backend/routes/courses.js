const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const { generateUploadUrl, getVideoUrl, deleteVideo } = require('../config/s3');
const StudentProgress = require('../models/StudentProgress');
const User = require('../models/User');

// Configure multer for video upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'videos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: function (req, file, cb) {
        if (!file.mimetype.startsWith('video/')) {
            return cb(new Error('Only video files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Upload video
router.post('/upload-video', auth, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('No file received in upload-video endpoint');
            return res.status(400).json({ msg: 'No video file uploaded' });
        }

        // Log detailed file information
        console.log('Uploaded file details:', {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        // Verify file exists
        if (!fs.existsSync(req.file.path)) {
            console.error('File does not exist at path:', req.file.path);
            return res.status(500).json({ msg: 'File was not saved correctly' });
        }

        // Create the file URL with the correct path
        const fileUrl = `/uploads/videos/${req.file.filename}`;
        console.log('Generated file URL:', fileUrl);

        res.json({ 
            msg: 'Video uploaded successfully',
            fileUrl: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({ 
            msg: 'Error uploading video',
            error: error.message,
            stack: error.stack
        });
    }
});

// Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find().populate('tutorId', 'name');
        res.json(courses);
    } catch (error) {
        res.status(500).json({ msg: 'Error fetching courses' });
    }
});

// Get tutor's courses
router.get('/my-courses', auth, async (req, res) => {
    try {
        console.log('Fetching courses for user:', req.user._id, 'with role:', req.user.role);
        
        let courses = [];
        
        // If user is a tutor, show courses they created
        if (req.user.role === 'tutor') {
            console.log('User is a tutor, fetching created courses');
            courses = await Course.find({ tutorId: req.user._id })
                .sort({ createdAt: -1 }); // Sort by newest first
            console.log('Found tutor courses:', courses.length);
        } 
        // If user is a student, show enrolled courses
        else if (req.user.role === 'student') {
            console.log('User is a student, fetching enrolled courses');
            courses = await Course.find({ 
                'enrolledStudents.studentId': req.user._id 
            })
            .sort({ createdAt: -1 });
            console.log('Found student courses:', courses.length);
        }
        // For any role (or if role is undefined), return courses
        else {
            console.log('User role not recognized or missing, returning all courses');
            courses = await Course.find().sort({ createdAt: -1 });
            console.log('Found all courses:', courses.length);
        }

        if (!courses || courses.length === 0) {
            console.log('No courses found');
            return res.json([]);
        }

        console.log('Courses data:', JSON.stringify(courses, null, 2));
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ 
            msg: 'Error fetching courses',
            error: error.message,
            stack: error.stack
        });
    }
});

// Get course details
router.get('/:id', auth, async (req, res) => {
    try {
        console.log('Fetching course details for course ID:', req.params.id);
        const course = await Course.findById(req.params.id)
            .populate('tutorId', 'name email')
            .select('-__v');

        if (!course) {
            console.log('Course not found with ID:', req.params.id);
            return res.status(404).json({ msg: 'Course not found' });
        }

        console.log('Course found:', course.title);
        
        // Add tutor property for backward compatibility
        const responseData = course.toObject();
        if (responseData.tutorId) {
            responseData.tutor = responseData.tutorId;
        }

        // Get student's progress for this course if the user is a student
        if (req.user.role === 'student') {
            const studentProgress = await StudentProgress.findOne({
                student: req.user._id,
                course: req.params.id
            });

            if (studentProgress) {
                responseData.userProgress = {
                    completedLessons: studentProgress.completedLessons,
                    progress: studentProgress.progress,
                    lastAccessed: studentProgress.lastAccessed
                };
            }
        }

        res.json(responseData);
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ 
            msg: 'Error fetching course details',
            error: error.message
        });
    }
});

// Get upload URL for video
router.get('/upload-url', auth, async (req, res) => {
    try {
        const { fileName, fileType } = req.query;
        if (!fileName || !fileType) {
            return res.status(400).json({ msg: 'File name and type are required' });
        }

        const uploadUrl = await generateUploadUrl(fileName, fileType);
        const videoUrl = getVideoUrl(fileName);

        res.json({ uploadUrl, videoUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ 
            msg: 'Error generating upload URL',
            error: error.message
        });
    }
});

// Create course
router.post('/', auth, async (req, res) => {
    try {
        console.log('Received course data:', JSON.stringify(req.body, null, 2));
        console.log('User ID:', req.user._id);

        const {
            title,
            description,
            subject,
            price,
            duration,
            level,
            materials
        } = req.body;

        // Validate required fields
        if (!title || !description || !subject || !price || !duration || !level) {
            return res.status(400).json({ 
                msg: 'All fields are required',
                missing: {
                    title: !title,
                    description: !description,
                    subject: !subject,
                    price: !price,
                    duration: !duration,
                    level: !level
                }
            });
        }

        // Validate numeric fields
        if (isNaN(price) || price <= 0) {
            return res.status(400).json({ msg: 'Price must be a positive number' });
        }
        if (isNaN(duration) || duration <= 0) {
            return res.status(400).json({ msg: 'Duration must be a positive number' });
        }

        // Validate level
        const validLevels = ['beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced'];
        if (!validLevels.includes(level)) {
            return res.status(400).json({ msg: 'Invalid course level' });
        }

        // Parse materials if needed
        let parsedMaterials = materials || [];
        if (typeof materials === 'string') {
            try {
                parsedMaterials = JSON.parse(materials);
            } catch (err) {
                console.error('Error parsing materials string:', err);
                parsedMaterials = [];
            }
        }

        // Ensure materials is always an array
        if (!Array.isArray(parsedMaterials)) {
            parsedMaterials = [];
        }

        // Create the course data
        const courseData = {
            tutorId: req.user._id,
            title: title.trim(),
            description: description.trim(),
            subject: subject.trim(),
            price: parseFloat(price),
            duration: parseInt(duration),
            level: level,
            materials: parsedMaterials.map(material => ({
                title: material.title || 'Untitled',
                type: material.type || 'video',
                url: material.url || material.fileUrl || '',
                duration: material.duration || 0
            }))
        };

        console.log('Creating course with data:', JSON.stringify(courseData, null, 2));

        const course = new Course(courseData);
        await course.save();
        
        console.log('Course created successfully:', course._id);
        res.status(201).json(course);
    } catch (error) {
        console.error('Course creation error:', error);
        res.status(500).json({ 
            msg: 'Error creating course',
            error: error.message,
            details: error.errors
        });
    }
});

// Update course
router.put('/:id', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        // Check if user is the tutor of this course
        if (course.tutorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ msg: 'Not authorized to update this course' });
        }

        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(updatedCourse);
    } catch (error) {
        res.status(500).json({ msg: 'Error updating course' });
    }
});

// Delete course
router.delete('/:id', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        // Check if user is the tutor of this course
        if (course.tutorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ msg: 'Not authorized to delete this course' });
        }

        // Delete videos from S3
        if (course.materials && course.materials.length > 0) {
            for (const material of course.materials) {
                if (material.fileUrl) {
                    const fileName = path.basename(material.fileUrl);
                    await deleteVideo(fileName);
                }
            }
        }

        await course.remove();
        res.json({ msg: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ msg: 'Error deleting course' });
    }
});

// Enroll in a course
router.post('/:id/enroll', auth, async (req, res) => {
    try {
        console.log('Enrolling student in course:', req.params.id);
        
        const course = await Course.findById(req.params.id);
        console.log('Course found:', course ? 'Yes' : 'No');

        if (!course) {
            console.log('Course not found');
            return res.status(404).json({ msg: 'Course not found' });
        }

        // Check if already enrolled
        const alreadyEnrolled = course.enrolledStudents.some(
            enrollment => enrollment.studentId && enrollment.studentId.toString() === req.user._id.toString()
        );
        
        if (alreadyEnrolled) {
            console.log('Student already enrolled');
            return res.status(400).json({ msg: 'Already enrolled in this course' });
        }

        // Add student to enrolled list
        course.enrolledStudents.push({
            studentId: req.user._id,
            enrolledAt: new Date(),
            progress: 0
        });

        await course.save();
        console.log('Student enrolled successfully');

        res.json({ msg: 'Successfully enrolled in course' });
    } catch (error) {
        console.error('Course enrollment error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Update course progress
router.post('/:id/progress', auth, async (req, res) => {
    try {
        const courseId = req.params.id;
        const { lessonIndex, completed } = req.body;
        const userId = req.user._id;

        // Find the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        // Find or create student progress
        let studentProgress = await StudentProgress.findOne({
            student: userId,
            course: courseId
        });

        if (!studentProgress) {
            studentProgress = new StudentProgress({
                student: userId,
                course: courseId,
                completedLessons: [],
                lastAccessed: new Date()
            });
        }

        // Update lesson completion status
        if (completed && !studentProgress.completedLessons.includes(lessonIndex)) {
            studentProgress.completedLessons.push(lessonIndex);
        }

        // Calculate overall progress
        const totalLessons = course.materials.length;
        const completedLessons = studentProgress.completedLessons.length;
        const progress = (completedLessons / totalLessons) * 100;

        // Update last accessed time
        studentProgress.lastAccessed = new Date();

        // Save progress
        await studentProgress.save();

        // Update course enrollment if not already enrolled
        if (!course.enrolledStudents.includes(userId)) {
            course.enrolledStudents.push(userId);
            await course.save();
        }

        res.json({
            msg: 'Progress updated successfully',
            progress,
            completedLessons: studentProgress.completedLessons,
            totalLessons
        });

    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ msg: 'Error updating progress' });
    }
});

// @route   GET api/courses/tutor
// @desc    Get courses by logged-in tutor
// @access  Private (tutor only)
router.get('/tutor', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (user.role !== 'tutor') {
            return res.status(403).json({ msg: 'Access denied. Only tutors can access this resource.' });
        }

        const courses = await Course.find({ tutorId: req.user.id })
            .populate('tutorId', 'name')
            .sort({ createdAt: -1 });

        // Add enrollment count and average rating to each course
        const enhancedCourses = courses.map(course => {
            const enrolledCount = course.enrolledStudents ? course.enrolledStudents.length : 0;
            
            let averageRating = 0;
            if (course.ratings && course.ratings.length > 0) {
                const totalRating = course.ratings.reduce((sum, rating) => sum + rating.value, 0);
                averageRating = totalRating / course.ratings.length;
            }

            return {
                ...course.toObject(),
                enrolledCount,
                averageRating
            };
        });

        res.json({ courses: enhancedCourses });
    } catch (err) {
        console.error('Error fetching tutor courses:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// Add material to course
router.post('/:id/add-material', auth, async (req, res) => {
    try {
        const courseId = req.params.id;
        const materialData = req.body;
        
        if (!materialData.title || (!materialData.fileUrl && !materialData.videoUrl)) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }
        
        // Find the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        
        // Verify user has permission to add materials
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to add materials to this course' });
        }
        
        // Prepare the material object
        const newMaterial = {
            title: materialData.title,
            description: materialData.description || '',
            type: materialData.type || 'video',
            videoUrl: materialData.videoUrl || materialData.fileUrl,
            fileUrl: materialData.fileUrl || materialData.videoUrl,
            duration: materialData.duration || 0
        };
        
        // Add to course materials
        course.materials.push(newMaterial);
        await course.save();
        
        res.json({ 
            msg: 'Material added to course',
            course: course
        });
    } catch (error) {
        console.error('Error adding material to course:', error);
        res.status(500).json({ 
            msg: 'Error adding material to course', 
            error: error.message 
        });
    }
});

module.exports = router; 