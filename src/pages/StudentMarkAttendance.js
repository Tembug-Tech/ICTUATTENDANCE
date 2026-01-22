import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

const StudentMarkAttendance = () => {
  const { currentUser, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [submittedAttendance, setSubmittedAttendance] = useState({});
  const [marking, setMarking] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (loading) return;

    if (!currentUser || userRole !== 'student') {
      navigate('/student');
      return;
    }

    fetchActiveSessions();

    // Refresh sessions every 10 seconds
    const interval = setInterval(fetchActiveSessions, 10000);
    return () => clearInterval(interval);
  }, [currentUser, userRole, loading, navigate]);

  const fetchActiveSessions = async () => {
    try {
      setSessionsLoading(true);
      setError(null);

      // Get ALL sessions (not filtered by class) - we'll filter by active status
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          token,
          created_at,
          expires_at,
          start_time,
          end_time,
          session_date,
          class_id,
          classes (
            class_name,
            courses (
              course_code,
              course_title
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Filter for ONLY truly active sessions (between start and end time in Cameroon timezone)
      const now = new Date();
      const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

      const activeSessionsFiltered = (sessions || []).filter(session => {
        if (!session.session_date || !session.start_time || !session.end_time) return false;

        const [startHour, startMin] = session.start_time.split(':').map(Number);
        const [endHour, endMin] = session.end_time.split(':').map(Number);

        // Convert session times to UTC
        const startDateTimeUTC = new Date(session.session_date);
        startDateTimeUTC.setHours(startHour, startMin, 0, 0);
        startDateTimeUTC.setTime(startDateTimeUTC.getTime() - (1 * 60 * 60 * 1000)); // Cameroon to UTC

        const endDateTimeUTC = new Date(session.session_date);
        endDateTimeUTC.setHours(endHour, endMin, 0, 0);
        endDateTimeUTC.setTime(endDateTimeUTC.getTime() - (1 * 60 * 60 * 1000)); // Cameroon to UTC

        // Session is ACTIVE only when current time is between start (inclusive) and end (exclusive)
        return nowUTC >= startDateTimeUTC && nowUTC < endDateTimeUTC;
      });

      setActiveSessions(activeSessionsFiltered);

      // Check which sessions the student has already submitted for
      if (currentUser?.id && activeSessionsFiltered && activeSessionsFiltered.length > 0) {
        const { data: submissions, error: submissionsError } = await supabase
          .from('attendance')
          .select('session_id, status')
          .eq('student_id', currentUser.id)
          .in('session_id', activeSessionsFiltered.map(s => s.id));

        if (!submissionsError && submissions) {
          const submitted = {};
          submissions.forEach(sub => {
            submitted[sub.session_id] = sub.status;
          });
          setSubmittedAttendance(submitted);
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.message);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Helper function to parse time strings (HH:MM) into minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to check if two sessions overlap
  const sessionsOverlap = (session1, session2) => {
    if (!session1 || !session2 || !session1.session_date || !session2.session_date) return false;

    // Sessions must be on the same date to overlap
    if (session1.session_date !== session2.session_date) return false;

    const start1 = timeToMinutes(session1.start_time);
    const end1 = timeToMinutes(session1.end_time);
    const start2 = timeToMinutes(session2.start_time);
    const end2 = timeToMinutes(session2.end_time);

    // Check if time windows overlap
    // Overlap occurs if: start1 < end2 AND start2 < end1
    return start1 < end2 && start2 < end1;
  };

  // Get list of sessions the student has already marked attendance for
  const getMarkedSessions = () => {
    return activeSessions.filter(session => submittedAttendance[session.id]);
  };

  // Check if a session conflicts with already-marked sessions
  const getConflictingSession = (sessionId) => {
    const targetSession = activeSessions.find(s => s.id === sessionId);
    if (!targetSession) return null;

    const markedSessions = getMarkedSessions();
    for (let markedSession of markedSessions) {
      if (sessionsOverlap(targetSession, markedSession)) {
        return markedSession;
      }
    }
    return null;
  };

  const determineAttendanceStatus = (session) => {
    // Safety check
    if (!session || !session.end_time) {
      console.warn('⚠️ Session or end_time is missing:', session);
      return 'present'; // Default to present if data is missing
    }

    // Get the session date and end time
    const [endHour, endMin] = session.end_time.split(':');

    // Build end time for today
    const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
    const endTimeStr = `${sessionDate}T${session.end_time}:00`;
    const sessionEndTime = new Date(endTimeStr);

    const now = new Date();

    // If current time is AFTER session end time, mark as LATE
    // Otherwise, mark as PRESENT
    return now > sessionEndTime ? 'late' : 'present';
  };

  const handleMarkAttendance = async (sessionId) => {
    try {
      setMarking(prev => ({ ...prev, [sessionId]: true }));
      setError(null);
      setSuccess(null);

      // Check if already submitted
      if (submittedAttendance[sessionId]) {
        setError(`You have already marked attendance for this session`);
        setMarking(prev => ({ ...prev, [sessionId]: false }));
        return;
      }

      // Check for conflicting sessions
      const conflictingSession = getConflictingSession(sessionId);
      if (conflictingSession) {
        setError(`⚠️ Time Conflict: You've already marked attendance for ${conflictingSession.classes?.courses?.course_code || 'another course'} (${conflictingSession.start_time}-${conflictingSession.end_time}). Sessions cannot overlap.`);
        setMarking(prev => ({ ...prev, [sessionId]: false }));
        return;
      }

      // Find the session to determine status
      const session = activeSessions.find(s => s.id === sessionId);
      if (!session) {
        setError('Session not found');
        setMarking(prev => ({ ...prev, [sessionId]: false }));
        return;
      }

      const status = determineAttendanceStatus(session);

      // Insert attendance record
      const { error: insertError } = await supabase
        .from('attendance')
        .insert([
          {
            session_id: sessionId,
            student_id: currentUser.id,
            status: status,
            timestamp: new Date().toISOString(),
          }
        ]);

      if (insertError) throw insertError;

      // Update local state
      setSubmittedAttendance(prev => ({
        ...prev,
        [sessionId]: status
      }));

      // Show success message
      setSuccess(`✅ Attendance marked as ${status.toUpperCase()}`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError(`❌ Error: ${err.message}`);
    } finally {
      setMarking(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  if (loading) {
    return (
      <Layout role="student">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ animation: 'spin 1s linear infinite', fontSize: '32px', marginBottom: '15px' }}>⏳</div>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading attendance sessions...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentUser || userRole !== 'student') return null;

  return (
    <Layout role="student">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
            📝 Mark Attendance
          </h1>
          <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
            Track and submit your attendance for active sessions
          </p>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {/* Loading State */}
        {sessionsLoading ? (
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>⏳</div>
              <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
                Fetching your active attendance sessions...
              </p>
            </div>
          </Card>
        ) : activeSessions.length === 0 ? (
          // No Sessions State
          <>
            <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
              <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
                  No Active Sessions Yet
                </h2>
                <p style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#6b7280', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  There are currently no active attendance sessions for your enrolled courses. Check back soon!
                </p>
                <button
                  onClick={fetchActiveSessions}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                >
                  🔄 Refresh
                </button>
              </div>
            </Card>

            {/* Status Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Attendance Status</p>
                  <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>0 Sessions</p>
                </div>
              </Card>
              <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Attendance Rate</p>
                  <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>-- %</p>
                </div>
              </Card>
              <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏰</div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>Last Updated</p>
                  <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>Just Now</p>
                </div>
              </Card>
            </div>
          </>
        ) : (
          // Active Sessions
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>
                Active Sessions ({activeSessions.length})
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {activeSessions.map(session => {
                const isSubmitted = submittedAttendance[session.id];
                const isMarking = marking[session.id];
                const status = determineAttendanceStatus(session);
                const startTime = new Date(session.created_at);
                const expireTime = new Date(session.expires_at);
                const now = new Date();
                const timeRemaining = Math.max(0, Math.floor((expireTime - now) / 1000 / 60));

                // Check for conflicts
                const conflictingSession = getConflictingSession(session.id);
                const hasConflict = !isSubmitted && conflictingSession;

                return (
                  <Card
                    key={session.id}
                    style={{
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      borderLeft: `4px solid ${isSubmitted ? '#10b981' : hasConflict ? '#f59e0b' : '#3b82f6'}`,
                      borderRadius: '8px',
                      opacity: hasConflict ? 0.7 : 1
                    }}
                  >
                    <div style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                            📚 {session.classes?.courses?.course_code || 'UNKNOWN'} - {session.classes?.courses?.title || session.classes?.class_name || 'Unknown'}
                          </h3>
                          <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
                            Session: {session.token.substring(0, 12)}... | Start: {session.start_time || 'N/A'} | End: {session.end_time || 'N/A'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {isSubmitted && (
                            <div style={{
                              padding: '6px 12px',
                              backgroundColor: isSubmitted === 'present' ? '#d1fae5' : '#fef3c7',
                              color: isSubmitted === 'present' ? '#065f46' : '#92400e',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              display: 'inline-block'
                            }}>
                              {isSubmitted === 'present' ? '✅ Present' : '⏱️ Late'}
                            </div>
                          )}
                          {!isSubmitted && hasConflict && (
                            <div style={{
                              padding: '6px 12px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              display: 'inline-block'
                            }}>
                              ⚠️ Conflict
                            </div>
                          )}
                          {!isSubmitted && !hasConflict && (
                            <div style={{
                              padding: '6px 12px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              display: 'inline-block'
                            }}>
                              ⏳ Active
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Session Details Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '16px',
                        marginBottom: '20px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px'
                      }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Started</p>
                          <p style={{ margin: '0', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                            {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Expires In</p>
                          <p style={{ margin: '0', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                            {timeRemaining}m remaining
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Status</p>
                          <p style={{ margin: '0', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                            {!isSubmitted ? `Will mark as ${status.toUpperCase()}` : `Marked as ${isSubmitted.toUpperCase()}`}
                          </p>
                        </div>
                      </div>

                      {/* Conflict Warning Box */}
                      {hasConflict && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#fef3c7',
                          borderRadius: '6px',
                          marginBottom: '16px',
                          borderLeft: '3px solid #f59e0b'
                        }}>
                          <p style={{ margin: '0', fontSize: '13px', color: '#92400e' }}>
                            <strong>⚠️ Time Conflict:</strong> You've already marked attendance for {conflictingSession.classes?.courses?.course_code} ({conflictingSession.start_time}-{conflictingSession.end_time}). These sessions overlap. You can only mark one overlapping session.
                          </p>
                        </div>
                      )}

                      {/* Info Box */}
                      {!isSubmitted && !hasConflict && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#eff6ff',
                          borderRadius: '6px',
                          marginBottom: '16px',
                          borderLeft: '3px solid #3b82f6'
                        }}>
                          <p style={{ margin: '0', fontSize: '13px', color: '#1e40af' }}>
                            <strong>⚠️ Note:</strong> You can mark attendance only ONCE per session. You will be marked as {status.toUpperCase()} based on the current time. Submit before session ends!
                          </p>
                        </div>
                      )}

                      {/* Already Submitted Info Box */}
                      {isSubmitted && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#d1fae5',
                          borderRadius: '6px',
                          marginBottom: '16px',
                          borderLeft: '3px solid #10b981'
                        }}>
                          <p style={{ margin: '0', fontSize: '13px', color: '#065f46' }}>
                            <strong>✅ Already Marked:</strong> You submitted attendance as {isSubmitted.toUpperCase()}. You cannot mark again for this session.
                          </p>
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => handleMarkAttendance(session.id)}
                        disabled={isSubmitted || isMarking || hasConflict}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: isSubmitted || hasConflict ? '#d1d5db' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: isSubmitted || isMarking || hasConflict ? 'not-allowed' : 'pointer',
                          opacity: isSubmitted || isMarking || hasConflict ? 0.6 : 1,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubmitted && !isMarking && !hasConflict) {
                            e.target.style.backgroundColor = '#2563eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubmitted && !isMarking && !hasConflict) {
                            e.target.style.backgroundColor = '#3b82f6';
                          }
                        }}
                        title={hasConflict ? 'Disabled due to time conflict with another marked session' : ''}
                      >
                        {isMarking ? '⏳ Submitting...' : isSubmitted ? `✓ MARKED ALREADY (${isSubmitted.toUpperCase()})` : hasConflict ? `⛔ BLOCKED (Time Conflict)` : `✅ Mark ${status.toUpperCase()}`}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '32px' }}>
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
              📋 How Attendance Works
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {[
                {
                  step: '1',
                  title: 'Instructor Starts Session',
                  desc: 'Your instructor creates an attendance session in their dashboard',
                  icon: '👨‍🏫'
                },
                {
                  step: '2',
                  title: 'Session Appears Here',
                  desc: 'Active sessions automatically show on this page in real-time',
                  icon: '🔄'
                },
                {
                  step: '3',
                  title: 'Submit Attendance',
                  desc: 'Click the "Mark" button to submit your attendance',
                  icon: '👆'
                },
                {
                  step: '4',
                  title: 'Automatic Status',
                  desc: 'PRESENT if within 15 min, otherwise LATE',
                  icon: '⏱️'
                },
                {
                  step: '5',
                  title: 'Immutable Record',
                  desc: 'Once submitted, your attendance record cannot be changed',
                  icon: '🔒'
                },
                {
                  step: '6',
                  title: 'Check Your History',
                  desc: 'View all your attendance records in your history page',
                  icon: '📊'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '14px'
                    }}>
                      {item.step}
                    </div>
                    <div style={{ fontSize: '20px' }}>{item.icon}</div>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default StudentMarkAttendance;
