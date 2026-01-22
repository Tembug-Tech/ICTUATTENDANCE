import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Alert from '../components/Alert';

const StudentDashboard = () => {
  const { currentUser, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // Active session state
  const [activeSession, setActiveSession] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Attendance summary
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalAttended: 0,
    totalSessions: 0,
    percentage: 0
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  
  // Course attendance
  const [courseAttendance, setCourseAttendance] = useState([]);
  const [courseLoading, setCourseLoading] = useState(true);
  
  // UI state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Protect route - only allow students
  useEffect(() => {
    if (loading) return;

    if (!currentUser || userRole !== 'student') {
      navigate('/student');
      return;
    }

    fetchActiveSession();
    fetchAttendanceSummary();
    fetchCourseAttendance();
  }, [currentUser, userRole, loading, navigate]);

  // Timer for session countdown
  useEffect(() => {
    if (!activeSession) return;

    const timer = setInterval(() => {
      const now = new Date();
      const [endHour, endMin] = activeSession.end_time.split(':');
      
      const sessionDate = new Date(activeSession.session_date);
      const endTime = new Date(sessionDate);
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0);
      
      const diffMs = endTime - now;
      
      if (diffMs <= 0) {
        setTimeRemaining(null);
        setActiveSession(null);
        clearInterval(timer);
      } else {
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        setTimeRemaining(`${minutes} min ${seconds} sec remaining`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const fetchActiveSession = async () => {
    try {
      setSessionsLoading(true);
      const now = new Date();

      // Get the next/currently active session
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          start_time,
          end_time,
          classes (
            id,
            class_name,
            delegate_id,
            users!delegate_id (
              name
            ),
            courses (
              course_code,
              course_title
            )
          )
        `)
        .order('start_time', { ascending: false });

      if (error) throw error;
      
      // Find the first active session (current or upcoming)
      const active = (data || []).find(session => {
        if (!session.session_date || !session.end_time) return false;
        
        const sessionDate = new Date(session.session_date);
        const [startHour, startMin] = session.start_time.split(':');
        const [endHour, endMin] = session.end_time.split(':');
        
        const sessionStart = new Date(sessionDate);
        sessionStart.setHours(parseInt(startHour), parseInt(startMin), 0);
        
        const sessionEnd = new Date(sessionDate);
        sessionEnd.setHours(parseInt(endHour), parseInt(endMin), 0);
        
        // Show if currently happening
        return now >= sessionStart && now <= sessionEnd;
      });
      
      setActiveSession(active || null);
    } catch (err) {
      console.error('Error fetching active session:', err);
      setActiveSession(null);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      setSummaryLoading(true);

      // Get attendance records
      const { data: records } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', currentUser.id);

      // Get all sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id');

      const totalAttended = (records || []).length;
      const totalSessions = (sessions || []).length;
      const percentage = totalSessions > 0 
        ? Math.round((totalAttended / totalSessions) * 100) 
        : 0;

      setAttendanceSummary({
        totalAttended,
        totalSessions,
        percentage
      });
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchCourseAttendance = async () => {
    try {
      setCourseLoading(true);

      const { data: records } = await supabase
        .from('attendance')
        .select(`
          id,
          sessions (
            classes (
              courses (
                id,
                course_code,
                course_title
              )
            )
          )
        `)
        .eq('student_id', currentUser.id);

      // Group by course and count
      const courseMap = {};
      (records || []).forEach(record => {
        const course = record.sessions?.classes?.courses;
        if (course && !courseMap[course.id]) {
          courseMap[course.id] = {
            id: course.id,
            code: course.course_code,
            title: course.course_title,
            attended: 0
          };
        }
        if (course) {
          courseMap[course.id].attended++;
        }
      });

      // Get total sessions per course
      const { data: allSessions } = await supabase
        .from('sessions')
        .select(`
          id,
          classes (
            courses (id)
          )
        `);

      Object.values(courseMap).forEach(course => {
        const total = (allSessions || []).filter(
          s => s.classes?.courses?.id === course.id
        ).length;
        course.total = total || course.attended;
        course.percentage = course.total > 0 
          ? Math.round((course.attended / course.total) * 100)
          : 0;
        course.eligible = course.percentage >= 75;
      });

      setCourseAttendance(Object.values(courseMap));
    } catch (err) {
      console.error('Error fetching course attendance:', err);
    } finally {
      setCourseLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!activeSession) {
      setError('No active session to mark');
      return;
    }

    try {
      setMarking(true);
      setError(null);

      // Validate session time
      const now = new Date();
      const [startHour, startMin] = activeSession.start_time.split(':');
      const [endHour, endMin] = activeSession.end_time.split(':');

      const startTime = new Date();
      startTime.setHours(parseInt(startHour), parseInt(startMin), 0);

      const endTime = new Date();
      endTime.setHours(parseInt(endHour), parseInt(endMin), 59);

      if (now < startTime || now > endTime) {
        setError('Attendance can only be marked during the session time window');
        return;
      }

      // Check for existing attendance
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('session_id', activeSession.id)
        .eq('student_id', currentUser.id)
        .single();

      if (existing) {
        setError('You have already marked attendance for this session');
        return;
      }

      // Insert attendance
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          session_id: activeSession.id,
          student_id: currentUser.id,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setSuccess('Attendance marked successfully');
      setActiveSession(null);
      fetchActiveSession();
      fetchAttendanceSummary();
      fetchCourseAttendance();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError(err.message);
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border border-gray-300 border-t-black mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || userRole !== 'student') {
    return null;
  }

  return (
    <Layout role="student">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              {success}
            </div>
          )}

          {/* PAGE TITLE */}
          <h1 className="text-3xl font-medium text-gray-900 mb-8">Dashboard</h1>

          {/* ===== SECTION 1: MARK ATTENDANCE ===== */}
          <div className="mb-8">
            {sessionsLoading ? (
              <div className="bg-white border border-gray-200 rounded p-8 text-center">
                <p className="text-gray-600">Loading session data...</p>
              </div>
            ) : activeSession ? (
              <div className="bg-white border border-gray-200 rounded shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900">Mark Attendance</h2>
                </div>
                
                <div className="px-6 py-6">
                  {/* Session Information */}
                  <div className="mb-6 space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Course</p>
                      <p className="text-xl text-gray-900 mt-1">
                        {activeSession.classes.courses.course_code} - {activeSession.classes.courses.course_title}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Session Date</p>
                        <p className="text-base text-gray-900 mt-1">{activeSession.session_date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Session Time</p>
                        <p className="text-base text-gray-900 mt-1">
                          {activeSession.start_time} – {activeSession.end_time}
                        </p>
                      </div>
                    </div>

                    {activeSession.classes.users && (
                      <div>
                        <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Instructor</p>
                        <p className="text-base text-gray-900 mt-1">{activeSession.classes.users.name}</p>
                      </div>
                    )}

                    {timeRemaining && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Time Remaining</p>
                        <p className="text-base text-black font-medium mt-1">{timeRemaining}</p>
                      </div>
                    )}
                  </div>

                  {/* Button */}
                  <button
                    onClick={handleMarkAttendance}
                    disabled={marking}
                    className="w-full px-6 py-3 bg-black text-white font-medium rounded hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                  >
                    {marking ? 'Marking...' : 'Mark Attendance'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded shadow-sm p-8 text-center">
                <p className="text-gray-600">There are no active sessions at the moment.</p>
              </div>
            )}
          </div>

          {/* ===== SECTION 2: ATTENDANCE SUMMARY ===== */}
          {!summaryLoading && (
            <div className="mb-8">
              <div className="bg-white border border-gray-200 rounded shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900">Attendance Summary</h2>
                </div>

                <div className="px-6 py-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* Sessions Attended */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Sessions Attended</p>
                      <p className="text-3xl font-medium text-gray-900 mt-2">{attendanceSummary.totalAttended}</p>
                    </div>

                    {/* Total Sessions */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Total Sessions</p>
                      <p className="text-3xl font-medium text-gray-900 mt-2">{attendanceSummary.totalSessions}</p>
                    </div>

                    {/* Percentage */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Attendance Rate</p>
                      <p className="text-3xl font-medium text-gray-900 mt-2">{attendanceSummary.percentage}%</p>
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            attendanceSummary.percentage >= 75 ? 'bg-green-600' : 'bg-amber-600'
                          }`}
                          style={{ width: `${Math.min(attendanceSummary.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== SECTION 3: COURSE ATTENDANCE ===== */}
          {!courseLoading && courseAttendance.length > 0 && (
            <div className="mb-8">
              <div className="bg-white border border-gray-200 rounded shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900">Course Attendance</h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {courseAttendance.map((course) => (
                    <div key={course.id} className="px-6 py-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-base font-medium text-gray-900">
                            {course.code}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{course.title}</p>
                        </div>
                        <span className={`text-sm font-medium ${
                          course.eligible ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {course.eligible ? 'ELIGIBLE' : 'AT RISK'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-600">{course.attended} of {course.total} sessions</p>
                        <p className="text-sm font-medium text-gray-900">{course.percentage}%</p>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            course.eligible ? 'bg-green-600' : 'bg-amber-600'
                          }`}
                          style={{ width: `${Math.min(course.percentage, 100)}%` }}
                        ></div>
                      </div>

                      <button
                        onClick={() => navigate(`/student/history?course=${course.id}`)}
                        className="text-sm text-black font-medium hover:text-gray-700"
                      >
                        View Details →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!courseLoading && courseAttendance.length === 0 && (
            <div className="bg-white border border-gray-200 rounded shadow-sm p-8 text-center">
              <p className="text-gray-600">No attendance records yet.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StudentDashboard;
