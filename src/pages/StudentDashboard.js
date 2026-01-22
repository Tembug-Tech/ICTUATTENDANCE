import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  studentFetchEnrolledCourses,
  studentFetchAttendanceSummary,
  studentFetchCourseAttendance,
  studentFetchAttendanceHistory,
} from '../utils/dashboardQueries';
import {
  SESSION_STATUS,
  ATTENDANCE_STATUS,
  markAttendanceWithStatus,
  getStudentSessionsByStatus,
  getTimeRemaining,
  calculateSessionStatus,
} from '../utils/sessionLifecycle';

/**
 * StudentDashboard - Professional University Attendance System
 * Clean, modern design following institutional standards
 * Mobile-first, responsive layout with sidebar navigation
 */
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, userRole, logout } = useAuth();

  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('studentDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Data states
  const [courses, setCourses] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [courseAttendance, setCourseAttendance] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [sessions, setSessions] = useState({ scheduled: [], open: [], closed: [] });

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [markingAttendance, setMarkingAttendance] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filter states for history
  const [historyFilter, setHistoryFilter] = useState({ course: '', status: '' });
  const [historySearch, setHistorySearch] = useState('');

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('studentDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Redirect if not student
  useEffect(() => {
    if (userRole && userRole !== 'student') {
      navigate('/admin/dashboard');
    }
  }, [userRole, navigate]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [coursesData, summaryData, attendanceData, historyData, sessionsData] = await Promise.all([
        studentFetchEnrolledCourses(currentUser.id),
        studentFetchAttendanceSummary(currentUser.id),
        studentFetchCourseAttendance(currentUser.id),
        studentFetchAttendanceHistory(currentUser.id),
        getStudentSessionsByStatus(currentUser.id),
      ]);

      setCourses(coursesData.courses || []);
      setAttendanceSummary(summaryData.summary || null);
      setCourseAttendance(attendanceData.courseAttendance || []);
      setAttendanceHistory(historyData.history || []);
      setSessions({
        scheduled: sessionsData.scheduled || [],
        open: sessionsData.open || [],
        closed: sessionsData.closed || [],
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Check for session status changes every 10 seconds
  useEffect(() => {
    const checkSessions = () => {
      setSessions(prev => {
        let hasChanges = false;
        const newScheduled = [];
        const newOpen = [...prev.open];
        const newClosed = [...prev.closed];

        for (const session of prev.scheduled) {
          const status = calculateSessionStatus({
            session_date: session.date,
            start_time: session.startTime,
            end_time: session.endTime,
          });
          if (status === SESSION_STATUS.OPEN) {
            newOpen.push({ ...session, status: SESSION_STATUS.OPEN });
            hasChanges = true;
          } else {
            newScheduled.push(session);
          }
        }

        const stillOpen = [];
        for (const session of newOpen) {
          const status = calculateSessionStatus({
            session_date: session.date,
            start_time: session.startTime,
            end_time: session.endTime,
          });
          if (status === SESSION_STATUS.CLOSED) {
            newClosed.push({ ...session, status: SESSION_STATUS.CLOSED });
            hasChanges = true;
          } else {
            stillOpen.push(session);
          }
        }

        if (hasChanges) {
          return { scheduled: newScheduled, open: stillOpen, closed: newClosed };
        }
        return prev;
      });
    };

    const interval = setInterval(checkSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  // Clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle attendance marking
  const handleMarkAttendance = async (sessionId) => {
    try {
      setMarkingAttendance(sessionId);
      setError(null);

      const result = await markAttendanceWithStatus(currentUser.id, sessionId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccessMessage(result.message);

      setSessions(prev => ({
        ...prev,
        open: prev.open.map(s =>
          s.id === sessionId
            ? { ...s, isMarked: true, attendanceStatus: result.status }
            : s
        ),
      }));

      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingAttendance(null);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Get attendance percentage color
  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  // Get attendance status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Present':
      case ATTENDANCE_STATUS.PRESENT:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Late':
      case ATTENDANCE_STATUS.LATE:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Absent':
      case ATTENDANCE_STATUS.ABSENT:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Filter attendance history
  const filteredHistory = attendanceHistory.filter(record => {
    const matchesCourse = !historyFilter.course || record.courseCode === historyFilter.course;
    const matchesStatus = !historyFilter.status || record.status === historyFilter.status;
    const matchesSearch = !historySearch ||
      record.courseName.toLowerCase().includes(historySearch.toLowerCase()) ||
      record.courseCode.toLowerCase().includes(historySearch.toLowerCase());
    return matchesCourse && matchesStatus && matchesSearch;
  });

  // Get today's classes
  const todayClasses = sessions.scheduled.filter(s => {
    const today = new Date().toLocaleDateString();
    return s.date === today;
  }).concat(sessions.open.filter(s => {
    const today = new Date().toLocaleDateString();
    return s.date === today;
  }));

  const sessionsToday = todayClasses.length;

  // Navigation items
  const navItems = [
    {
      id: 'dashboard', label: 'Dashboard', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'sessions', label: 'Active Sessions', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ), badge: sessions.open.length
    },
    {
      id: 'history', label: 'History', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'courses', label: 'My Courses', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 shadow-lg hidden md:flex`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">Student</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {item.icon}
              {sidebarOpen && (
                <span className="text-sm flex-1 text-left">{item.label}</span>
              )}
              {sidebarOpen && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {sidebarOpen && <span className="text-sm">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate('/student/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {sidebarOpen && <span className="text-sm">Profile</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* TOP BAR */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="px-4 sm:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  University Attendance System
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Welcome, {currentUser?.name || currentUser?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-flex px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                Student
              </span>

              {/* Mobile theme toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 dark:text-green-400 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Enrolled Courses */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Enrolled Courses</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{courses.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Overall Attendance */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Overall Attendance</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                          {attendanceSummary?.attendancePercentage || 0}%
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getAttendanceColor(attendanceSummary?.attendancePercentage || 0)
                        }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${(attendanceSummary?.attendancePercentage || 0) >= 75
                            ? 'bg-green-500'
                            : (attendanceSummary?.attendancePercentage || 0) >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        style={{ width: `${attendanceSummary?.attendancePercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Sessions Today */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Sessions Today</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{sessionsToday}</p>
                      </div>
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Empty State */}
                {courses.length === 0 && !loading && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 border border-gray-200 dark:border-gray-800 text-center">
                    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">You are not enrolled in any course yet.</h3>
                    <p className="text-gray-500 dark:text-gray-400">Contact your administrator to get enrolled in courses.</p>
                  </div>
                )}

                {/* TODAY'S CLASSES */}
                {courses.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Classes</h2>
                    </div>
                    <div className="p-6">
                      {todayClasses.length > 0 ? (
                        <div className="space-y-4">
                          {todayClasses.map(session => (
                            <div
                              key={session.id}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{session.courseTitle}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{session.courseCode}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {session.startTime} - {session.endTime}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${session.status === SESSION_STATUS.OPEN
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                {session.status === SESSION_STATUS.OPEN ? 'In Progress' : 'Scheduled'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400">No classes scheduled for today.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* COURSE ATTENDANCE SUMMARY */}
                {courseAttendance.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Attendance Summary</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {courseAttendance.map(course => (
                          <div key={course.courseId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{course.courseTitle}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{course.courseCode}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${course.attendancePercentage >= 75
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : course.attendancePercentage >= 50
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {course.attendancePercentage}%
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${course.attendancePercentage >= 75
                                      ? 'bg-green-500'
                                      : course.attendancePercentage >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                  style={{ width: `${course.attendancePercentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {course.attended}/{course.totalSessions}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Attendance Sessions</h2>
                  {sessions.open.length > 0 && (
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                      {sessions.open.length} Active
                    </span>
                  )}
                </div>
                <div className="p-6">
                  {sessions.open.length > 0 ? (
                    <div className="space-y-4">
                      {sessions.open.map(session => {
                        const timeRemaining = getTimeRemaining({
                          session_date: session.date,
                          start_time: session.startTime,
                          end_time: session.endTime,
                        });

                        return (
                          <div
                            key={session.id}
                            className="p-4 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-xl"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                                    OPEN
                                  </span>
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{session.courseTitle}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{session.courseCode} • {session.className}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                  {session.startTime} - {session.endTime}
                                </p>
                                {timeRemaining && (
                                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mt-2">
                                    ⏱ {timeRemaining.formatted}
                                  </p>
                                )}
                              </div>
                              <div className="ml-4">
                                {session.isMarked ? (
                                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${session.attendanceStatus === ATTENDANCE_STATUS.LATE
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    }`}>
                                    ✓ {session.attendanceStatus === ATTENDANCE_STATUS.LATE ? 'LATE' : 'PRESENT'}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleMarkAttendance(session.id)}
                                    disabled={markingAttendance === session.id}
                                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                  >
                                    {markingAttendance === session.id ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Marking...
                                      </>
                                    ) : (
                                      'Mark Attendance'
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400">No active sessions at the moment.</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sessions will appear here when they start.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance History</h2>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-4">
                  <input
                    type="text"
                    placeholder="Search by course..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <select
                    value={historyFilter.course}
                    onChange={(e) => setHistoryFilter(prev => ({ ...prev, course: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">All Courses</option>
                    {[...new Set(attendanceHistory.map(r => r.courseCode))].map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <select
                    value={historyFilter.status}
                    onChange={(e) => setHistoryFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredHistory.length > 0 ? (
                        filteredHistory.map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900 dark:text-white">{record.courseName}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{record.courseCode}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{record.sessionDate}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{record.startTime} - {record.endTime}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No attendance records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COURSES TAB */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Enrolled Courses</h2>
                {courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.map(course => {
                      const stats = courseAttendance.find(c => c.courseId === course.id);
                      return (
                        <div key={course.id} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{course.courseTitle}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{course.courseCode}</p>
                            </div>
                            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                              {course.program}
                            </span>
                          </div>
                          {stats && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Attendance</span>
                                <span className="font-medium text-gray-900 dark:text-white">{stats.attendancePercentage}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${stats.attendancePercentage >= 75
                                      ? 'bg-green-500'
                                      : stats.attendancePercentage >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                  style={{ width: `${stats.attendancePercentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {stats.attended} of {stats.totalSessions} sessions attended
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 border border-gray-200 dark:border-gray-800 text-center">
                    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses enrolled</h3>
                    <p className="text-gray-500 dark:text-gray-400">Contact your administrator to enroll in courses.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden z-50">
        <div className="flex items-center justify-around h-16">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${activeTab === item.id ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label.split(' ')[0]}</span>
              {item.badge > 0 && (
                <span className="absolute top-2 right-1/4 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default StudentDashboard;
