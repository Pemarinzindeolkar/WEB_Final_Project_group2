## GitHub link 
https://github.com/Pemarinzindeolkar/WEB_Final_Project_group2
# CST Library Study Hall Seat Booking System

A web-based seat booking system for the College of Science and Technology (CST) library and study hall, built using HTML5, CSS3, and JavaScript.

---

## Overview

Students at CST spend between 7 to 10 hours on campus daily, making the library and study hall frequently overcrowded. This system solves that by allowing students to check seat availability and make bookings in advance, while giving administrators real-time tools to manage occupancy.

---

## Features

### Student Portal
- Register and log in with a student ID and password
- View real-time seat availability in a visual floor layout
- Book seats and view booking history with date/status filters
- Save favourite seat preferences and enable email reminders
- Session persistence via `localStorage` (stays logged in after page refresh)

### Admin Portal
- Secure login with username and password
- Live statistics dashboard (total, available, booked seats, active bookings, registered students)
- Visual seat management across both floors
- Verify student arrival and remove/cancel bookings
- View all bookings in a sortable table

### General
- Fully responsive design (desktop and mobile)
- Single shared stylesheet (`style.css`) for consistent UI across all pages
- Real-time updates via the JavaScript Fetch API (no page reloads)
- Color-coded seat indicators: 🔵 Available &nbsp; 🔴 Booked &nbsp; 🟢 Verified

---

## Project Structure

```
├── index.html            # Landing page with portal navigation and live stats
├── student.html          # Student portal (login, signup, booking, preferences)
├── admin.html            # Admin portal (dashboard, seat management, bookings)
├── reset-password.html   # Password reset page (accessed via email link)
├── style.css             # Shared stylesheet for all pages
├── script.js             # JavaScript for the registration-based flow
└── admin-script.js       # Admin-specific JavaScript logic
```

---

## Pages

### `index.html` — Landing Page
Entry point of the application. Displays portal navigation buttons and automatically fetches live seat statistics from `/api/admin/statistics`.

### `student.html` — Student Portal
The main student interface. Sections are shown or hidden dynamically based on login status. Communicates with the backend via:
- `POST /api/student/signup`
- `POST /api/student/login`
- `GET /api/admin/seats`
- `GET /api/student/my-bookings-filtered/`
- `PUT` (preferences update)

### `admin.html` — Admin Portal
Secured dashboard hidden until valid credentials are entered. Communicates with:
- `POST /api/admin/login`
- `GET /api/admin/statistics`
- `GET /api/admin/seats`
- `GET /api/admin/bookings`
- `POST /api/admin/verify/:id`
- `DELETE /api/admin/booking/:id`

### `reset-password.html` — Password Reset
Accessed via a link sent to the student's registered email. Reads a reset token from URL parameters and posts new credentials to `/api/student/reset-password`.

---

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and semantic markup |
| CSS3 | Styling, layout, and responsive design |
| JavaScript (ES6+) | Interactivity, DOM manipulation, API calls |
| Fetch API | Async communication with the backend |
| CSS Grid | Responsive seat and card layouts |
| Media Queries | Mobile-friendly breakpoints (768px) |
| localStorage | Client-side session management |

---

## Design Decisions

- **Color theme:** Blue gradient (`#87CEEB` to `#4A90E2`) for backgrounds and primary actions; red for destructive actions; grey for navigation
- **Seat layout:** Four circular seat indicators positioned around a brown rectangular table using absolute CSS positioning
- **Responsive grid:** `repeat(auto-fill, minmax(280px, 1fr))` for fluid table card layouts
- **Single stylesheet:** All pages share `style.css` for visual consistency

---

## Challenges

- Managing dynamic UI states on single-page portals without a framework
- Designing an accurate, color-coded visual seat layout responsive across screen sizes
- Implementing session management and frontend access control with `localStorage`
- Integrating multiple API endpoints cleanly with error handling and live DOM updates

