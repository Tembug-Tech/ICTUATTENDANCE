import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  adminFetchStats,
  adminFetchOpenSessions,
  adminFetchCourseAttendance,
  adminFetchAttendanceAlerts,
  adminFetchAttendanceExportData,
  createCourse,
  createDelegate,
  createSession,
  adminFetchAllClasses,
  adminFetchAllStudents,
  adminFetchAllCourses,
  adminFetchAllDelegates,
  promoteStudentToDelegate
} from '../utils/dashboardQueries';
import {
  generateAttendanceCSV,
  generateAttendanceTSV,
  generateSummaryReport,
  getFormattedDateForFilename,
  isValidDateRange
} from '../utils/excelExport';
import {
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  Clock,
  Users,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserCheck,
  BookOpen,
  Calendar,
  CalendarX,
  Download,
  Moon,
  Sun
} from 'lucide-react';

const AdminDashboard = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Add Course modal states
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    courseCode: '',
    courseTitle: '',
    program: '',
    yearLevel: '',
    instructor: ''
  });
  const [courseLoading, setCourseLoading] = useState(false);

  // Add Delegate modal states
  const [showAddDelegateModal, setShowAddDelegateModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [delegateForm, setDelegateForm] = useState({
    studentId: ''
  });
  const [delegateLoading, setDelegateLoading] = useState(false);

  // CSV Upload modal states
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);

  // Create Session modal states
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableDelegates, setAvailableDelegates] = useState([]);
  const [sessionForm, setSessionForm] = useState({
    courseId: '',
    delegateId: '',
    sessionDate: '',
    startTime: '',
    endTime: ''
  });
  const [sessionCreating, setSessionCreating] = useState(false);

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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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

  const handleCreateCourse = async () => {
    try {
      setCourseLoading(true);

      // Validate required fields
      if (!courseForm.courseCode || !courseForm.courseTitle || !courseForm.program || !courseForm.yearLevel || !courseForm.instructor) {
        alert('Please fill in all required fields');
        setCourseLoading(false);
        return;
      }

      const { course, error } = await createCourse(courseForm);

      if (error) {
        alert('Error creating course: ' + error);
        setCourseLoading(false);
        return;
      }

      // Reset form and close modal
      setCourseForm({
        courseCode: '',
        courseTitle: '',
        program: '',
        yearLevel: '',
        instructor: ''
      });
      setShowAddCourseModal(false);

      // Refresh dashboard data
      await fetchDashboardData();

      alert('Course created successfully!');
    } catch (error) {
      console.error('Create course error:', error);
      alert('Error creating course: ' + error.message);
    } finally {
      setCourseLoading(false);
    }
  };

  const handleCreateDelegate = async () => {
    try {
      setDelegateLoading(true);

      // Validate required fields
      if (!delegateForm.studentId) {
        alert('Please select a student to promote to delegate');
        setDelegateLoading(false);
        return;
      }

      const { delegate, error } = await promoteStudentToDelegate(delegateForm.studentId);

      if (error) {
        alert('Error promoting student to delegate: ' + error);
        setDelegateLoading(false);
        return;
      }

      // Reset form and close modal
      setDelegateForm({
        studentId: ''
      });
      setShowAddDelegateModal(false);

      // Refresh dashboard data
      await fetchDashboardData();

      alert('Student promoted to delegate successfully!');
    } catch (error) {
      console.error('Promote delegate error:', error);
      alert('Error promoting student to delegate: ' + error.message);
    } finally {
      setDelegateLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    try {
      setCsvUploading(true);

      if (!csvFile) {
        alert('Please select a CSV file');
        setCsvUploading(false);
        return;
      }

      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        const csvText = e.target.result;
        const lines = csvText.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          alert('CSV file must have at least a header row and one data row');
          setCsvUploading(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const expectedHeaders = ['student_id', 'session_id', 'status'];

        // Check if required headers exist
        const hasRequiredHeaders = expectedHeaders.every(header =>
          headers.includes(header)
        );

        if (!hasRequiredHeaders) {
          alert('CSV must contain columns: student_id, session_id, status');
          setCsvUploading(false);
          return;
        }

        const attendanceRecords = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= 3) {
            const record = {
              student_id: values[headers.indexOf('student_id')],
              session_id: values[headers.indexOf('session_id')],
              status: values[headers.indexOf('status')] || 'present'
            };
            attendanceRecords.push(record);
          }
        }

        if (attendanceRecords.length === 0) {
          alert('No valid attendance records found in CSV');
          setCsvUploading(false);
          return;
        }

        // Bulk insert attendance records
        const { data, error } = await supabase
          .from('attendance')
          .insert(attendanceRecords);

        if (error) {
          alert('Error uploading attendance data: ' + error.message);
          setCsvUploading(false);
          return;
        }

        // Reset and close modal
        setCsvFile(null);
        setShowCsvUploadModal(false);

        // Refresh dashboard data
        await fetchDashboardData();

        alert(`Successfully uploaded ${attendanceRecords.length} attendance records!`);
      };

      fileReader.readAsText(csvFile);
    } catch (error) {
      console.error('CSV upload error:', error);
      alert('Error processing CSV file: ' + error.message);
    } finally {
      setCsvUploading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      setSessionCreating(true);

      // Validate required fields
      if (!sessionForm.courseId || !sessionForm.delegateId || !sessionForm.sessionDate || !sessionForm.startTime || !sessionForm.endTime) {
        alert('Please fill in all required fields');
        setSessionCreating(false);
        return;
      }

      // Validate times
      if (sessionForm.startTime >= sessionForm.endTime) {
        alert('End time must be after start time');
        setSessionCreating(false);
        return;
      }

      // Validate start time is not in the past
      const now = new Date();
      const sessionDateTime = new Date(sessionForm.sessionDate);
      const [startHour, startMin] = sessionForm.startTime.split(':').map(Number);
      sessionDateTime.setHours(startHour, startMin, 0, 0);

      // Convert to UTC for comparison
      const sessionDateTimeUTC = new Date(sessionDateTime.getTime() - (1 * 60 * 60 * 1000)); // Cameroon to UTC
      const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

      if (sessionDateTimeUTC <= nowUTC) {
        alert('Session start time cannot be in the past');
        setSessionCreating(false);
        return;
      }

      const { session, error } = await createSession(
        sessionForm.courseId, // courseId
        sessionForm.delegateId, // delegateId
        sessionForm.sessionDate, // sessionDate
        sessionForm.startTime, // startTime
        sessionForm.endTime // endTime
      );

      if (error) {
        alert('Error creating session: ' + error);
        setSessionCreating(false);
        return;
      }

      // Reset form and close modal
      setSessionForm({
        courseId: '',
        delegateId: '',
        sessionDate: '',
        startTime: '',
        endTime: ''
      });
      setShowCreateSessionModal(false);

      // Refresh dashboard data
      await fetchDashboardData();

      alert('Session created successfully!');
    } catch (error) {
      console.error('Create session error:', error);
      alert('Error creating session: ' + error.message);
    } finally {
      setSessionCreating(false);
    }
  };

  // Load available courses and delegates when modal opens
  useEffect(() => {
    if (showCreateSessionModal && (availableCourses.length === 0 || availableDelegates.length === 0)) {
      const loadData = async () => {
        const { courses, error: coursesError } = await adminFetchAllCourses();
        const { delegates, error: delegatesError } = await adminFetchAllDelegates();
        if (!coursesError) {
          setAvailableCourses(courses);
        }
        if (!delegatesError) {
          setAvailableDelegates(delegates);
        }
      };
      loadData();
    }
  }, [showCreateSessionModal, availableCourses.length, availableDelegates.length]);

  // Load available students when delegate modal opens
  useEffect(() => {
    if (showAddDelegateModal && availableStudents.length === 0) {
      const loadStudents = async () => {
        const { students, error } = await adminFetchAllStudents();
        if (!error) {
          setAvailableStudents(students);
        }
      };
      loadStudents();
    }
  }, [showAddDelegateModal, availableStudents.length]);

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
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'
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
                <path d="M17 11c.34 0 .67.04 1 .09V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.72.36.09.74.09 1.1 0C13.81 19.06 17 14.81 17 10.18V11z" />
                <path d="M17 13c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
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
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${activeSection === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {item.icon === 'dashboard' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                    </svg>
                  )}
                  {item.icon === 'school' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                    </svg>
                  )}
                  {item.icon === 'fact_check' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
                    </svg>
                  )}
                  {item.icon === 'schedule' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                  )}
                  {item.icon === 'group' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63C19.68 7.55 18.92 7 18.09 7c-.84 0-1.6.55-1.87 1.37L13.5 16H16v6h-2V4h-1v16H4v-6H2.5l2.54-7.63C5.32 7.55 6.08 7 6.91 7c.84 0 1.6.55 1.87 1.37L11.5 16H8v6H6V4h1v16h10z" />
                    </svg>
                  )}
                  {item.icon === 'analytics' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
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
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
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
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z" />
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
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" style={{ color: '#475569' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
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
                        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63C19.68 7.55 18.92 7 18.09 7c-.84 0-1.6.55-1.87 1.37L13.5 16H16v6h-2V4h-1v16H4v-6H2.5l2.54-7.63C5.32 7.55 6.08 7 6.91 7c.84 0 1.6.55 1.87 1.37L11.5 16H8v6H6V4h1v16h10z" />
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
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
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
                        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
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
                        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
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
                    onClick={() => setShowCsvUploadModal(true)}
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
                  onClick={() => setShowCreateSessionModal(true)}
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
                  onClick={() => setShowAddCourseModal(true)}
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
                  onClick={() => setShowAddDelegateModal(true)}
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

      {/* ADD COURSE MODAL */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="w-full max-w-lg mx-4 p-6 rounded-lg border border-gray-200"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>Add New Course</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Course Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., CS101"
                  value={courseForm.courseCode}
                  onChange={(e) => setCourseForm({ ...courseForm, courseCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Course Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Introduction to Computer Science"
                  value={courseForm.courseTitle}
                  onChange={(e) => setCourseForm({ ...courseForm, courseTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Program *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={courseForm.program}
                  onChange={(e) => setCourseForm({ ...courseForm, program: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Year Level *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Year 1"
                  value={courseForm.yearLevel}
                  onChange={(e) => setCourseForm({ ...courseForm, yearLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Instructor *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dr. John Smith"
                  value={courseForm.instructor}
                  onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  required
                />
              </div>

              {courseLoading && (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#475569' }}>Creating course...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddCourseModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300"
                style={{ color: '#475569' }}
                disabled={courseLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={courseLoading}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#16A34A' }}
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DELEGATE MODAL */}
      {showAddDelegateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="w-full max-w-lg mx-4 p-6 rounded-lg border border-gray-200"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>Promote Student to Delegate</h3>

            <div className="space-y-4">
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
              >
                <p className="text-sm" style={{ color: '#475569' }}>
                  Select a student from the list below to promote them to delegate role.
                  This will change their role from 'student' to 'delegate'.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Select Student *
                </label>
                <select
                  value={delegateForm.studentId}
                  onChange={(e) => setDelegateForm({ ...delegateForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                >
                  <option value="">Choose a student...</option>
                  {availableStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.matricule})
                    </option>
                  ))}
                </select>
              </div>

              {delegateLoading && (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#475569' }}>Creating delegate...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDelegateModal(false);
                  setDelegateForm({ studentId: '' });
                }}
                className="px-4 py-2 rounded-lg border border-gray-300"
                style={{ color: '#475569' }}
                disabled={delegateLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDelegate}
                disabled={delegateLoading || !delegateForm.studentId}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#16A34A' }}
              >
                Promote to Delegate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV UPLOAD MODAL */}
      {showCsvUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="w-full max-w-lg mx-4 p-6 rounded-lg border border-gray-200"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>Upload Attendance CSV</h3>

            <div className="space-y-4">
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
              >
                <p className="text-sm mb-2" style={{ color: '#475569' }}>
                  Upload a CSV file with attendance records. The file must contain these columns:
                </p>
                <ul className="text-sm list-disc list-inside" style={{ color: '#475569' }}>
                  <li><strong>student_id:</strong> Student matricule or ID</li>
                  <li><strong>session_id:</strong> Session token or ID</li>
                  <li><strong>status:</strong> Attendance status (present/late/absent)</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                />
                {csvFile && (
                  <p className="text-sm mt-2" style={{ color: '#16A34A' }}>
                    Selected: {csvFile.name}
                  </p>
                )}
              </div>

              {csvUploading && (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#475569' }}>Processing CSV file...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCsvUploadModal(false);
                  setCsvFile(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300"
                style={{ color: '#475569' }}
                disabled={csvUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleCsvUpload}
                disabled={csvUploading || !csvFile}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#16A34A' }}
              >
                Upload CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="w-full max-w-lg mx-4 p-6 rounded-lg border border-gray-200"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>Create New Session</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Select Course *
                </label>
                <select
                  value={sessionForm.courseId}
                  onChange={(e) => setSessionForm({ ...sessionForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                >
                  <option value="">Choose a course...</option>
                  {availableCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.courseTitle} ({course.courseCode}) - {course.program} - {course.yearLevel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Select Instructor *
                </label>
                <select
                  value={sessionForm.delegateId}
                  onChange={(e) => setSessionForm({ ...sessionForm, delegateId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                >
                  <option value="">Choose an instructor...</option>
                  {availableDelegates.map(delegate => (
                    <option key={delegate.id} value={delegate.id}>
                      {delegate.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Session Date *
                </label>
                <input
                  type="date"
                  value={sessionForm.sessionDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  />
                </div>
              </div>

              {sessionCreating && (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#475569' }}>Creating session...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateSessionModal(false);
                  setSessionForm({
                    courseId: '',
                    delegateId: '',
                    sessionDate: '',
                    startTime: '',
                    endTime: ''
                  });
                }}
                className="px-4 py-2 rounded-lg border border-gray-300"
                style={{ color: '#475569' }}
                disabled={sessionCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={sessionCreating}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#16A34A' }}
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
