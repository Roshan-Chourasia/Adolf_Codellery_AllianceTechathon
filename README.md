# Education Platform - विद्या

A modern, responsive education platform built with HTML, CSS, and JavaScript that connects students with tutors for online learning.

![Education Platform](images/logo.png)

## 🌟 Features

#####Video link : https://github.com/Roshan-Chourasia/Adolf_Codellery_AllianceTechathon/blob/main/techathon.mp4

### For Students
- Browse and enroll in courses
- Track learning progress
- Watch video lectures
- Interact with tutors
- View course materials
- Track completion status

### For Tutors
- Create and manage courses
- Upload video content
- Track student progress
- Manage availability
- Set pricing and schedules
- View analytics

### General Features
- Responsive design for all devices
- Dark mode support
- User authentication
- Role-based access control
- Real-time progress tracking
- Interactive UI elements

## 🛠️ Technologies Used

- **Frontend:**
  - HTML5
  - CSS3 (with CSS Variables)
  - JavaScript (ES6+)
  - Font Awesome Icons

- **Backend:**
  - Node.js
  - Express.js
  - MongoDB
  - JWT Authentication
  - AWS S3 (for video storage)

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- AWS Account (for video storage)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/education-platform.git
cd education-platform
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory
```env
JWT_SECRET=your-super-secret-key-here
MONGODB_URI=mongodb://localhost:27017/education-platform
PORT=5001
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region
AWS_BUCKET_NAME=your-bucket-name
```

4. Start the development server
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5001`

## 📁 Project Structure

```
education-platform/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   └── routes/
├── css/
│   ├── style.css
│   └── dashboard.css
├── js/
│   ├── script.js
│   ├── videoPlayer.js
│   └── videoUploader.js
├── images/
├── uploads/
└── public/
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- XSS protection
- CSRF protection
- Secure file uploads
- Role-based access control

## 🎨 UI/UX Features

- Responsive design
- Dark mode support
- Smooth animations
- Loading states
- Error handling
- Form validation
- Interactive elements

## 📱 Responsive Design

The platform is fully responsive and works on:
- Desktop (1200px and above)
- Tablet (768px to 1199px)
- Mobile (below 768px)

## 🔄 API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/verify

### Courses
- GET /api/courses
- POST /api/courses
- GET /api/courses/:id
- PUT /api/courses/:id
- DELETE /api/courses/:id

### Users
- GET /api/users/profile
- PUT /api/users/profile
- GET /api/users/courses
- POST /api/users/enroll

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Font Awesome for icons
- MongoDB for database
- AWS for video storage
- All contributors who helped with the project

## 📞 Support

For support, email support@educationplatform.com or create an issue in the repository.

---

Made with ❤️ by [Your Name] 