---


# Library Seat Booking System - Backend (WEB102)

##  Project Overview

The Library Seat Booking System is a comprehensive backend solution designed to manage seat reservations for the College of Science and Technology (CST) library. The system handles student authentication, seat booking with automatic 30-minute expiry, admin verification for future reservations, and real-time seat status tracking across 200 seats distributed over two floors (25 tables × 4 chairs per floor).

This repository contains the complete backend implementation for the WEB102 module.

---

##  Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | v20.20.2 | JavaScript runtime |
| Express.js | v4.22.2 | Web framework |
| PostgreSQL | v18 | Relational database |
| bcryptjs | v2.4.3 | Password hashing |
| JSON Web Token | v9.0.3 | Authentication |
| Nodemailer | v8.0.7 | Email service (mock mode) |
| dotenv | v16.6.1 | Environment configuration |

---

##  Project Structure

```
library-backend/
├── server.js                 # Entry point - Express server setup
├── database.js               # PostgreSQL connection & initialization
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (not committed)
├── .node-version             # Node.js version pinning
│
├── controllers/              # Business logic
│   ├── studentController.js  # Student operations (signup, login, booking)
│   └── adminController.js    # Admin operations (login, verify, remove)
│
├── routes/                   # API route definitions
│   ├── studentRoutes.js      # Student endpoints
│   └── adminRoutes.js        # Admin endpoints
│
├── middleware/               # Authentication middleware
│   └── auth.js               # JWT verification (ready for production)
│
├── config/                   # Configuration files
│   └── email.js              # Email service (mock mode)
│
├── utils/                    # Utility functions
│   └── reminderScheduler.js  # Automated email reminders
│
└── frontend/                 # Static frontend files (WEB101)
    ├── index.html
    ├── student.html
    ├── admin.html
    ├── style.css
    └── script.js
```

---

## Database Schema

The database consists of 6 main tables:

| Table | Description |
|-------|-------------|
| students | Student accounts with hashed passwords |
| seats | 200 seats across 2 floors (25 tables × 4 chairs) |
| bookings | Seat reservations with verification status |
| admins | Administrator accounts |
| student_preferences | Favorite seats and notification settings |
| password_resets | Password reset tokens |

### Seat Distribution

| Floor | Tables | Chairs per Table | Total Seats |
|-------|--------|------------------|-------------|
| Ground Floor | 25 | 4 | 100 |
| First Floor | 25 | 4 | 100 |
| **Total** | **50** | - | **200** |

---

## API Endpoints

### Student Routes (`/api/student`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Create new student account |
| POST | `/login` | Student login |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |
| GET | `/preferences/:student_id` | Get student preferences |
| PUT | `/preferences/:student_id` | Update preferences |
| GET | `/favorite-seat/:student_id` | Get favorite seat |
| GET | `/seats/available` | View available seats |
| POST | `/book` | Book a seat |
| GET | `/my-bookings/:studentId` | View all bookings |
| GET | `/my-bookings-filtered/:studentId` | Filter bookings by date/status |
| DELETE | `/booking/:bookingId` | Cancel a booking |

### Admin Routes (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Admin login |
| GET | `/seats` | View all seats with booking info |
| GET | `/bookings` | View all bookings |
| PUT | `/verify/:bookingId` | Verify a pending booking |
| DELETE | `/booking/:bookingId` | Remove a booking |
| GET | `/statistics` | View system statistics |

---

## Core Functionality

### 1. Student Authentication

```javascript
// Password hashing with bcryptjs
const hashedPassword = await bcrypt.hash(password, 10);
```

- Passwords are hashed with 10 salt rounds
- Student ID serves as unique username
- Email required for password recovery

### 2. Seat Booking Logic

| Booking Date | Verification Status |
|--------------|---------------------|
| Today | Auto-verified immediately |
| Future | Pending admin verification |

### 3. Automatic Expiry

