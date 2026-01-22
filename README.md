# ICT University Attendance Management System

A modern, time-based attendance management system for ICT University Yaoundé.

**Status**: ✅ Production Ready | **Version**: 1.0 | **Last Updated**: January 2026

---

## 🎯 What This System Does

This is a **real functional attendance system** (not a demo with fake data) that:

1. **Students can mark attendance** during official session time windows
2. **Delegates create and manage** attendance sessions
3. **Admin users manage** students, courses, and view reports
4. **Automatic calculation** of attendance percentages and eligibility (≥75%)
5. **Time-based validation** - prevents marking outside session windows
6. **Prevents duplicate marking** - one student, one session, one record
7. **Real database** - All data persists in PostgreSQL via Supabase

---

## 🏗️ System Architecture

```
FRONTEND (React)              BACKEND (Supabase)           DATABASE (PostgreSQL)
┌──────────────────┐          ┌──────────────────┐         ┌─────────────────┐
│ Student Login    │          │ Auth Service     │         │ users           │
│ (Time check)     │◄────────►│ (JWT)            │◄───────►│ courses         │
│                  │          │                  │         │ classes         │
│ Mark Attendance  │          │ verifyAttendance │         │ sessions        │
│ (Supabase API)   │          │ (Edge Function)  │         │ attendance      │
│                  │          │                  │         │ (REAL DATA)     │
│ View Records     │          │ REST API         │         │                 │
│ (Supabase query) │          │                  │         │ ✅ All queries  │
└──────────────────┘          └──────────────────┘         │ ✅ All inserts  │
                                                             │ ✅ All updates  │
Admin Dashboard                                             │ ✅ All deletes  │
Delegate Dashboard                                          │ are REAL        │
                                                             └─────────────────┘
```

---

## 📋 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
cd c:\Users\PFI\Desktop\ATTENDANCE\ATTENDANCE
npm install
```

### 2. Create `.env` File

Create a file named `.env` in the project root with:

```
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these values from Supabase → Project Settings → API

### 3. Deploy Database Schema

1. In Supabase → SQL Editor
2. Run the entire `schema.sql` file
3. Verify all 5 tables created

### 4. Create Test Accounts

```bash
npm run setup-users
```

### 5. Start Development Server

```bash
npm start
```

Open `http://localhost:3000` in browser

---

## 🔐 Test Accounts (After Running setup-users)

| Role         | Email                          | Password       |
| ------------ | ------------------------------ | -------------- |
| **Admin**    | admin@ictuniversity.edu.cm     | AdminPass1!    |
| **Delegate** | delegate1@ictuniversity.edu.cm | DelegatePass1! |
| **Student**  | student1@ictuniversity.edu.cm  | StudentPass1!  |
| **Student**  | student2@ictuniversity.edu.cm  | StudentPass1!  |
| **Student**  | student3@ictuniversity.edu.cm  | StudentPass1!  |

---

## ✅ Complete Feature List

### 👨‍🎓 STUDENT FEATURES

- [x] Secure email + password login
- [x] Dashboard showing **ACTIVE sessions only** (current time between start_time and end_time)
- [x] Mark attendance with **real-time validation** (blocks if outside time window)
- [x] View attendance records **per course** with percentage calculation
- [x] Automatic eligibility calculation: ≥75% = ELIGIBLE, <75% = NOT ELIGIBLE
- [x] Expandable history showing attendance dates
- [x] Profile page with name, email, matricule
- [x] Password change functionality
- [x] Logout

### 👨‍🏫 DELEGATE FEATURES

- [x] Login with credentials
- [x] Create new attendance **sessions** (course + date + start time + end time)
- [x] View all sessions they created
- [x] See list of students who marked attendance for each session
- [x] Mark own attendance (if within time window)
- [x] Real-time session management
- [x] View attendance records
- [x] Logout

### 🔐 ADMIN FEATURES

- [x] User management (add/delete students and delegates)
- [x] Course management (add/update/delete courses)
- [x] View detailed attendance reports
- [x] Generate statistics dashboard
- [x] Filter reports by student, course, or date
- [x] Full system oversight
- [x] User role assignment
- [x] Logout

---

## 🗄️ Database Schema

### `users` Table

```sql
id (UUID) - From Supabase Auth
name (TEXT) - Full name
matricule (TEXT UNIQUE) - Student/Staff ID
email (TEXT UNIQUE) - Email address
role (TEXT) - 'admin' | 'delegate' | 'student'
created_at (TIMESTAMP)
```

### `courses` Table

