import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

const DelegateDashboard = () => {
  const { currentUser, userRole, loading } = useAuth();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    totalAttendance: 0,
    uniqueStudents: 0,
    thisMonth: 0,
    lastMonth: 0
  });
  const [stats, setStats] = useState({
    activeSessions: 0,
    totalSessions: 0,
    totalMarked: 0,
    todaySessions: 0
  });

  // Modal state
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState(null);
  const [selectedAttendanceForNotes, setSelectedAttendanceForNotes] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [noteText, setNoteText] = useState('');

  // Form state
  const [createSessionForm, setCreateSessionForm] = useState({
    courseId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00'
  });

  // UI state
  const [loading2, setLoading2] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [timeCountdown, setTimeCountdown] = useState({});

  useEffect(() => {
    if (loading) return;

    if (!currentUser || userRole !== 'delegate') {
      navigate('/delegate');
      return;
    }

    fetchAllData();
  }, [currentUser, userRole, loading, navigate]);

  // Timer for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeCountdown(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(sessionId => {
          const session = sessions.find(s => s.id === sessionId);
          if (session) {
            const now = new Date();
            const [endHour, endMin] = session.end_time.split(':');
            const sessionDate = new Date(session.session_date);
            const endTime = new Date(sessionDate);
            endTime.setHours(parseInt(endHour), parseInt(endMin), 0);

            const diffMs = endTime - now;
            if (diffMs <= 0) {
              delete updated[sessionId];
            } else {
              const minutes = Math.floor(diffMs / 60000);
              const seconds = Math.floor((diffMs % 60000) / 1000);
              updated[sessionId] = `${minutes}m ${seconds}s`;
            }
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessions]);

  const fetchAllData = async () => {
    try {
      setLoading2(true);
      setError(null);

      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, course_code, course_title')
        .order('course_code', { ascending: true });

      setCourses(coursesData || []);

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          start_time,
          end_time,
          created_at,
          expires_at,
          classes (
            class_name
          )
        `)
        .order('created_at', { ascending: false });

      // Get attendance counts
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('id')
            .eq('session_id', session.id);

          const isActive = new Date(session.expires_at) > new Date();
          return {
            ...session,
            attendanceCount: attendanceData?.length || 0,
            isActive
          };
        })
      );

      setSessions(sessionsWithCounts);

      // Fetch attendance history from all delegate's sessions
      const { data: allAttendance } = await supabase
        .from('attendance')
        .select(`
          id,
          session_id,
          student_id,
          notes,
          created_at,
          users (
            name,
            matricule,
            email
          ),
          sessions (
            session_date,
            start_time,
            end_time,
            classes (
              class_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      setAttendanceHistory(allAttendance || []);

      // Calculate attendance stats
      if (allAttendance && allAttendance.length > 0) {
        const uniqueStudents = new Set(allAttendance.map(a => a.student_id)).size;
        const now = new Date();
        const thisMonth = allAttendance.filter(a => {
          const date = new Date(a.created_at);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;
        const lastMonth = allAttendance.filter(a => {
          const date = new Date(a.created_at);
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
        }).length;

        setAttendanceStats({
          totalAttendance: allAttendance.length,
          uniqueStudents,
          thisMonth,
          lastMonth
        });
      }

      // Calculate stats
      const activeSessions = sessionsWithCounts.filter(s => s.isActive).length;
      const totalMarked = sessionsWithCounts.reduce((sum, s) => sum + s.attendanceCount, 0);
      const todaySessions = sessionsWithCounts.filter(
        s => s.session_date === new Date().toISOString().split('T')[0]
      ).length;

      setStats({
        activeSessions,
        totalSessions: sessionsWithCounts.length,
        totalMarked,
        todaySessions
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading2(false);
    }
  };

  const handleCreateSession = async () => {
    if (!createSessionForm.courseId) {
      setError('Please select a course');
      return;
    }

    if (!createSessionForm.startTime || !createSessionForm.endTime) {
      setError('Please set start and end times');
      return;
    }

    if (createSessionForm.startTime >= createSessionForm.endTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const selectedCourse = courses.find(c => c.id === createSessionForm.courseId);
      if (!selectedCourse) {
        setError('Selected course not found');
        return;
      }

      // Check or create class
      const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('course_id', selectedCourse.id)
        .eq('delegate_id', currentUser.id);

      let classId = existingClass && existingClass.length > 0 ? existingClass[0].id : null;

      if (!classId) {
        const { data: newClass, error: classError } = await supabase
          .from('classes')
          .insert({
            class_name: `${selectedCourse.course_code} - ${selectedCourse.course_title}`,
            course_id: selectedCourse.id,
            delegate_id: currentUser.id
          })
          .select('id')
          .single();

        if (classError) throw classError;
        classId = newClass.id;
      }

      // Create session
      const sessionDate = new Date(createSessionForm.date);
      const [startHour, startMin] = createSessionForm.startTime.split(':');
      const [endHour, endMin] = createSessionForm.endTime.split(':');

      const endDateTime = new Date(sessionDate);
      endDateTime.setHours(parseInt(endHour), parseInt(endMin), 59, 999);

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          class_id: classId,
          token: `SESSION_${Date.now()}`,
          session_date: createSessionForm.date,
          start_time: createSessionForm.startTime,
          end_time: createSessionForm.endTime,
          expires_at: endDateTime.toISOString()
        });

      if (sessionError) throw sessionError;

      setSuccess('✅ Attendance session created successfully!');
      setShowCreateSessionModal(false);
      setCreateSessionForm({
        courseId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '10:00'
      });
      await fetchAllData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating session:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseSession = async (sessionId) => {
    if (!window.confirm('Close this session? Students will no longer be able to mark attendance.')) return;

    try {
      setIsClosing(true);
      setError(null);

      const { error } = await supabase
        .from('sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      setSuccess('✅ Session closed successfully!');
      await fetchAllData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error closing session:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsClosing(false);
    }
  };

  const handleMarkOwnAttendance = async (sessionId) => {
    try {
      setIsMarking(true);
      setError(null);

      // Check if already marked
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', currentUser.id);

      if (existing && existing.length > 0) {
        setError('You have already marked attendance for this session');
        return;
      }

      // Mark attendance
      const { error } = await supabase
        .from('attendance')
        .insert({
          session_id: sessionId,
          student_id: currentUser.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess('✅ Your attendance has been marked!');
      await fetchAllData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsMarking(false);
    }
  };

  const handleViewAttendance = async (sessionId) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          created_at,
          users (
            name,
            matricule
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSelectedSessionForAttendance(sessionId);
      setAttendanceList(data || []);
      setShowAttendanceModal(true);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError(`Error: ${err.message}`);
    }
  };

  if (loading || loading2) {
    return (
      <Layout role="delegate">
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border border-gray-300 border-t-blue-900 mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentUser || userRole !== 'delegate') return null;

  const activeSessions = sessions.filter(s => s.isActive);

  return (
    <Layout role="delegate">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
          
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-semibold text-gray-900">Delegate Dashboard</h1>
                <p className="text-gray-600 mt-2">Manage attendance sessions and monitor student attendance</p>
              </div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg w-fit">
                <span className="text-xl mr-2">👤</span>
                <span className="text-sm font-semibold text-blue-900">Delegate</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              {success}
            </div>
          )}

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <div>
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { 
                    label: 'Active Sessions', 
                    value: stats.activeSessions, 
                    icon: '🔴',
                    bgClass: 'bg-blue-50',
                    borderClass: 'border-blue-200',
                    textClass: 'text-blue-900'
                  },
                  { 
                    label: 'Total Sessions', 
                    value: stats.totalSessions, 
                    icon: '📋',
                    bgClass: 'bg-green-50',
                    borderClass: 'border-green-200',
                    textClass: 'text-green-900'
                  },
                  { 
                    label: 'Total Marked', 
                    value: stats.totalMarked, 
                    icon: '✓',
                    bgClass: 'bg-amber-50',
                    borderClass: 'border-amber-200',
                    textClass: 'text-amber-900'
                  },
                  { 
                    label: "Today's Sessions", 
                    value: stats.todaySessions, 
                    icon: '📅',
                    bgClass: 'bg-purple-50',
                    borderClass: 'border-purple-200',
                    textClass: 'text-purple-900'
                  }
                ].map((stat, idx) => (
                  <div key={idx} className={`${stat.bgClass} border ${stat.borderClass} rounded-lg p-6 transition-shadow hover:shadow-md`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                          {stat.label}
                        </p>
                        <p className={`text-4xl font-bold ${stat.textClass}`}>
                          {stat.value}
                        </p>
                      </div>
                      <span className="text-3xl opacity-50">{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions Section */}
              <div className="mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { 
                      label: 'Create Session', 
                      icon: '➕',
                      action: () => { setActiveTab('sessions'); setShowCreateSessionModal(true); },
                      description: 'Start a new attendance session'
                    },
                    { 
                      label: 'View Active Sessions', 
                      icon: '👁️',
                      action: () => setActiveTab('sessions'),
                      description: 'See all your active sessions'
                    }
                  ].map((action, idx) => (
                    <button
                      key={idx}
                      onClick={action.action}
                      className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{action.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                            {action.label}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sessions Preview */}
              {activeSessions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Active Right Now</h2>
                  <div className="space-y-4">
                    {activeSessions.slice(0, 3).map(session => (
                      <div 
                        key={session.id} 
                        className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900">{session.classes?.class_name}</h3>
                            <div className="flex gap-4 mt-2 text-sm text-gray-600">
                              <span>📅 {session.session_date}</span>
                              <span>🕐 {session.start_time} - {session.end_time}</span>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">● ACTIVE</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <span className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">{session.attendanceCount}</span> students marked
                          </span>
                          {timeCountdown[session.id] && (
                            <span className="text-sm font-medium text-blue-900">⏱ {timeCountdown[session.id]}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSessions.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <p className="text-gray-500 text-lg">No active sessions right now</p>
                  <p className="text-gray-400 text-sm mt-2">Create a new session to get started</p>
                </div>
              )}
            </div>
          )}

          {/* ===== SESSIONS TAB ===== */}
          {activeTab === 'sessions' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Sessions</h2>
                  <p className="text-gray-600 text-sm mt-2">{sessions.length} total sessions</p>
                </div>
                <button
                  onClick={() => setShowCreateSessionModal(true)}
                  className="px-6 py-3 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors inline-flex items-center gap-2 w-fit"
                >
                  <span>➕</span> Create Session
                </button>
              </div>

              {/* Sessions Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {sessions.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Marked</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {sessions.map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{session.classes?.class_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{session.session_date}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{session.start_time} - {session.end_time}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">{session.attendanceCount}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  session.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {session.isActive ? '● ACTIVE' : '○ CLOSED'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => handleViewAttendance(session.id)}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                                  >
                                    View
                                  </button>
                                  {session.isActive && (
                                    <>
                                      <button
                                        onClick={() => handleMarkOwnAttendance(session.id)}
                                        disabled={isMarking}
                                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-semibold hover:bg-green-200 transition-colors disabled:opacity-50"
                                      >
                                        Mark
                                      </button>
                                      <button
                                        onClick={() => handleCloseSession(session.id)}
                                        disabled={isClosing}
                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
                                      >
                                        Close
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="px-6 py-16 text-center">
                    <p className="text-gray-600 text-lg">No sessions created yet</p>
                    <p className="text-gray-400 text-sm mt-2">Create your first session to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== ATTENDANCE HISTORY TAB ===== */}
          {activeTab === 'attendance-history' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Attendance History</h2>
                <p className="text-gray-600 text-sm mt-2">Complete record of all attendance marked across your sessions</p>
              </div>

              {/* Attendance Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { 
                    label: 'Total Attendance Records', 
                    value: attendanceStats.totalAttendance, 
                    icon: '📊',
                    bgClass: 'bg-blue-50',
                    borderClass: 'border-blue-200',
                    textClass: 'text-blue-900'
                  },
                  { 
                    label: 'Unique Students', 
                    value: attendanceStats.uniqueStudents, 
                    icon: '👥',
                    bgClass: 'bg-green-50',
                    borderClass: 'border-green-200',
                    textClass: 'text-green-900'
                  },
                  { 
                    label: 'This Month', 
                    value: attendanceStats.thisMonth, 
                    icon: '📅',
                    bgClass: 'bg-amber-50',
                    borderClass: 'border-amber-200',
                    textClass: 'text-amber-900'
                  },
                  { 
                    label: 'Last Month', 
                    value: attendanceStats.lastMonth, 
                    icon: '📈',
                    bgClass: 'bg-purple-50',
                    borderClass: 'border-purple-200',
                    textClass: 'text-purple-900'
                  }
                ].map((stat, idx) => (
                  <div key={idx} className={`${stat.bgClass} border ${stat.borderClass} rounded-lg p-6 transition-shadow hover:shadow-md`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                          {stat.label}
                        </p>
                        <p className={`text-4xl font-bold ${stat.textClass}`}>
                          {stat.value}
                        </p>
                      </div>
                      <span className="text-3xl opacity-50">{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Attendance Records Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {attendanceHistory.length > 0 ? (
                  <>
                    <div className="p-6 flex justify-between items-center border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Attendance Records ({attendanceHistory.length})</h3>
                      <button
                        onClick={() => {
                          // Export to CSV
                          const csv = [
                            ['Name', 'Matricule', 'Email', 'Course', 'Date', 'Time Marked', 'Notes'],
                            ...attendanceHistory.map(record => [
                              record.users?.name || 'Unknown',
                              record.users?.matricule || 'N/A',
                              record.users?.email || 'N/A',
                              record.sessions?.classes?.class_name || 'N/A',
                              record.sessions?.session_date || 'N/A',
                              new Date(record.created_at).toLocaleString(),
                              record.notes || ''
                            ])
                          ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                          
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `attendance-history-${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                      >
                        <span>📥</span> Export CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Matricule</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time Marked</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {attendanceHistory.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.users?.name || 'Unknown'}</td>
                              <td className="px-6 py-4 text-sm font-mono text-gray-600">{record.users?.matricule || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{record.users?.email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{record.sessions?.classes?.class_name || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{record.sessions?.session_date || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <span className="inline-flex items-center gap-2">
                                  <span>🕐</span>
                                  {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => {
                                      setSelectedAttendanceForNotes(record);
                                      setNoteText(record.notes || '');
                                      setShowNotesModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                                  >
                                    {record.notes ? '📝 View' : '✎ Add'} Note
                                  </button>
                                  <button
                                    onClick={() => {
                                      const subject = `Attendance Confirmation - ${record.users?.name}`;
                                      const body = `Dear ${record.users?.name},\n\nYour attendance has been recorded on ${record.sessions?.session_date} at ${new Date(record.created_at).toLocaleTimeString()} for ${record.sessions?.classes?.class_name}.\n\nBest regards`;
                                      window.open(`mailto:${record.users?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                                    }}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold hover:bg-purple-200 transition-colors"
                                  >
                                    📧 Email
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="px-6 py-16 text-center">
                    <p className="text-gray-600 text-lg">No attendance records yet</p>
                    <p className="text-gray-400 text-sm mt-2">Attendance records will appear here as students mark attendance in sessions</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-8 mt-12 border-t border-gray-200 pt-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'sessions', label: 'Sessions' },
              { id: 'attendance-history', label: 'Attendance History' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-900 border-b-2 border-blue-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== MODALS ===== */}

        {/* Create Session Modal */}
        <Modal
          isOpen={showCreateSessionModal}
          title="Create Attendance Session"
          onClose={() => setShowCreateSessionModal(false)}
          size="md"
          footer={
            <>
              <button
                onClick={() => setShowCreateSessionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Session'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Course *</label>
              <select
                value={createSessionForm.courseId}
                onChange={(e) => setCreateSessionForm(prev => ({ ...prev, courseId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="">Select a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Date *</label>
              <input
                type="date"
                value={createSessionForm.date}
                onChange={(e) => setCreateSessionForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Start Time *</label>
                <input
                  type="time"
                  value={createSessionForm.startTime}
                  onChange={(e) => setCreateSessionForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">End Time *</label>
                <input
                  type="time"
                  value={createSessionForm.endTime}
                  onChange={(e) => setCreateSessionForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>
          </div>
        </Modal>

        {/* Attendance List Modal */}
        <Modal
          isOpen={showAttendanceModal}
          title="Attendance Records"
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedSessionForAttendance(null);
            setAttendanceList([]);
          }}
          size="lg"
          footer={
            <button
              onClick={() => {
                setShowAttendanceModal(false);
                setSelectedSessionForAttendance(null);
                setAttendanceList([]);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          }
        >
          <div>
            {attendanceList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Matricule</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Time Marked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendanceList.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{record.users?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-sm">{record.users?.matricule || 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-600">
                No attendance records yet
              </div>
            )}
          </div>
        </Modal>

        {/* Attendance Notes Modal */}
        <Modal
          isOpen={showNotesModal}
          title={`Notes - ${selectedAttendanceForNotes?.users?.name}`}
          onClose={() => {
            setShowNotesModal(false);
            setSelectedAttendanceForNotes(null);
            setNoteText('');
          }}
          size="md"
          footer={
            <>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedAttendanceForNotes(null);
                  setNoteText('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedAttendanceForNotes) return;
                  try {
                    const { error } = await supabase
                      .from('attendance')
                      .update({ notes: noteText })
                      .eq('id', selectedAttendanceForNotes.id);

                    if (error) throw error;

                    setSuccess('✅ Note saved successfully!');
                    await fetchAllData();
                    setShowNotesModal(false);
                    setSelectedAttendanceForNotes(null);
                    setNoteText('');
                    setTimeout(() => setSuccess(null), 3000);
                  } catch (err) {
                    console.error('Error saving note:', err);
                    setError(`Error: ${err.message}`);
                  }
                }}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800"
              >
                Save Note
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Student Info</label>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="text-sm"><span className="font-semibold text-gray-700">Name:</span> {selectedAttendanceForNotes?.users?.name}</p>
                <p className="text-sm"><span className="font-semibold text-gray-700">Matricule:</span> {selectedAttendanceForNotes?.users?.matricule}</p>
                <p className="text-sm"><span className="font-semibold text-gray-700">Email:</span> {selectedAttendanceForNotes?.users?.email}</p>
                <p className="text-sm"><span className="font-semibold text-gray-700">Course:</span> {selectedAttendanceForNotes?.sessions?.classes?.class_name}</p>
                <p className="text-sm"><span className="font-semibold text-gray-700">Date:</span> {selectedAttendanceForNotes?.sessions?.session_date}</p>
                <p className="text-sm"><span className="font-semibold text-gray-700">Time Marked:</span> {selectedAttendanceForNotes?.created_at && new Date(selectedAttendanceForNotes.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Add/Edit Note</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add any notes about this attendance record..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none"
                rows="6"
              />
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default DelegateDashboard;