- Unverified bookings expire after 30 minutes
- Cleanup scheduler runs every 60 seconds
- Expired bookings are cancelled and seats released

### 4. Daily Booking Limit

- Maximum 2 bookings per student for same-day reservations
- No limit for future bookings

### 5. No Double Booking Prevention

- Seat status checked before booking
- Database transaction ensures atomic update
- Concurrent requests handled properly

---

## Set up

### Prerequisites

- Node.js v20.20.2 or higher
- PostgreSQL v18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Pemarinzindeolkar/WEB_Final_Project_group2.git

# Navigate to backend directory
cd WEB_Final_Project_group2/library-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your database credentials
```

### Environment Variables (`.env`)

```env
PORT=3000
JWT_SECRET=your_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=library_db
DB_USER=your_username
DB_PASSWORD=your_password

NODE_ENV=development
```

### Database Setup

```bash
# Create database
createdb library_db

# Run migrations (auto-runs on server start)
npm start
```

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will run at: **http://localhost:3000**

---

##  Email Service (Mock Mode)

The system uses Nodemailer with Ethereal email for testing:

- Emails are captured in console for development
- No real emails sent in development mode
- Password reset tokens have 1-hour expiry
- Reminder emails sent 15 minutes before booking expiry

---

##  Authentication Flow

```
Student/Admin → Login → JWT Token → Store in localStorage → Include in subsequent requests (Bearer Token)
```

### Protected Routes

- All `/api/student/*` routes (except signup/login) require JWT
- All `/api/admin/*` routes (except login) require JWT
- Token expires after configured duration

---

##  Testing the API

### Test Student Registration

```bash
curl -X POST http://localhost:3000/api/student/signup \
  -H "Content-Type: application/json" \
  -d '{"student_id": "02250362", "email": "student@cst.edu.bt", "password": "password123", "name": "Pema Rinzin"}'
```

### Test Student Login

```bash
curl -X POST http://localhost:3000/api/student/login \
  -H "Content-Type: application/json" \
  -d '{"student_id": "02250362", "password": "password123"}'
```

### Test Booking a Seat (Today - Auto-verified)

```bash
curl -X POST http://localhost:3000/api/student/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"student_id": 1, "seat_id": 1, "booking_date": "2026-05-26"}'
```

### Test Booking a Seat (Future - Pending Verification)

```bash
curl -X POST http://localhost:3000/api/student/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"student_id": 1, "seat_id": 1, "booking_date": "2026-05-30"}'
```

### Admin Login

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Admin Verify Booking

```bash
curl -X PUT http://localhost:3000/api/admin/verify/1 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

##  Database Schema Details

### students table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment ID |
| student_id | VARCHAR(20) UNIQUE | Student's college ID |
| email | VARCHAR(100) UNIQUE | Email for notifications |
| name | VARCHAR(100) | Full name |
| password | VARCHAR(255) | Hashed password |

### seats table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Seat ID (1-200) |
| floor | VARCHAR(20) | 'Ground Floor' or 'First Floor' |
| table_number | INTEGER | Table number (1-25) |
| chair_number | INTEGER | Chair number (1-4) |

### bookings table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Booking ID |
| student_id | INTEGER FK | References students(id) |
| seat_id | INTEGER FK | References seats(id) |
| booking_date | DATE | Date of reservation |
| status | VARCHAR(20) | 'pending', 'verified', 'cancelled' |
| booked_at | TIMESTAMP | When booking was created |
| expires_at | TIMESTAMP | Auto-expiry time |

---

##  Known Features & Constraints

| Feature | Description |
|---------|-------------|
| Auto-expiry | Unverified bookings expire after 30 minutes |
| Daily limit | Max 2 same-day bookings per student |
| No double booking | Same seat cannot be booked twice for same date |
| Future bookings | Require admin verification |
| Email reminders | Sent 15 minutes before expiry (mock mode) |
| Favorite seat | Students can save preferred seat |

---



