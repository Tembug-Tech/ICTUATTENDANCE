import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalDelegates: 0,
    totalClasses: 0,
    sessionsToday: 0,
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [courseAttendance, setCourseAttendance] = useState([]);
  const [loading2, setLoading2] = useState(true);

  // Auth check
  useEffect(() => {
    if (!loading && (!currentUser || userRole !== 'admin')) {
      navigate('/login');
      return;
    }
    if (!loading && currentUser && userRole === 'admin') {
      fetchDashboardData();
    }
  }, [currentUser, userRole, loading, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading2(true);

      // Fetch statistics
      const [studentsRes, delegatesRes, classesRes, sessionsRes, coursesRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'delegate'),
        supabase.from('classes').select('id', { count: 'exact' }),
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('courses').select('*'),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todaySessions = (sessionsRes.data || []).filter(s => s.session_date === today);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalDelegates: delegatesRes.count || 0,
        totalClasses: classesRes.count || 0,
        sessionsToday: todaySessions.length,
      });

      // Fetch recent sessions with real details
      const sessionsWithDetails = await Promise.all(
        (sessionsRes.data || []).slice(0, 5).map(async (session) => {
          const classRes = await supabase
            .from('classes')
            .select('class_name, course_id')
            .eq('id', session.class_id)
            .single();

          const courseRes = classRes?.data
            ? await supabase
              .from('courses')
              .select('course_code, course_title')
              .eq('id', classRes.data.course_id)
              .single()
            : null;

          const attendanceRes = await supabase
            .from('attendance')
            .select('id', { count: 'exact' })
            .eq('session_id', session.id);

          const totalStudents = (await supabase
            .from('attendance')
            .select('student_id')
            .eq('session_id', session.id)).data?.length || 0;

          return {
            id: session.id,
            sessionId: session.token?.slice(0, 8).toUpperCase() || 'N/A',
            className: courseRes?.data?.course_title || 'Unknown',
            date: new Date(session.session_date).toLocaleDateString(),
            time: session.start_time,
            status: new Date() > new Date(session.expires_at) ? 'Closed' : 'Open',
            attendancePercent: totalStudents > 0 ? attendanceRes.count || 0 : 0,
          };
        })
      );

      setRecentSessions(sessionsWithDetails);

      // Fetch real course attendance data
      const courseAttendanceData = await Promise.all(
        (coursesRes.data || []).slice(0, 5).map(async (course) => {
          const classesForCourse = await supabase
            .from('classes')
            .select('id')
            .eq('course_id', course.id);

          const sessionsForCourse = await supabase
            .from('sessions')
            .select('id')
            .in('class_id', classesForCourse.data?.map(c => c.id) || []);

          const totalAttendance = await supabase
            .from('attendance')
            .select('id', { count: 'exact' })
            .in('session_id', sessionsForCourse.data?.map(s => s.id) || []);

          const totalPossible = (sessionsForCourse.data?.length || 0) * (studentsRes.count || 1);
          const percent = totalPossible > 0 ? Math.floor((totalAttendance.count / totalPossible) * 100) : 0;

          return {
            course: course.course_title,
            attendance: percent,
            status: percent >= 80 ? 'excellent' : percent >= 60 ? 'average' : 'poor',
          };
        })
      );

      setCourseAttendance(courseAttendanceData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading2(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading || loading2) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border border-gray-300 border-t-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'admin') {
    return null;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', color: 'text-primary' },
    { id: 'students', label: 'Students', icon: 'group', color: 'text-primary' },
    { id: 'delegates', label: 'Delegates', icon: 'people', color: 'text-primary' },
    { id: 'classes', label: 'Classes & Courses', icon: 'school', color: 'text-primary' },
    { id: 'sessions', label: 'Attendance Sessions', icon: 'event_note', color: 'text-primary' },
    { id: 'reports', label: 'Reports', icon: 'assessment', color: 'text-primary' },
    { id: 'logs', label: 'System Logs', icon: 'history', color: 'text-primary' },
    { id: 'settings', label: 'Settings', icon: 'settings', color: 'text-primary' },
  ];

  const handleNavClick = (itemId) => {
    switch (itemId) {
      case 'students':
        navigate('/admin/students');
        break;
      case 'delegates':
        navigate('/admin/delegates');
        break;
      case 'classes':
        navigate('/admin/classes');
        break;
      case 'sessions':
        navigate('/admin/sessions');
        break;
      case 'reports':
        navigate('/admin/reports');
        break;
      case 'logs':
        navigate('/admin/logs');
        break;
      case 'settings':
        navigate('/admin/settings');
        break;
      default:
        break;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* ========== LEFT SIDEBAR ========== */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'
          } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 shadow-sm`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined">school</span>
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">ICT Univ.</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${item.id === 'dashboard'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-primary/80 hover:bg-primary/5'
                }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className={`material-symbols-outlined text-xl ${item.color}`}>
                {item.icon}
              </span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Settings & Logout */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-primary/80 hover:bg-primary/5 transition-all"
            title={!sidebarOpen ? 'Toggle Dark Mode' : ''}
          >
            <span className="material-symbols-outlined text-xl">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
            {sidebarOpen && <span className="text-sm">Dark Mode</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            {sidebarOpen && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>

        {/* Toggle Sidebar Button */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
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

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            {/* Left: Menu Toggle + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
              >
                <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">
                  menu
                </span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  University Attendance System
                </h1>
                <p className="text-sm text-primary/60">Admin Portal</p>
              </div>
            </div>

            {/* Right: Notification + Profile */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 text-xl">
                  notifications
                </span>
                <span className="absolute top-1 right-1 size-2 bg-red-500 rounded-full animate-pulse" />
              </button>

              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 transition-opacity">
                {currentUser?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* ========== SECTION 1: KPI CARDS ========== */}
            <section>
              <h2 className="text-lg font-bold text-primary mb-6">
                System Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Students */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-primary/70 font-medium mb-2">
                        Total Students
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {stats.totalStudents}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
                        group
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    ↑ 12% from last month
                  </p>
                </div>

                {/* Total Delegates */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-primary/70 font-medium mb-2">
                        Total Delegates
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {stats.totalDelegates}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">
                        people
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    Active delegates
                  </p>
                </div>

                {/* Total Classes */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-primary/70 font-medium mb-2">
                        Classes & Courses
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {stats.totalClasses}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">
                        school
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    Registered courses
                  </p>
                </div>

                {/* Sessions Today */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-primary/70 font-medium mb-2">
                        Sessions Today
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {stats.sessionsToday}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">
                        event_note
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    Active sessions
                  </p>
                </div>
              </div>
            </section>

            {/* ========== SECTION 2: ATTENDANCE OVERVIEW ========== */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-primary">
                  Course Attendance Overview
                </h2>
                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">download</span>
                  Export Report
                </button>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                {courseAttendance.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">
                        {item.course}
                      </p>
                    </div>
                    <div className="flex-1 max-w-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-primary/70">
                          {item.attendance}%
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${item.status === 'excellent'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : item.status === 'average'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}
                        >
                          {item.status === 'excellent'
                            ? 'Excellent'
                            : item.status === 'average'
                              ? 'Average'
                              : 'Poor'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.status === 'excellent'
                            ? 'bg-green-500'
                            : item.status === 'average'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                            }`}
                          style={{ width: `${item.attendance}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ========== SECTION 3: RECENT SESSIONS ========== */}
            <section>
              <h2 className="text-lg font-bold text-primary mb-6">
                Recent Attendance Sessions
              </h2>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <th className="px-6 py-4 text-left font-semibold text-primary">
                          Session ID
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-primary">
                          Class Name
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-primary">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-primary">
                          Time
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-primary">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-primary">
                          Attendance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {recentSessions.map((session) => (
                        <tr
                          key={session.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 font-mono text-xs text-primary dark:text-primary/80">
                            {session.sessionId}
                          </td>
                          <td className="px-6 py-4 text-primary font-medium">
                            {session.className}
                          </td>
                          <td className="px-6 py-4 text-primary/70">
                            {session.date}
                          </td>
                          <td className="px-6 py-4 text-primary/70">
                            {session.time}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full ${session.status === 'Open'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                                }`}
                            >
                              {session.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-primary font-semibold">
                                {session.attendancePercent}%
                              </span>
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${session.attendancePercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ========== SECTION 4: QUICK ACTIONS ========== */}
            <section className="pb-8">
              <h2 className="text-lg font-bold text-primary mb-6">
                Quick Actions
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: 'person_add',
                    title: 'Enroll Student',
                    description: 'Add new student to system',
                    action: () => navigate('/admin/students'),
                  },
                  {
                    icon: 'event_note',
                    title: 'Create Session',
                    description: 'Start attendance session',
                    action: () => navigate('/admin/sessions'),
                  },
                  {
                    icon: 'upload_file',
                    title: 'Import CSV',
                    description: 'Bulk import students',
                    action: () => navigate('/admin/import'),
                  },
                  {
                    icon: 'class',
                    title: 'Add Class',
                    description: 'Create new class/course',
                    action: () => navigate('/admin/classes'),
                  },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.action}
                    className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-lg mb-4 w-fit group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        {action.icon}
                      </span>
                    </div>
                    <p className="font-semibold text-primary mb-1">
                      {action.title}
                    </p>
                    <p className="text-sm text-primary/70">
                      {action.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
