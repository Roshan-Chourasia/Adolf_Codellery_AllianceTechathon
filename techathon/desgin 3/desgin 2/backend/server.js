require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const sessionRoutes = require('./routes/session');
const dashboardRoutes = require('./routes/dashboard');
const courseRoutes = require('./routes/courses');
const studentRoutes = require('./routes/student');
const studentsRoutes = require('./routes/students');
const uploadsRoutes = require('./routes/uploads');
const s3 = require('./config/s3');
const upload = require('./middleware/upload');
const authenticateToken = require('./middleware/auth');
const Course = require('./models/Course');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        // Set proper MIME type for video files
        if (filePath.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
        }
        // Enable CORS for video files
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/session', sessionRoutes);

// Serve index.html for the root route
app.use('/api/s3-test', (req, res) => {
    res.send('S3 integration is working');
});

// HTML Page Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../home.html'));
});

app.get('/home.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../home.html'));
});

app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../profile.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../register.html'));
});

app.get('/courses.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../courses.html'));
});

app.get('/course-detail.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../course-detail.html'));
});

app.get('/course-view.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../course-view.html'));
});

app.get('/course-form.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../course-form.html'));
});

app.get('/student-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../student-dashboard.html'));
});

app.get('/tutor-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../tutor-dashboard.html'));
});

app.get('/student-progress.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../student-progress.html'));
});

// Video upload route - support both S3 and local uploads
app.post('/api/uploads/video-upload-url', authenticateToken, async (req, res) => {
    try {
        const { fileName, fileType, courseId, lessonTitle, lessonDescription } = req.body;
        
        if (!fileName || !fileType || !courseId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Define port from the server configuration
        const PORT = process.env.PORT || 5001;
        
        // Base URL for video access
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Generate a unique file name to prevent collisions
        const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, '-')}`;
        let videoUrl = '';
        let localFilePath = '';
        let uploadUrl = '';
        
        // Try S3 first, fall back to local if needed
        try {
            // Get the upload URL from S3
            const s3Data = await s3.generateUploadUrl(uniqueFileName, fileType);
            uploadUrl = s3Data.uploadUrl;
            videoUrl = `${baseUrl}/api/video/${uniqueFileName}`; // Make it a complete URL
            console.log('S3 upload URL generated:', { uploadUrl: uploadUrl.substring(0, 50) + '...' });
        } catch (s3Error) {
            console.log('S3 upload failed, using local storage instead:', s3Error.message);
            
            // Fall back to local storage
            // Ensure uploads directory exists
            const uploadsDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Create a local path for the file
            localFilePath = path.join(uploadsDir, uniqueFileName);
            videoUrl = `${baseUrl}/uploads/${uniqueFileName}`; // Make it a complete URL
            
            // Generate a signed URL for the local file
            const localUrl = new URL(`${baseUrl}/api/uploads/local-upload`);
            localUrl.searchParams.append('filename', uniqueFileName);
            uploadUrl = localUrl.toString();
            console.log('Local upload URL generated:', uploadUrl);
        }
        
        // Prepare material data to add to the course
        const materialData = {
            title: lessonTitle || 'New Lesson',
            description: lessonDescription || '',
            type: 'video',
            videoUrl: videoUrl, // Use the full URL
            fileUrl: videoUrl, // For backward compatibility
            uploadDate: new Date(),
            duration: 0 // Will be updated later
        };
        
        res.json({
            uploadUrl,
            videoUrl,
            fileUrl: videoUrl, // For backward compatibility
            materialData: { materialData }
        });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ message: 'Failed to generate upload URL', error: error.message });
    }
});

// Handle local file uploads
app.post('/api/uploads/local-upload', upload.single('file'), (req, res) => {
    try {
        const { filename } = req.query;
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const uploadsDir = path.join(__dirname, 'uploads');
        const tempPath = req.file.path;
        const targetPath = path.join(uploadsDir, filename);
        
        // Move the file from temp to uploads directory
        fs.renameSync(tempPath, targetPath);
        
        res.status(200).json({ 
            message: 'File uploaded successfully',
            videoUrl: `/uploads/${filename}`
        });
    } catch (error) {
        console.error('Error uploading file locally:', error);
        res.status(500).json({ message: 'Failed to upload file', error: error.message });
    }
});

// Serve video files (both S3 and local)
app.get('/api/video/:key(*)', async (req, res, next) => {
    const key = req.params.key;
    
    if (!key) {
        return res.status(400).json({ message: 'No video key provided' });
    }
    
    // Check if this is a local file path (/uploads/filename)
    if (key.startsWith('/uploads/')) {
        // Handle local video streaming
        const filePath = path.join(__dirname, key);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Video file not found' });
        }
        
        // Stream the file
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
            // Handle range request
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4'
            });
            
            file.pipe(res);
        } else {
            // Send full file
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4'
            });
            
            fs.createReadStream(filePath).pipe(res);
        }
        return; // End the request here
    }
    
    // Try S3 first
    try {
        // Get a signed URL for reading from S3
        const signedUrl = await s3.getReadUrl(key);
        
        // Redirect to the signed URL
        return res.redirect(signedUrl);
    } catch (s3Error) {
        console.error('Error getting S3 URL:', s3Error);
        
        // Try to find the file in local uploads as fallback
        const localPath = path.join(__dirname, 'uploads', key);
        if (fs.existsSync(localPath)) {
            // Stream the local file
            const stat = fs.statSync(localPath);
            const fileSize = stat.size;
            const range = req.headers.range;
            
            if (range) {
                // Handle range request
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunkSize = (end - start) + 1;
                const file = fs.createReadStream(localPath, { start, end });
                
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': 'video/mp4'
                });
                
                file.pipe(res);
            } else {
                // Send full file
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4'
                });
                
                fs.createReadStream(localPath).pipe(res);
            }
            return;
        }
        
        // File not found in either S3 or local
        return res.status(404).json({ message: 'Video not found' });
    }
});

// Serve local upload files directly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add video to course after upload
app.post('/api/uploads/add-video-to-course', authenticateToken, async (req, res) => {
    try {
        const { courseId, materialData } = req.body;
        
        if (!courseId || !materialData) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        console.log('Adding video to course:', courseId);
        console.log('Material data:', JSON.stringify(materialData));
        
        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Format the material data based on whether it's from S3 or local upload
        const newMaterial = {
            title: materialData.materialData.title || 'Lesson',
            description: materialData.materialData.description || '',
            type: 'video',
            videoUrl: materialData.materialData.videoUrl, // This is the URL we'll use to access the video
            fileUrl: materialData.materialData.videoUrl, // For backward compatibility
            createdAt: new Date()
        };
        
        // Add to course materials
        course.materials.push(newMaterial);
        await course.save();
        
        res.status(200).json({ 
            success: true, 
            message: 'Video added to course successfully',
            material: newMaterial
        });
    } catch (error) {
        console.error('Error adding video to course:', error);
        res.status(500).json({ message: 'Failed to add video to course', error: error.message });
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    res.status(500).json({ 
        msg: 'Something went wrong!', 
        error: err.message,
        path: req.path
    });
});

// Start server with error handling
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
}); 