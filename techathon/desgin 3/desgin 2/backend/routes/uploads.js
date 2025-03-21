const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const s3 = require('../config/s3');
const Course = require('../models/Course');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const multer = require('multer');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage as fallback
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    }
});

// Log AWS configuration at startup
console.log('AWS configuration:');
console.log('Region:', process.env.AWS_REGION);
console.log('Bucket:', process.env.AWS_BUCKET_NAME);
console.log('Access Key ID length:', process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.length : 'not set');
console.log('Secret Access Key set:', process.env.AWS_SECRET_ACCESS_KEY ? 'yes' : 'no');

// Test S3 connectivity
let isS3Accessible = false;
async function testS3Connectivity() {
    try {
        await s3.listObjects({
            Bucket: process.env.AWS_BUCKET_NAME,
            MaxKeys: 1
        }).promise();
        console.log('S3 connection successful - bucket is accessible');
        isS3Accessible = true;
        return true;
    } catch (error) {
        console.error('S3 connection test failed:', error.message);
        console.log('Will use local file storage as fallback');
        isS3Accessible = false;
        return false;
    }
}

// Run the test immediately
testS3Connectivity();

// Test the S3 connection
router.get('/test-s3', async (req, res) => {
    try {
        const result = await testS3Connectivity();
        if (result) {
            return res.status(200).json({ message: 'S3 connection successful' });
        } else {
            return res.status(500).json({ message: 'S3 connection failed, using local storage' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Generate a signed URL for video upload
router.post('/video-upload-url', auth, async (req, res) => {
    try {
        const { fileName, fileType, courseId, lessonTitle, lessonDescription } = req.body;
        
        if (!fileName || !fileType || !courseId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if the course exists and user has permission
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if the current user is the tutor for this course
        if (course.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to upload to this course' });
        }

        // Generate unique filename
        const key = `courses/${courseId}/videos/${Date.now()}-${path.basename(fileName)}`;
        const videoUrl = `${req.protocol}://${req.get('host')}/api/video/${key}`;
        
        let uploadUrl = null;
        let materialData = null;

        if (isS3Accessible) {
            try {
                // Get signed URL for S3 upload
                uploadUrl = await s3.getSignedUrlPromise('putObject', {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key,
                    ContentType: fileType,
                    Expires: 600 // URL expires in 10 minutes
                });
                
                // Prepare material data
                materialData = {
                    materialData: {
                        title: lessonTitle || 'New Lesson',
                        description: lessonDescription || '',
                        type: 'video',
                        fileName: fileName,
                        fileUrl: videoUrl,
                        s3Key: key,
                        duration: 0, // Will be updated later
                        uploadMethod: 's3'
                    }
                };
                
                console.log('Generated S3 upload URL for:', key);
            } catch (error) {
                console.error('Error generating S3 upload URL:', error);
                isS3Accessible = false;
                // Continue with local fallback
            }
        }
        
        // If S3 is not accessible or there was an error, use local upload
        if (!isS3Accessible || !uploadUrl) {
            console.log('Using local upload fallback');
            // For local storage, we'll return a URL that points to our local upload endpoint
            uploadUrl = `${req.protocol}://${req.get('host')}/api/uploads/direct-upload/${courseId}`;
            
            // Prepare material data for local storage
            materialData = {
                materialData: {
                    title: lessonTitle || 'New Lesson',
                    description: lessonDescription || '',
                    type: 'video',
                    fileName: fileName,
                    fileUrl: videoUrl,
                    s3Key: null,
                    localPath: key,
                    duration: 0,
                    uploadMethod: 'local'
                }
            };
        }

        return res.json({
            uploadUrl,
            videoUrl,
            fileName,
            materialData
        });
    } catch (error) {
        console.error('Error in video-upload-url:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Direct upload endpoint as fallback when S3 is not available
router.post('/direct-upload/:courseId', auth, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const courseId = req.params.courseId;
        const { title, description } = req.body;

        // Check if the course exists and user has permission
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if the current user is the tutor for this course
        if (course.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to upload to this course' });
        }

        // Create the video URL
        const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // Add to course materials
        const materialData = {
            title: title || 'New Lesson',
            description: description || '',
            type: 'video',
            fileName: req.file.originalname,
            fileUrl: videoUrl,
            s3Key: null,
            localPath: req.file.path,
            duration: 0,
            uploadMethod: 'local'
        };

        course.materials.push(materialData);
        await course.save();

        return res.json({
            success: true,
            videoUrl,
            materialData
        });
    } catch (error) {
        console.error('Error in direct-upload:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add the uploaded video to course materials
router.post('/add-video-to-course', auth, async (req, res) => {
    try {
        const { courseId, materialData } = req.body;
        
        if (!courseId || !materialData) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if the course exists and user has permission
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if the current user is the tutor for this course
        if (course.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to add materials to this course' });
        }

        // Add the material to the course
        course.materials.push(materialData);
        await course.save();

        return res.json({
            success: true,
            course
        });
    } catch (error) {
        console.error('Error adding video to course:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Check upload status (can be used to poll for status if needed)
router.get('/upload-status/:key', auth, async (req, res) => {
    try {
        const key = req.params.key;
        
        // If using S3, check if the object exists
        if (isS3Accessible) {
            try {
                await s3.headObject({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                }).promise();
                
                return res.json({
                    status: 'completed',
                    key
                });
            } catch (error) {
                return res.json({
                    status: 'pending',
                    key,
                    error: error.message
                });
            }
        } else {
            // For local storage, check if the file exists
            const localPath = path.join(uploadDir, key);
            if (fs.existsSync(localPath)) {
                return res.json({
                    status: 'completed',
                    key
                });
            } else {
                return res.json({
                    status: 'pending',
                    key
                });
            }
        }
    } catch (error) {
        console.error('Error checking upload status:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Generate upload URL for video thumbnail
router.post('/thumbnail-upload-url', auth, async (req, res) => {
    try {
        const { fileName, fileType, courseId, videoKey } = req.body;
        
        if (!fileName || !fileType || !courseId || !videoKey) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if the course exists and user has permission
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if the current user is the tutor for this course
        if (course.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to upload to this course' });
        }

        // Generate unique filename for thumbnail
        const key = `courses/${courseId}/thumbnails/${Date.now()}-${path.basename(fileName)}`;
        const thumbnailUrl = `${req.protocol}://${req.get('host')}/api/uploads/thumbnails/${key}`;
        
        let uploadUrl = null;

        if (isS3Accessible) {
            try {
                // Get signed URL for S3 upload
                uploadUrl = await s3.getSignedUrlPromise('putObject', {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key,
                    ContentType: fileType,
                    Expires: 600 // URL expires in 10 minutes
                });
                
                console.log('Generated thumbnail upload URL for:', key);
            } catch (error) {
                console.error('Error generating thumbnail upload URL:', error);
                isS3Accessible = false;
            }
        }
        
        // For local storage or if S3 failed
        if (!isS3Accessible || !uploadUrl) {
            uploadUrl = `${req.protocol}://${req.get('host')}/api/uploads/direct-thumbnail/${courseId}/${videoKey}`;
        }

        return res.json({
            uploadUrl,
            thumbnailUrl,
            fileName,
            key
        });
    } catch (error) {
        console.error('Error in thumbnail-upload-url:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 