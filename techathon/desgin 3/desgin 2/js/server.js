const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth"); // ✅ Ensure this file exists

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json()); // ✅ Required to handle JSON requests

// ✅ Register Authentication Routes
app.use("/api", authRoutes); // ✅ Enables /api/register

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB ✅"))
    .catch(err => console.error("MongoDB connection error ❌", err));

// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // ✅ Debugging: Show registered routes
    console.log("Checking registered routes...");
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            console.log(`- ${middleware.route.path}`);
        } else if (middleware.name === "router") {
            middleware.handle.stack.forEach((route) => {
                if (route.route) {
                    console.log(`- /api${route.route.path}`);
                }
            });
        }
    });
});

