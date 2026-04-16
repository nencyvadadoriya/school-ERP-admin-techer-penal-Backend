# School ERP System - Backend API (MongoDB)

## Overview
This is the backend API for the School ERP System built with Node.js, Express, and **MongoDB**.

## Features
- RESTful API architecture
- JWT-based authentication
- Role-based access control (Admin, Teacher, Student)
- **MongoDB with Mongoose ODM**
- Cloudinary integration for image uploads
- Comprehensive error handling
- Input validation

## Tech Stack
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL Database
- **Mongoose** - MongoDB ODM
- **Cloudinary** - Image hosting
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Cloudinary account

### Steps

1. Install dependencies:
```bash
npm install
```

2. **MongoDB Setup:**

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# Start MongoDB service
mongod

# MongoDB will create the database automatically when you start the server
```

**Option B: MongoDB Atlas (Cloud - Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Use it in your .env file

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```env
PORT=5000
NODE_ENV=development

# For Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/school_erp

# For MongoDB Atlas (Cloud):
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school_erp?retryWrites=true&w=majority

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FRONTEND_URL=http://localhost:3000
```

5. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Database Structure

MongoDB will automatically create collections when you insert data. The main collections are:

- **admins** - Admin users
- **teachers** - Teacher records
- **students** - Student records
- **classes** - Class information
- **subjects** - Subject catalog
- **attendances** - Attendance records
- **exams** - Examination details
- **examresults** - Exam results
- **homeworks** - Homework assignments
- **notices** - Announcements
- **feesemis** - Fee payment records
- **timetables** - Class schedules
- **events** - School events
- **studentleaves** - Student leave applications
- **teacherleaves** - Teacher leave applications

## API Endpoints

### Admin Routes
- `POST /api/admin/register` - Register new admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin` - Get all admins (Admin only)
- `GET /api/admin/:id` - Get single admin (Admin only)
- `PATCH /api/admin/:id` - Update admin (Admin only)
- `DELETE /api/admin/:id` - Delete admin (Admin only)

### Teacher Routes
- `POST /api/teacher/register` - Register new teacher (Admin only)
- `POST /api/teacher/login` - Teacher login
- `GET /api/teacher` - Get all teachers
- `GET /api/teacher/:id` - Get single teacher
- `PATCH /api/teacher/:id` - Update teacher
- `DELETE /api/teacher/:id` - Delete teacher (Admin only)

### Student Routes
- `POST /api/student/register` - Register new student (Admin only)
- `POST /api/student/login` - Student login
- `GET /api/student` - Get all students
- `GET /api/student/:id` - Get single student
- `PATCH /api/student/:id` - Update student
- `DELETE /api/student/:id` - Delete student (Admin only)

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Creating First Admin

After starting the server, you can create the first admin by sending a POST request:

```bash
curl -X POST http://localhost:5000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Super",
    "last_name": "Admin",
    "email": "admin@school.com",
    "password": "Admin@123",
    "phone": "1234567890",
    "pin": "380001"
  }'
```

Or use the frontend registration form.

## Differences from PostgreSQL Version

### MongoDB Advantages:
1. **No Schema Setup Required** - Collections are created automatically
2. **Flexible Schema** - Easy to add new fields
3. **Easy to Install** - No complex database setup
4. **MongoDB Atlas** - Free cloud hosting available
5. **JSON-like Documents** - Natural fit for Node.js

### Key Changes:
- Uses Mongoose instead of pg (PostgreSQL client)
- MongoDB ObjectId instead of serial integers
- Collections instead of tables
- Documents instead of rows
- No need to run SQL schema files
- Automatic timestamps with Mongoose

## Project Structure
```
backend/
├── config/
│   ├── database.js       # MongoDB connection
│   └── cloudinary.js     # Cloudinary setup
├── controllers/
│   ├── adminController.js
│   ├── teacherController.js
│   └── studentController.js
├── middleware/
│   ├── auth.js           # Authentication middleware
│   └── upload.js         # File upload middleware
├── models/               # Mongoose models
│   ├── Admin.js
│   ├── Teacher.js
│   ├── Student.js
│   ├── Class.js
│   └── Subject.js
├── routes/
│   ├── adminRoutes.js
│   ├── teacherRoutes.js
│   └── studentRoutes.js
├── uploads/              # Temporary upload directory
├── .env.example
├── package.json
└── server.js             # Main application file
```

## Environment Variables
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/school_erp
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

## MongoDB Atlas Setup (Free Cloud Database)

1. **Create Account**: Go to https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: Choose free tier (M0)
3. **Create Database User**: 
   - Username: your_username
   - Password: your_password
4. **Whitelist IP**: Add your IP or use 0.0.0.0/0 for all IPs
5. **Get Connection String**: Click "Connect" → "Connect your application"
6. **Update .env**: 
   ```
   MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/school_erp?retryWrites=true&w=majority
   ```

## Troubleshooting

### Connection Issues
```bash
# Check if MongoDB is running (local)
mongosh

# Test connection string
node -e "const mongoose = require('mongoose'); mongoose.connect('your_connection_string').then(() => console.log('Connected!')).catch(err => console.error(err));"
```

### Common Errors

**Error: MongooseServerSelectionError**
- Check if MongoDB is running
- Verify connection string in .env
- Check network access in MongoDB Atlas

**Error: Authentication failed**
- Verify username/password in connection string
- Check database user permissions

## License
MIT
