import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  studentFetchEnrolledCourses,
  studentFetchActiveSessions,
  studentFetchAttendanceSummary,
  studentFetchCourseAttendance,
  studentFetchAlerts,
  markAttendance
} from '../utils/dashboardQueries';

const StudentDashboard = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [summary, setSummary] = useState({
    totalSessions: 0,
    totalAttended: 0,
    attendancePercentage: 0,
    status: 'Unknown'
  });
  const [courseAttendance, setCourseAttendance] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // UI states
  const [loadingData, setLoadingData] = useState(true);
  const [marking, setMarking] = useState(false);

  // Auth check
  useEffect(() => {
    if (!loading && (!currentUser || userRole !== 'student')) {
      navigate('/student');
      return;
    }

    if (!loading && currentUser && userRole === 'student') {
      fetchAllData();
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userRole, loading, navigate]);

  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      const [coursesData, sessionsData, summaryData, attendanceData, alertsData] = await Promise.all([
        studentFetchEnrolledCourses(currentUser.id),
        studentFetchActiveSessions(currentUser.id),
        studentFetchAttendanceSummary(currentUser.id),
        studentFetchCourseAttendance(currentUser.id),
        studentFetchAlerts(currentUser.id)
      ]);

      setEnrolledCourses(coursesData.courses);
      setActiveSessions(sessionsData.sessions);
      setSummary(summaryData.summary);
      setCourseAttendance(attendanceData.courseAttendance);
      setAlerts(alertsData.alerts);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleMarkAttendance = async (sessionId) => {
    try {
      setMarking(true);
      const { success, error } = await markAttendance(currentUser.id, sessionId);

      if (error) {
        alert('Error: ' + error);
        return;
      }

      alert('✅ Attendance marked successfully!');
      fetchAllData();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setMarking(false);
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-300 border-t-emerald-600 mb-4" />
          <p className="text-gray-700 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'student') {
    return null;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'sessions', label: 'Active Sessions', icon: 'event_note' },
    { id: 'attendance', label: 'My Attendance', icon: 'check_circle' },
    { id: 'courses', label: 'My Courses', icon: 'school' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Good':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Fair':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'Low':
      case 'Critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 shadow-lg`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined">student</span>
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">Student</p>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold'
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Attendance Portal
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome, {currentUser?.name || currentUser?.email}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {alerts.length > 0 && (
                <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">notifications</span>
                  <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                </button>
              )}

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white font-bold cursor-pointer">
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
                {/* ALERTS */}
                {alerts.length > 0 && (
                  <div className="space-y-3">
                    {alerts.map((alert, idx) => (
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
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {alert.courseCode}: {alert.percentage}% attendance
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ATTENDANCE SUMMARY CARD */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-8 text-white shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium mb-2">Total Sessions</p>
                      <p className="text-4xl font-bold">{summary.totalSessions}</p>
                    </div>
                    <div>
                      <p className="text-emerald-100 text-sm font-medium mb-2">Sessions Attended</p>
                      <p className="text-4xl font-bold">{summary.totalAttended}</p>
                    </div>
                    <div>
                      <p className="text-emerald-100 text-sm font-medium mb-2">Overall Attendance</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold">{summary.attendancePercentage}%</p>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          summary.status === 'Good' ? 'bg-green-500/30 text-green-100' :
                          summary.status === 'Fair' ? 'bg-amber-500/30 text-amber-100' :
                          'bg-red-500/30 text-red-100'
                        }`}>
                          {summary.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTIVE SESSIONS */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">🎫 Active Sessions to Mark</h3>
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-semibold">
                      {activeSessions.length} available
                    </span>
                  </div>

                  {activeSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{session.courseTitle}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{session.courseCode}</p>
                            </div>
                            {session.isMarked ? (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-semibold">
                                ✓ Marked
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-semibold">
                                Open
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <p>📅 {session.date}</p>
                            <p>🕐 {session.startTime} - {session.endTime}</p>
                            <p>👨‍🏫 {session.delegateName}</p>
                          </div>

                          {!session.isMarked && (
                            <button
                              onClick={() => handleMarkAttendance(session.id)}
                              disabled={marking}
                              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                              {marking ? (
                                <>
                                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  Marking...
                                </>
                              ) : (
                                '✓ Mark Attendance'
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4">event_busy</span>
                      <p className="text-gray-600 dark:text-gray-400">No active sessions at the moment</p>
                    </div>
                  )}
                </div>

                {/* COURSE ATTENDANCE SUMMARY */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">📊 Attendance by Course</h3>

                  {courseAttendance.length > 0 ? (
                    <div className="space-y-4">
                      {courseAttendance.map((course, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">{course.courseTitle}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{course.courseCode} • {course.attended}/{course.totalSessions} sessions</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">{course.attendancePercentage}%</p>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${getStatusColor(course.status)}`}>
                                {course.status}
                              </span>
                            </div>
                            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                              background: `conic-gradient(rgb(16, 185, 129) ${course.attendancePercentage}%, rgb(229, 231, 235) 0)`
                            }}>
                              <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{course.attendancePercentage}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600 dark:text-gray-400">No courses enrolled yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVE SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Active Sessions</h2>

                {activeSessions.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {activeSessions.map((session) => (
                      <div key={session.id} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{session.courseTitle}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{session.courseCode}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            session.isMarked
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          }`}>
                            {session.isMarked ? '✓ Marked' : '🔴 Open'}
                          </span>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          <p>📅 <strong>Date:</strong> {session.date}</p>
                          <p>🕐 <strong>Time:</strong> {session.startTime} - {session.endTime}</p>
                          <p>📍 <strong>Class:</strong> {session.className}</p>
                          <p>👨‍🏫 <strong>Instructor:</strong> {session.delegateName}</p>
                        </div>

                        {!session.isMarked && (
                          <button
                            onClick={() => handleMarkAttendance(session.id)}
                            disabled={marking}
                            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            ✓ Mark Attendance
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4">event_busy</span>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No active sessions available</p>
                  </div>
                )}
              </div>
            )}

            {/* MY ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Attendance Record</h2>

                {courseAttendance.length > 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Course</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Code</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Attended</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Total</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Percentage</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-900 dark:text-white">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {courseAttendance.map((course, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">{course.courseTitle}</td>
                            <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{course.courseCode}</td>
                            <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{course.attended}</td>
                            <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{course.totalSessions}</td>
                            <td className="px-6 py-3 text-gray-700 dark:text-gray-300 font-semibold">{course.attendancePercentage}%</td>
                            <td className="px-6 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(course.status)}`}>
                                {course.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <p className="text-gray-600 dark:text-gray-400">No attendance records yet</p>
                  </div>
                )}
              </div>
            )}

            {/* MY COURSES TAB */}
            {activeTab === 'courses' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Enrolled Courses</h2>

                {enrolledCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrolledCourses.map((course) => (
                      <div key={course.id} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{course.courseTitle}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{course.courseCode}</p>
                          </div>
                          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-semibold">
                            ✓ Enrolled
                          </span>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {course.program && <p>📚 <strong>Program:</strong> {course.program}</p>}
                          {course.yearLevel && <p>📊 <strong>Year:</strong> {course.yearLevel}</p>}
                        </div>

                        <button className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-800">
                    <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4">school</span>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No courses enrolled yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
