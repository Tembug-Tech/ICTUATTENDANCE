import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/supabase';
import {
  delegateFetchAssignedClasses,
  delegateFetchSessionAttendance,
  delegateFetchStats,
  adminFetchAllCourses,
} from '../utils/dashboardQueries';
import {
  createSessionWithValidation,
  checkOverlappingSessions,
} from '../utils/sessionLifecycle';
import { useSessionLifecycle, useSessionCountdown } from '../hooks/useSessionLifecycle';
import {
  User,
  LayoutDashboard,
  GraduationCap,
  PlayCircle,
  Calendar,
  History,
  CheckCircle,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Radio,
  CalendarX,
  X
} from 'lucide-react';

const DelegateDashboard = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Helper functions for timezone conversion (Africa/Douala - UTC+1)
  const cameroonToUTC = (date, hour, min) => {
    const cameroonTime = new Date(date);
    cameroonTime.setHours(hour, min, 0, 0);
    return new Date(cameroonTime.getTime() - (1 * 60 * 60 * 1000));
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for saved preference, default to false
    const saved = localStorage.getItem('delegateDarkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalSessions: 0,
    totalMarked: 0,
    todaySessions: 0,
    error: null
  });

  // UI states
  const [loadingData, setLoadingData] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [createForm, setCreateForm] = useState({
    courseId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00'
  });
  const [createError, setCreateError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Use session lifecycle hook for real-time session management
  const {
    sessions,
    activeSessions,
    upcomingSessions,
    pastSessions,
    loading: sessionsLoading,
    error: sessionsError,
    refresh: refreshSessions,
    getSessionTimeRemaining
  } = useSessionLifecycle(currentUser?.id, 'delegate');

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference to localStorage
    localStorage.setItem('delegateDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Auth check
  useEffect(() => {
    if (!loading && (!currentUser || userRole !== 'delegate')) {
      navigate('/delegate');
      return;
    }

    if (!loading && currentUser && userRole === 'delegate') {
      fetchAllData();
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userRole, loading, navigate]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load available courses when modal opens
  useEffect(() => {
    if (showCreateModal && availableCourses.length === 0) {
      const loadCourses = async () => {
        const { courses, error } = await adminFetchAllCourses();
        if (!error) {
          setAvailableCourses(courses);
        }
      };
      loadCourses();
    }
  }, [showCreateModal, availableCourses.length]);

  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      const [classesData, statsData] = await Promise.all([
        delegateFetchAssignedClasses(currentUser.id),
        delegateFetchStats(currentUser.id)
      ]);

      setAssignedClasses(classesData.classes);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching delegate data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.courseId) {
      setCreateError('Please select a course');
      return;
    }

    // Validate times
    if (createForm.startTime >= createForm.endTime) {
      setCreateError('End time must be after start time');
      return;
    }

    // Validate start time is not in the past
    const now = new Date();
    const sessionDateTime = new Date(createForm.date);
    const [startHour, startMin] = createForm.startTime.split(':').map(Number);
    sessionDateTime.setHours(startHour, startMin, 0, 0);

    // Convert to UTC for comparison
    const sessionDateTimeUTC = new Date(sessionDateTime.getTime() - (1 * 60 * 60 * 1000)); // Cameroon to UTC
    const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

    if (sessionDateTimeUTC <= nowUTC) {
      setCreateError('Session start time cannot be in the past');
      return;
    }

    try {
      setCreating(true);

      // First, find or create the class for this course and delegate
      let { data: existingClass, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('course_id', createForm.courseId)
        .eq('delegate_id', currentUser.id)
        .single();

      let classId;
      if (classError && classError.code === 'PGRST116') { // No rows returned
        // Create new class
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('course_title')
          .eq('id', createForm.courseId)
          .single();

        if (courseError) throw courseError;

        const { data: newClass, error: createClassError } = await supabase
          .from('classes')
          .insert({
            class_name: course.course_title,
            course_id: createForm.courseId,
            delegate_id: currentUser.id
          })
          .select('id')
          .single();

        if (createClassError) throw createClassError;
        classId = newClass.id;
      } else if (classError) {
        throw classError;
      } else {
        classId = existingClass.id;
      }

      // Check for overlapping sessions
      const { hasOverlap, overlappingSessions } = await checkOverlappingSessions(
        classId,
        createForm.date,
        createForm.startTime,
        createForm.endTime
      );

      if (hasOverlap) {
        setCreateError(`Session overlaps with existing session(s) at ${overlappingSessions.map(s => s.start_time).join(', ')}`);
        return;
      }

      // Create session
      const { session, error } = await createSessionWithValidation(
        currentUser.id,
        classId,
        createForm.date,
        createForm.startTime,
        createForm.endTime
      );

      if (error) {
        setCreateError(error);
        return;
      }

      setSuccessMessage('Session created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        courseId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '10:00'
      });
      fetchAllData();
      refreshSessions();
    } catch (error) {
      setCreateError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleViewAttendance = async (sessionId) => {
    try {
      const { attendance, error } = await delegateFetchSessionAttendance(sessionId);
      if (error) {
        alert('Error fetching attendance: ' + error);
        return;
      }
      const session = [...activeSessions, ...upcomingSessions, ...pastSessions].find(s => s.id === sessionId);
      setSelectedSession(session);
      setSessionAttendance(attendance);
      setActiveTab('attendance');
    } catch (error) {
      alert('Error: ' + error.message);
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

  const downloadAttendanceCSV = () => {
    if (!selectedSession || !sessionAttendance.length) {
      alert('No attendance data to download');
      return;
    }

    // Create CSV content
    const headers = ['Student Name', 'Matricule', 'Timestamp', 'Status'];
    const csvContent = [
      headers.join(','),
      ...sessionAttendance.map(record => [
        `"${record.studentName}"`,
        `"${record.studentMatricule}"`,
        `"${record.timestamp}"`,
        `"${record.status === 'present' ? 'Present' : record.status === 'late' ? 'Late' : 'Absent'}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedSession.courseTitle}_${selectedSession.date}_attendance.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (session) => {
    const now = new Date();
    const sessionDate = session.session_date;
    const [startHour, startMin] = session.start_time.split(':').map(Number);
    const [endHour, endMin] = session.end_time.split(':').map(Number);

    const startDateTimeUTC = cameroonToUTC(sessionDate, startHour, startMin);
    const endDateTimeUTC = cameroonToUTC(sessionDate, endHour, endMin);
    const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

    if (nowUTC < startDateTimeUTC) {
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    } else if (nowUTC >= startDateTimeUTC && nowUTC <= endDateTimeUTC) {
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    } else {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusLabel = (session) => {
    const now = new Date();
    const sessionDate = session.session_date;
    const [startHour, startMin] = session.start_time.split(':').map(Number);
    const [endHour, endMin] = session.end_time.split(':').map(Number);

    const startDateTimeUTC = cameroonToUTC(sessionDate, startHour, startMin);
    const endDateTimeUTC = cameroonToUTC(sessionDate, endHour, endMin);
    const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

    if (nowUTC < startDateTimeUTC) {
      return 'Scheduled';
    } else if (nowUTC >= startDateTimeUTC && nowUTC <= endDateTimeUTC) {
      return 'Open';
    } else {
      return 'Closed';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-300 border-t-blue-600 mb-4" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'delegate') {
    return null;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'classes', label: 'My Classes', icon: GraduationCap },
    { id: 'active', label: 'Active Sessions', icon: PlayCircle, badge: activeSessions.length },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar, badge: upcomingSessions.length },
    { id: 'history', label: 'History', icon: History },
    { id: 'attendance', label: 'Attendance', icon: CheckCircle }
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 shadow-lg`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold">
              <User className="w-6 h-6" />
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">Delegate</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Portal</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && (
                <span className="text-sm flex-1 text-left">{item.label}</span>
              )}
              {sidebarOpen && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {sidebarOpen && <span className="text-sm">Theme</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* TOP BAR */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Attendance Management Portal
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome, {currentUser?.name || currentUser?.email}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold cursor-pointer">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-700 dark:text-green-400 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {sessionsError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 font-medium">{sessionsError}</p>
              </div>
            )}

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Active Sessions</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeSessions.length}</p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <PlayCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Currently open for attendance</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Scheduled</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{upcomingSessions.length}</p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming sessions</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Total Sessions</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSessions}</p>
                      </div>
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <CalendarDays className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">All time</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Attendance Marked</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMarked}</p>
                      </div>
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total records</p>
                  </div>
                </div>

                {/* Active Sessions Alert */}
                {activeSessions.length > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Radio className="w-6 h-6 text-green-600 dark:text-green-400 animate-pulse" />
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-300">
                          {activeSessions.length} Session{activeSessions.length > 1 ? 's' : ''} Currently Active
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Students can mark attendance now. Sessions will auto-close at end time.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Sessions List */}
                {activeSessions.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                      <PlayCircle className="w-5 h-5 text-green-600" />
                      Active Sessions
                    </h3>
                    <div className="space-y-4">
                      {activeSessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onViewAttendance={() => handleViewAttendance(session.id)}
                          getTimeRemaining={getSessionTimeRemaining}
                          getStatusBadgeClass={getStatusBadgeClass}
                          getStatusLabel={getStatusLabel}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ASSIGNED CLASSES */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">My Assigned Classes</h3>

                  {assignedClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assignedClasses.map((cls) => (
                        <div key={cls.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{cls.courseTitle}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{cls.courseCode}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls.hasActiveSession
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                              }`}>
                              {cls.sessionToday}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{cls.className}</p>
                          <button
                            onClick={() => {
                              setCreateForm(prev => ({ ...prev, classId: cls.id }));
                              setShowCreateModal(true);
                            }}
                            className="w-full px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            Open Session
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">No classes assigned yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CLASSES TAB */}
            {activeTab === 'classes' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Classes</h2>
                {assignedClasses.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {assignedClasses.map((cls) => (
                      <div key={cls.id} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cls.courseTitle}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{cls.courseCode}</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                            {cls.program}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">{cls.className}</p>
                        <button
                          onClick={() => {
                            setCreateForm(prev => ({ ...prev, classId: cls.id }));
                            setShowCreateModal(true);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Create Session
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <p className="text-gray-600 dark:text-gray-400">No classes assigned</p>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE SESSIONS TAB */}
            {activeTab === 'active' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-green-600" />
                  Active Sessions
                </h2>
                {activeSessions.length > 0 ? (
                  <div className="space-y-4">
                    {activeSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onViewAttendance={() => handleViewAttendance(session.id)}
                        getTimeRemaining={getSessionTimeRemaining}
                        getStatusBadgeClass={getStatusBadgeClass}
                        getStatusLabel={getStatusLabel}
                        expanded
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <CalendarX className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No active sessions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Sessions will appear here when they start
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SCHEDULED SESSIONS TAB */}
            {activeTab === 'scheduled' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Scheduled Sessions
                </h2>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{session.courseTitle}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{session.className}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {session.date} • {session.startTime} - {session.endTime}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(session)}`}>
                              {getStatusLabel(session)}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {getSessionTimeRemaining(session)?.formatted}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No scheduled sessions</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Create New Session
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  Session History
                </h2>
                {pastSessions.length > 0 ? (
                  <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Course</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Class</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Time</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Attendance</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pastSessions.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{session.courseTitle}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.className}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.date}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.startTime}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.attendanceCount}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(session.status)}`}>
                                {getStatusLabel(session.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleViewAttendance(session.id)}
                                className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <p className="text-gray-600 dark:text-gray-400">No session history yet</p>
                  </div>
                )}
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && selectedSession && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSession.courseTitle}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSession.date} • {selectedSession.startTime}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={downloadAttendanceCSV}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CSV
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Back to History
                    </button>
                  </div>
                </div>

                {sessionAttendance.length > 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Student Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Matricule</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Timestamp</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sessionAttendance.map((attendance) => (
                          <tr key={attendance.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{attendance.studentName}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{attendance.studentMatricule}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{attendance.timestamp}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${attendance.status === ATTENDANCE_STATUS.PRESENT
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : attendance.status === ATTENDANCE_STATUS.LATE
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                {attendance.status === ATTENDANCE_STATUS.PRESENT ? 'Present' :
                                  attendance.status === ATTENDANCE_STATUS.LATE ? 'Late' : 'Absent'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <p className="text-gray-600 dark:text-gray-400">No attendance recorded yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* CREATE SESSION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Session</h3>
              <button onClick={() => {
                setShowCreateModal(false);
                setCreateError(null);
              }} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{createError}</p>
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Course</label>
                <select
                  value={createForm.courseId}
                  onChange={(e) => setCreateForm({ ...createForm, courseId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {availableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.courseTitle} ({course.courseCode}) - {course.program} - {course.yearLevel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                  <input
                    type="time"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Session Lifecycle:</strong> Session will be <strong>Scheduled</strong> until start time,
                  then automatically become <strong>Open</strong> for attendance, and <strong>Close</strong> at end time.
                  Students who don't mark attendance will be marked <strong>Absent</strong>.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                    setCreateForm({
                      courseId: '',
                      date: new Date().toISOString().split('T')[0],
                      startTime: '08:00',
                      endTime: '10:00'
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    'Create Session'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Session Card Component for displaying session details
 */
const SessionCard = ({ session, onViewAttendance, getTimeRemaining, getStatusBadgeClass, getStatusLabel, expanded = false }) => {
  const timeRemaining = getTimeRemaining(session);
  const now = new Date();
  const sessionDate = session.session_date;
  const [startHour, startMin] = session.start_time.split(':').map(Number);
  const [endHour, endMin] = session.end_time.split(':').map(Number);

  const startDateTimeUTC = cameroonToUTC(sessionDate, startHour, startMin);
  const endDateTimeUTC = cameroonToUTC(sessionDate, endHour, endMin);
  const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

  const isOpen = nowUTC >= startDateTimeUTC && nowUTC <= endDateTimeUTC;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 ${isOpen ? 'border-l-4 border-l-green-500' : ''
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isOpen && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
            <p className="font-semibold text-gray-900 dark:text-white">{session.courseTitle}</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{session.className}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {session.date} • {session.startTime} - {session.endTime}
          </p>
          {expanded && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                <strong>{session.attendanceCount}</strong> students marked
              </span>
            </div>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(session.status)}`}>
            {getStatusLabel(session.status)}
          </span>
          {timeRemaining && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timeRemaining.formatted}
            </span>
          )}
          <button
            onClick={onViewAttendance}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold"
          >
            View Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default DelegateDashboard;
