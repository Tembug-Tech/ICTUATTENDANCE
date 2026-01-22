import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  adminFetchStats,
  adminFetchOpenSessions,
  adminFetchCourseAttendance,
  adminFetchAttendanceAlerts,
  adminFetchAttendanceExportData
} from '../utils/dashboardQueries';
import {
  generateAttendanceCSV,
  generateAttendanceTSV,
  generateSummaryReport,
  getFormattedDateForFilename,
  isValidDateRange
} from '../utils/excelExport';

const AdminDashboard = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalDelegates: 0,
    totalCourses: 0,
    sessionsToday: 0
  });

  const [courseAttendance, setCourseAttendance] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Export modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    courseCode: '',
    startDate: '',
    endDate: ''
  });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!currentUser || userRole !== 'admin')) {
      navigate('/login');
      return;
    }

    if (!loading && currentUser && userRole === 'admin') {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userRole, loading, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      const [statsData, sessionsData, attendanceData, alertsData] = await Promise.all([
        adminFetchStats(),
        adminFetchOpenSessions(),
        adminFetchCourseAttendance(20),
        adminFetchAttendanceAlerts()
      ]);

      setStats(statsData);
      setOpenSessions(sessionsData.sessions || []);
      setCourseAttendance(attendanceData.courseAttendance || []);
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleExportData = async (format = 'csv') => {
    try {
      setExportLoading(true);

      if (exportFilters.startDate && exportFilters.endDate) {
        if (!isValidDateRange(exportFilters.startDate, exportFilters.endDate)) {
          alert('Start date must be before end date');
          setExportLoading(false);
          return;
        }
      }

      const { data, error } = await adminFetchAttendanceExportData(exportFilters);

      if (error) {
        alert('Error fetching data: ' + error);
        setExportLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        alert('No data found for the selected filters');
        setExportLoading(false);
        return;
      }

      const dateString = getFormattedDateForFilename();
      const filename = `attendance_${dateString}.${format === 'summary' ? 'csv' : format}`;

      if (format === 'csv') {
        generateAttendanceCSV(data, filename);
      } else if (format === 'xlsx') {
        generateAttendanceTSV(data, filename);
      } else if (format === 'summary') {
        generateSummaryReport(data, filename);
      }

      setShowExportModal(false);
      setExportFilters({ courseCode: '', startDate: '', endDate: '' });
      alert(`Data exported successfully as ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
          <p style={{ color: '#475569' }}>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'admin') {
    return null;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { id: 'courses', label: 'Academic Programs', icon: 'school' },
    { id: 'attendance', label: 'Student Records', icon: 'fact_check' },
    { id: 'sessions', label: 'Class Sessions', icon: 'schedule' },
    { id: 'delegates', label: 'Instructors', icon: 'group' },
    { id: 'reports', label: 'Analytics', icon: 'analytics' },
  ];

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
        style={{ backgroundColor: '#1E293B' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-600">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#3B82F6' }}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 11c.34 0 .67.04 1 .09V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.72.36.09.74.09 1.1 0C13.81 19.06 17 14.81 17 10.18V11z"/>
                <path d="M17 13c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <h2 className="text-white font-semibold text-sm">Admin Panel</h2>
                <p className="text-gray-300 text-xs">University System</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {item.icon === 'dashboard' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                  )}
                  {item.icon === 'school' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
                    </svg>
                  )}
                  {item.icon === 'fact_check' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
                    </svg>
                  )}
                  {item.icon === 'schedule' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                  )}
                  {item.icon === 'group' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63C19.68 7.55 18.92 7 18.09 7c-.84 0-1.6.55-1.87 1.37L13.5 16H16v6h-2V4h-1v16H4v-6H2.5l2.54-7.63C5.32 7.55 6.08 7 6.91 7c.84 0 1.6.55 1.87 1.37L11.5 16H8v6H6V4h1v16h10z"/>
                    </svg>
                  )}
                  {item.icon === 'analytics' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                  )}
                </div>
                {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-gray-600">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              {sidebarOpen && <span className="ml-3 text-sm">Logout</span>}
            </button>
          </div>

          {/* Toggle Button */}
          <div className="p-3 border-t border-gray-600">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              {sidebarOpen ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* TOP HEADER */}
        <header
          className="h-16 border-b border-gray-200 flex items-center justify-between px-6"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
              {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
            </h1>
            <p className="text-sm" style={{ color: '#475569' }}>
              Attendance Management System
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" style={{ color: '#475569' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
              style={{ backgroundColor: '#3B82F6' }}
            >
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                  className="p-6 rounded-lg border border-gray-200"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#475569' }}>Total Students</p>
                      <p className="text-3xl font-bold" style={{ color: '#0F172A' }}>{stats.totalStudents}</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#3B82F6' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63C19.68 7.55 18.92 7 18.09 7c-.84 0-1.6.55-1.87 1.37L13.5 16H16v6h-2V4h-1v16H4v-6H2.5l2.54-7.63C5.32 7.55 6.08 7 6.91 7c.84 0 1.6.55 1.87 1.37L11.5 16H8v6H6V4h1v16h10z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div
                  className="p-6 rounded-lg border border-gray-200"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#475569' }}>Total Delegates</p>
                      <p className="text-3xl font-bold" style={{ color: '#0F172A' }}>{stats.totalDelegates}</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#16A34A' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div
                  className="p-6 rounded-lg border border-gray-200"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#475569' }}>Total Courses</p>
                      <p className="text-3xl font-bold" style={{ color: '#0F172A' }}>{stats.totalCourses}</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#F59E0B' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div
                  className="p-6 rounded-lg border border-gray-200"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#475569' }}>Active Sessions</p>
                      <p className="text-3xl font-bold" style={{ color: '#0F172A' }}>{stats.sessionsToday}</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#3B82F6' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* ATTENDANCE OVERVIEW */}
              <div
                className="p-6 rounded-lg border border-gray-200"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold" style={{ color: '#0F172A' }}>Course Attendance Overview</h2>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-2 rounded-lg text-white font-medium flex items-center space-x-2"
                    style={{ backgroundColor: '#3B82F6' }}
                  >
                    <span>Download Export</span>
                  </button>
                </div>

                {loadingData ? (
                  <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : courseAttendance.length > 0 ? (
                  <div className="space-y-4">
                    {courseAttendance.slice(0, 10).map((course, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: '#0F172A' }}>{course.courseTitle}</p>
                          <p className="text-sm" style={{ color: '#475569' }}>
                            {course.courseCode} • {course.enrolledStudents} students
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                              {course.attendancePercentage}%
                            </p>
                            <span
                              className="text-xs px-2 py-1 rounded-full font-medium"
                              style={{
                                backgroundColor: course.attendancePercentage >= 80 ? '#16A34A' : course.attendancePercentage >= 60 ? '#F59E0B' : '#EF4444',
                                color: '#FFFFFF'
                              }}
                            >
                              {course.attendancePercentage >= 80 ? 'Good' : course.attendancePercentage >= 60 ? 'Fair' : 'Low'}
                            </span>
                          </div>
                          <div className="w-24">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="h-3 rounded-full"
                                style={{
                                  width: `${course.attendancePercentage}%`,
                                  backgroundColor: course.attendancePercentage >= 80 ? '#16A34A' : course.attendancePercentage >= 60 ? '#F59E0B' : '#EF4444'
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl" style={{ color: '#475569' }}>analytics</span>
                    <p className="mt-2" style={{ color: '#475569' }}>No attendance data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'attendance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Attendance Records</h2>
                <div className="space-x-3">
                  <button
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: '#16A34A' }}
                  >
                    Upload CSV
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: '#3B82F6' }}
                  >
                    Export Data
                  </button>
                </div>
              </div>

              <div
                className="p-6 rounded-lg border border-gray-200"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <p className="text-center py-8" style={{ color: '#475569' }}>
                  Attendance records will be displayed here
                </p>
              </div>
            </div>
          )}

          {activeSection === 'sessions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Session Management</h2>
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: '#16A34A' }}
                >
                  Create Session
                </button>
              </div>

              <div
                className="p-6 rounded-lg border border-gray-200"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                {loadingData ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : openSessions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium" style={{ color: '#475569' }}>Session ID</th>
                          <th className="text-left py-3 px-4 font-medium" style={{ color: '#475569' }}>Course</th>
                          <th className="text-left py-3 px-4 font-medium" style={{ color: '#475569' }}>Delegate</th>
                          <th className="text-left py-3 px-4 font-medium" style={{ color: '#475569' }}>Date</th>
                          <th className="text-left py-3 px-4 font-medium" style={{ color: '#475569' }}>Time</th>
                          <th className="text-left py-3 px-4 font-medium" style={{ color: '#475569' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openSessions.map((session, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-mono text-sm" style={{ color: '#0F172A' }}>
                              {session.tokenPreview}
                            </td>
                            <td className="py-3 px-4" style={{ color: '#0F172A' }}>{session.className}</td>
                            <td className="py-3 px-4" style={{ color: '#475569' }}>{session.delegateName}</td>
                            <td className="py-3 px-4" style={{ color: '#475569' }}>{session.date}</td>
                            <td className="py-3 px-4" style={{ color: '#475569' }}>{session.startTime}</td>
                            <td className="py-3 px-4">
                              <span
                                className="text-xs px-2 py-1 rounded-full font-medium"
                                style={{
                                  backgroundColor: session.status === 'Open' ? '#16A34A' : '#EF4444',
                                  color: '#FFFFFF'
                                }}
                              >
                                {session.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl" style={{ color: '#475569' }}>event_busy</span>
                    <p className="mt-2" style={{ color: '#475569' }}>No active sessions</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'courses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Course Management</h2>
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: '#16A34A' }}
                >
                  Add Course
                </button>
              </div>

              <div
                className="p-6 rounded-lg border border-gray-200"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <p className="text-center py-8" style={{ color: '#475569' }}>
                  Course management interface will be displayed here
                </p>
              </div>
            </div>
          )}

          {activeSection === 'delegates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Delegate Management</h2>
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: '#16A34A' }}
                >
                  Add Delegate
                </button>
              </div>

              <div
                className="p-6 rounded-lg border border-gray-200"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <p className="text-center py-8" style={{ color: '#475569' }}>
                  Delegate management interface will be displayed here
                </p>
              </div>
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Reports & Analytics</h2>

              <div
                className="p-6 rounded-lg border border-gray-200"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <p className="text-center py-8" style={{ color: '#475569' }}>
                  Reports and analytics will be displayed here
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="w-full max-w-lg mx-4 p-6 rounded-lg border border-gray-200"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>Export Attendance Data</h3>

            <div className="space-y-4">
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
              >
                <p className="text-sm" style={{ color: '#475569' }}>
                  Export attendance records with optional filtering by course and date range.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Course Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., CS101"
                  value={exportFilters.courseCode}
                  onChange={(e) => setExportFilters({ ...exportFilters, courseCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportFilters.startDate}
                    onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportFilters.endDate}
                    onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: '#0F172A' }}>
                  Export Format
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => handleExportData('csv')}
                    disabled={exportLoading}
                    className="w-full p-3 text-left rounded-lg border-2"
                    style={{
                      borderColor: '#3B82F6',
                      backgroundColor: '#EFF6FF',
                      color: '#0F172A'
                    }}
                  >
                    <p className="font-medium">CSV Format</p>
                    <p className="text-xs" style={{ color: '#475569' }}>Universal compatibility</p>
                  </button>

                  <button
                    onClick={() => handleExportData('xlsx')}
                    disabled={exportLoading}
                    className="w-full p-3 text-left rounded-lg border-2"
                    style={{
                      borderColor: '#16A34A',
                      backgroundColor: '#F0FDF4',
                      color: '#0F172A'
                    }}
                  >
                    <p className="font-medium">Excel Format</p>
                    <p className="text-xs" style={{ color: '#475569' }}>Direct Excel compatibility</p>
                  </button>

                  <button
                    onClick={() => handleExportData('summary')}
                    disabled={exportLoading}
                    className="w-full p-3 text-left rounded-lg border-2"
                    style={{
                      borderColor: '#F59E0B',
                      backgroundColor: '#FFFBEB',
                      color: '#0F172A'
                    }}
                  >
                    <p className="font-medium">Summary Report</p>
                    <p className="text-xs" style={{ color: '#475569' }}>Course & student statistics</p>
                  </button>
                </div>
              </div>

              {exportLoading && (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#475569' }}>Generating export file...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300"
                style={{ color: '#475569' }}
                disabled={exportLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
