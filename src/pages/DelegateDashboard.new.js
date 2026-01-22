import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  delegateFetchAssignedClasses,
  delegateFetchSessions,
  delegateFetchSessionAttendance,
  delegateFetchStats,
  createSession,
  markAttendance
} from '../utils/dashboardQueries';

const DelegateDashboard = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
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
  const [createForm, setCreateForm] = useState({
    classId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00'
  });

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

  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      const [classesData, sessionsData, statsData] = await Promise.all([
        delegateFetchAssignedClasses(currentUser.id),
        delegateFetchSessions(currentUser.id),
        delegateFetchStats(currentUser.id)
      ]);

      setAssignedClasses(classesData.classes);
      setSessions(sessionsData.sessions);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching delegate data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!createForm.classId) {
      alert('Please select a class');
      return;
    }

    try {
      setCreating(true);
      const { session, error } = await createSession(
        currentUser.id,
        createForm.classId,
        createForm.date,
        createForm.startTime,
        createForm.endTime
      );

      if (error) {
        alert('Error creating session: ' + error);
        return;
      }

      alert('Session created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        classId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '10:00'
      });
      fetchAllData();
    } catch (error) {
      alert('Error: ' + error.message);
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
      setSelectedSession(sessions.find(s => s.id === sessionId));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-300 border-t-purple-600 mb-4" />
          <p className="text-gray-700 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'delegate') {
    return null;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'classes', label: 'My Classes', icon: 'school' },
    { id: 'sessions', label: 'Sessions', icon: 'event_note' },
    { id: 'attendance', label: 'Attendance', icon: 'check_circle' }
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 shadow-lg`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined">person</span>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold'
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
                Attendance Management Portal
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome, {currentUser?.name || currentUser?.email}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
                <span className="material-symbols-outlined">add</span>
                New Session
              </button>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-bold cursor-pointer">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Active Sessions</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeSessions}</p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400">event_note</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Currently open</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Total Sessions</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSessions}</p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">history</span>
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
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">check_circle</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total records</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Today's Sessions</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.todaySessions}</p>
                      </div>
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">today</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled today</p>
                  </div>
                </div>

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
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              cls.hasActiveSession 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                            }`}>
                              {cls.sessionToday}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{cls.className}</p>
                          <button 
                            onClick={() => setShowCreateModal(true)}
                            className="w-full px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
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
                          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-semibold">
                            {cls.program}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">{cls.className}</p>
                        <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
                          Manage Class
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

            {/* SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Sessions</h2>
                {sessions.length > 0 ? (
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
                        {sessions.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{session.courseTitle}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.className}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.date}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.startTime}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.attendanceCount}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                session.status === 'Open'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                              }`}>
                                {session.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => handleViewAttendance(session.id)}
                                className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-semibold"
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
                    <p className="text-gray-600 dark:text-gray-400">No sessions yet</p>
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
                  <button 
                    onClick={() => setActiveTab('sessions')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Back to Sessions
                  </button>
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
                              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                                {attendance.status}
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
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Class</label>
                <select
                  value={createForm.classId}
                  onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose a class...</option>
                  {assignedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.courseTitle} - {cls.className}
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                  <input
                    type="time"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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

export default DelegateDashboard;
