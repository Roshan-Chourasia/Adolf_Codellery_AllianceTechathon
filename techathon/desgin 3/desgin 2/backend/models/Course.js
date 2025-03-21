const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true,
        enum: ['Mathematics', 'Science', 'History', 'Literature', 'Computer Science', 'Art', 'Music', 'Physical Education', 'Languages', 'Other']
    },
    level: {
        type: String,
        required: true,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'beginner', 'intermediate', 'advanced'],
        set: function(val) {
            if (val) {
                return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
            }
            return val;
        }
    },
    duration: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    materials: [{
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            enum: ['video', 'document', 'quiz'],
            default: 'video'
        },
        fileUrl: {
            type: String,
            required: function() {
                return !this.videoUrl; // Only required if videoUrl is not provided
            }
        },
        videoUrl: {
            type: String,
            required: function() {
                return !this.fileUrl; // Only required if fileUrl is not provided
            }
        },
        thumbnailUrl: {
            type: String,
            default: ''
        },
        duration: {
            type: Number,
            default: 0
        }
    }],
    // Store just the student IDs for quick access
    enrolledStudents: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        enrollmentDate: {
            type: Date,
            default: Date.now
        },
        completedLessons: [String],
        progress: {
            type: Number,
            default: 0
        }
    }],
    // Detailed progress tracking for each student
    studentProgress: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        completedLessons: [{
            type: String  // Stores material/lesson IDs
        }],
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        lastAccessed: {
            type: Date,
            default: Date.now
        }
    }],
    completedStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    image: {
        type: String,
        default: 'images/default-course.jpg'
    },
    ratings: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        value: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        date: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Create index for searching
courseSchema.index({ title: 'text', description: 'text', subject: 'text' });

module.exports = mongoose.model('Course', courseSchema); 