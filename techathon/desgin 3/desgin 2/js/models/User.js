const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    profileImage: { type: String, default: "images/default.jpg" },
    progress: {
        completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }], // Courses user completed
        savedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }], // Saved videos
        quizScores: [{ 
            courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
            score: Number 
        }] // Stores quiz scores
    }
});

module.exports = mongoose.model("User", UserSchema);
