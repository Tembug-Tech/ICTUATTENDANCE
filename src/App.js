import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import DelegateDashboard from './pages/DelegateDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentMarkAttendance from './pages/StudentMarkAttendance';
import StudentAttendanceHistory from './pages/StudentAttendanceHistory';
import StudentCourses from './pages/StudentCourses';
import StudentProfile from './pages/StudentProfile';

function App() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  return (
    <Routes>
      {/* Authentication routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Role-specific login routes */}
      <Route path="/admin" element={<Login role="admin" />} />
      <Route path="/student" element={<Login role="student" />} />
      <Route path="/delegate" element={<Login role="delegate" />} />

      {/* Protected dashboard routes - always render, let component check auth */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/delegate/dashboard" element={<DelegateDashboard />} />

      {/* Student subroutes */}
      <Route path="/student/mark" element={<StudentMarkAttendance />} />
      <Route path="/student/history" element={<StudentAttendanceHistory />} />
      <Route path="/student/courses" element={<StudentCourses />} />
      <Route path="/student/profile" element={<StudentProfile />} />

      {/* Root redirects based on role */}
      {currentUser && userRole && (
        <Route 
          path="/" 
          element={
            userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
            userRole === 'delegate' ? <Navigate to="/delegate/dashboard" replace /> :
            <Navigate to="/student/dashboard" replace />
          } 
        />
      )}

      {/* Default redirect to student login if not logged in */}
      {(!currentUser || !userRole) && <Route path="/" element={<Navigate to="/student" replace />} />}

      {/* Catch-all - redirect to student login */}
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
}

export default App;