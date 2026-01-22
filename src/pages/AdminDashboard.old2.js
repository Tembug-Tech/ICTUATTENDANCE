import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  adminFetchStats,
  adminFetchOpenSessions,
  adminFetchCourseAttendance,
  adminFetchAttendanceAlerts
} from '../utils/dashboardQueries';

const AdminDashboard = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dashboard data
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalDelegates: 0,
    totalCourses: 0,
    totalClasses: 0,
    sessionsToday: 0,
    error: null
  });
  
  const [openSessions, setOpenSessions] = useState([]);
  const [courseAttendance, setCourseAttendance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Auth check
  useEffect(() => {
    if (!loading && (!currentUser || userRole !== 'admin')) {
      navigate('/admin');
      return;
    }
    
    if (!loading && currentUser && userRole === 'admin') {
      fetchAllDashboardData();
      // Refresh every 30 seconds
      const interval = setInterval(fetchAllDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userRole, loading, navigate]);

  const fetchAllDashboardData = async () => {
    try {
      setLoadingData(true);
      const [statsData, sessionsData, attendanceData, alertsData] = await Promise.all([
        adminFetchStats(),
        adminFetchOpenSessions(),
        adminFetchCourseAttendance(10),
        adminFetchAttendanceAlerts()
      ]);

      setStats(statsData);
      setOpenSessions(sessionsData.sessions);
      setCourseAttendance(attendanceData.courseAttendance);
      setAlerts(alertsData.alerts);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-300 border-t-blue-600 mb-4" />
          <p className="text-gray-700 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'admin') {
    return null;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'sessions', label: 'Live Sessions', icon: 'event_note' },
    { id: 'attendance', label: 'Attendance', icon: 'check_circle' },
    { id: 'alerts', label: 'Alerts', icon: 'warning' },
    { id: 'users', label: 'Users', icon: 'people' },
    { id: 'reports', label: 'Reports', icon: 'assessment' }
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 shadow-lg`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined">school</span>
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">Attendance</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <span className="material-symbols-outlined text-xl">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
            {sidebarOpen && <span className="text-sm">Theme</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            {sidebarOpen && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <span className="material-symbols-outlined">
              {sidebarOpen ? 'navigate_before' : 'navigate_next'}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'overview' && 'System Overview'}
                {activeTab === 'sessions' && 'Live Attendance Sessions'}
                {activeTab === 'attendance' && 'Attendance Statistics'}
                {activeTab === 'alerts' && 'System Alerts'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'reports' && 'Reports & Analytics'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">notifications</span>
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold cursor-pointer">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="p-8 max-w-7xl mx-auto">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Total Students</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalStudents}</p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">group</span>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">↑ 12% from last month</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Total Delegates</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalDelegates}</p>
                      </div>
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">people</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active instructors</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Total Courses</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCourses}</p>
                      </div>
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">book</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Registered courses</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Total Classes</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalClasses}</p>
                      </div>
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">school</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Class sections</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Sessions Today</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.sessionsToday}</p>
                      </div>
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">event_note</span>
                      </div>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400">Active sessions</p>
                  </div>
                </div>

                {/* COURSE ATTENDANCE OVERVIEW */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Course Attendance Overview</h3>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">download</span>
                      Export
                    </button>
                  </div>

                  <div className="space-y-4">
                    {courseAttendance.slice(0, 8).map((course, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{course.courseTitle}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{course.courseCode} • {course.enrolledStudents} students</p>
                        </div>
                        <div className="flex-1 max-w-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{course.attendancePercentage}%</span>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              course.status === 'Good' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              course.status === 'Fair' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {course.status}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                course.status === 'Good' ? 'bg-green-500' :
                                course.status === 'Fair' ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${course.attendancePercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Open Attendance Sessions</h3>

                {openSessions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Session ID</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Course</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Delegate</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Time</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {openSessions.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{session.tokenPreview}</td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{session.className}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.delegateName}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.date}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.startTime} - {session.endTime}</td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                                {session.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No active sessions at the moment</p>
                  </div>
                )}
              </div>
            )}

            {/* ALERTS TAB */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert, idx) => (
                    <div key={idx} className={`rounded-xl p-4 border-l-4 ${
                      alert.severity === 'critical' 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                    }`}>
                      <div className="flex items-start gap-4">
                        <span className={`material-symbols-outlined mt-1 ${
                          alert.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {alert.severity === 'critical' ? 'error' : 'warning'}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">{alert.message}</p>
                          {alert.courseTitle && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Course: {alert.courseTitle} | Attendance: {alert.attendance}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-4">check_circle</span>
                    <p className="text-gray-600 dark:text-gray-400">No alerts at the moment</p>
                  </div>
                )}
              </div>
            )}

            {/* PLACEHOLDER FOR OTHER TABS */}
            {!['overview', 'sessions', 'alerts'].includes(activeTab) && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4">construction</span>
                <p className="text-gray-600 dark:text-gray-400 text-lg">This section is coming soon</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