```sql
id (UUID)
course_code (TEXT UNIQUE) - e.g., "ICT101"
course_title (TEXT) - Full course name
program (TEXT) - e.g., "ICT"
year_level (TEXT) - e.g., "1", "2", "3"
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### `classes` Table (Sections of Courses)

```sql
id (UUID)
class_name (TEXT) - e.g., "Web Dev - Morning"
course_id (UUID) - Foreign key to courses
delegate_id (UUID) - Foreign key to users (the instructor)
created_at (TIMESTAMP)
```

### `sessions` Table (Attendance Sessions)

```sql
id (UUID)
class_id (UUID) - Which class/course
session_date (DATE) - When
start_time (TIME) - When students can start marking (e.g., 09:00)
end_time (TIME) - When students can stop marking (e.g., 10:30)
token (TEXT UNIQUE) - Optional session token
created_at (TIMESTAMP)
expires_at (TIMESTAMP) - When session expires
```

### `attendance` Table (Actual Records)

```sql
id (UUID)
session_id (UUID) - Which session
student_id (UUID) - Which student
created_at (TIMESTAMP) - When they marked attendance
UNIQUE(session_id, student_id) - Prevents duplicate marking
```

---

## 🔄 Real Data Flow Example

### Scenario: Delegate Creates Session, Student Marks Attendance

**Step 1: Delegate Creates Session**

```javascript
// Delegate clicks "Create Session" in dashboard
// Selects:
//   - Course: "ICT101"
//   - Date: "2026-01-20"
//   - Start time: "09:00"
//   - End time: "10:30"
//
// System inserts into sessions table:
INSERT INTO sessions (class_id, session_date, start_time, end_time, expires_at)
VALUES (class_123, '2026-01-20', '09:00', '10:30', '2026-01-20 10:30:00')
```

**Step 2: System Shows Active Sessions to Students**

```javascript
// Student opens dashboard at 09:15
// System queries for active sessions:
SELECT * FROM sessions
WHERE session_date = TODAY()
  AND start_time <= CURRENT_TIME     // 09:15
  AND CURRENT_TIME <= end_time        // 10:30

// Returns 1 session: "ICT101 - Web Development"
```

**Step 3: Student Marks Attendance**

```javascript
// Student clicks "Mark Attendance" button
// System validates:
//   ✓ Current time (09:15) is between 09:00 and 10:30
//   ✓ Student hasn't already marked this session
//
// Then inserts into attendance table:
INSERT INTO attendance (session_id, student_id, created_at)
VALUES (session_456, student_789, NOW())
// Returns: "✅ Attendance marked successfully"
```

**Step 4: Student Views Attendance Records**

```javascript
// Student goes to "Attendance Records"
// System calculates:
//   - Total sessions for ICT101: 5
//   - Student attended: 4
//   - Percentage: (4/5) × 100 = 80%
//   - Eligibility: ✅ ELIGIBLE (≥75%)
```

**This is 100% REAL data**, not mock numbers or fake arrays.

---

## 🚀 How to Test the Full System

### Test 1: Create and Attend a Session (5 minutes)

1. **Login as Admin (to add courses first)**

   - Email: `admin@ictuniversity.edu.cm`
   - Password: `AdminPass1!`
   - Go to "Manage Courses"
   - Add: Code="ICT101", Title="Web Dev", Program="ICT", Year="1"

2. **Login as Delegate**

   - Email: `delegate1@ictuniversity.edu.cm`
   - Password: `DelegatePass1!`
   - Go to "Create Session"
   - Select course: "ICT101"
   - Date: Today
   - Start time: Current time - 5 minutes
   - End time: Current time + 2 hours
   - Click "Create Session"

3. **Login as Student**

   - Email: `student1@ictuniversity.edu.cm`
   - Password: `StudentPass1!`
   - Dashboard should show the new session
   - Click "Mark Attendance"
   - See **✅ "Attendance marked successfully"**

4. **View Attendance Record**
   - Go to "Attendance Records"
   - See 1 attendance for "ICT101"
   - Percentage: 100% (1 out of 1 sessions)
   - Status: **ELIGIBLE** ✅

### Test 2: Time Validation (2 minutes)

1. Create session with start=15:00, end=16:00
2. Try to mark at 14:45 → **Session doesn't appear**
3. Try to mark at 16:15 → **Session doesn't appear**
4. Try to mark at 15:30 → **Can mark** ✅

### Test 3: Duplicate Prevention (1 minute)

1. Student marks attendance
2. Try to mark again immediately
3. See: **"You have already marked attendance"** ❌

---

## 📂 Project Structure

```
ATTENDANCE/
├── public/
│   └── index.html
├── src/
│   ├── pages/
│   │   ├── Login.js
│   │   ├── StudentDashboard.js
│   │   ├── DelegateDashboard.js
│   │   ├── AdminDashboard.js
│   │   └── [Other pages]
│   ├── components/
│   │   ├── Layout.js
│   │   ├── Sidebar.js
│   │   └── [Other components]
│   ├── contexts/
│   │   └── AuthContext.js
│   └── supabase/
│       └── supabase.js
├── supabase/
│   └── functions/
│       └── verifyAttendance/
│           └── index.ts
├── schema.sql
├── setup-users.js
├── package.json
├── DEPLOYMENT_GUIDE.md
└── README.md
```

---

## 🔧 Technology Stack

- **Frontend**: React 18.2.0 + React Router v6
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS
- **Authentication**: Supabase JWT

---

## ✨ System is Production Ready

✅ Real database persistence
✅ Real time-based validation
✅ Real user authentication  
✅ Real data calculations
✅ No mock data or fake numbers

**Ready to deploy at your school.**

---

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
