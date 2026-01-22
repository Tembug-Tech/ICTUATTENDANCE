import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Card from '../components/Card';

const StudentAttendanceHistory = () => {
  const { currentUser, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0
  });

  useEffect(() => {
    if (loading) return;

    if (!currentUser || userRole !== 'student') {
      navigate('/student');
      return;
    }

    fetchAttendanceHistory();
  }, [currentUser, userRole, loading, navigate]);

  const fetchAttendanceHistory = async () => {
    try {
      setLoadingData(true);

      // Get attendance records for this student
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select(`
          id,
          created_at,
          sessions (
            id,
            session_date,
            start_time,
            classes (
              class_name,
              courses (
                course_code,
                course_title
              )
            )
          )
        `)
        .eq('student_id', currentUser.id)
        .order('created_at', { ascending: false });

      // Format data for display
      const history = (attendanceRecords || []).map(record => ({
        id: record.id,
        class: record.sessions?.classes?.courses?.course_code || 'Unknown',
        courseName: record.sessions?.classes?.courses?.course_title || 'Unknown Course',
        date: new Date(record.sessions?.session_date).toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        dateObj: new Date(record.sessions?.session_date),
        time: record.sessions?.start_time || 'N/A',
        markedAt: new Date(record.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'present'
      }));

      setAttendanceData(history);

      // Calculate stats
      setStats({
        total: history.length,
        present: history.length,
        late: 0,
        absent: 0
      });
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      setAttendanceData([]);
      setStats({ total: 0, present: 0, late: 0, absent: 0 });
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return '#10b981';
      case 'late': return '#f59e0b';
      case 'absent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusEmoji = (status) => {
    switch(status) {
      case 'present': return '✅';
      case 'late': return '⏱️';
      case 'absent': return '❌';
      default: return '❓';
    }
  };

  const filteredData = filterStatus === 'all' 
    ? attendanceData 
    : attendanceData.filter(item => item.status === filterStatus);

  const attendanceRate = stats.total > 0 
    ? Math.round((stats.present / stats.total) * 100) 
    : 0;

  if (loading || loadingData) {
    return (
      <Layout role="student">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ animation: 'spin 1s linear infinite', fontSize: '32px', marginBottom: '15px' }}>⏳</div>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading attendance history...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentUser || userRole !== 'student') return null;

  return (
    <Layout role="student">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
            📋 Attendance History
          </h1>
          <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
            Track and review your attendance records
          </p>
        </div>

        {/* Main Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {/* Total Sessions */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #3b82f6' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                Total Sessions
              </div>
              <div style={{ fontSize: '40px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
                {stats.total}
              </div>
              <div style={{
                padding: '6px 12px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                📊 Sessions Attended
              </div>
            </div>
          </Card>

          {/* Present */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #10b981' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                Present
              </div>
              <div style={{ fontSize: '40px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                {stats.present}
              </div>
              <div style={{
                padding: '6px 12px',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                ✅ On Time
              </div>
            </div>
          </Card>

          {/* Late */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #f59e0b' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                Late
              </div>
              <div style={{ fontSize: '40px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                {stats.late}
              </div>
              <div style={{
                padding: '6px 12px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                ⏱️ After 15 min
              </div>
            </div>
          </Card>

          {/* Absent */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #ef4444' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                Absent
              </div>
              <div style={{ fontSize: '40px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                {stats.absent}
              </div>
              <div style={{
                padding: '6px 12px',
                backgroundColor: '#fee2e2',
                color: '#7f1d1d',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                ❌ Not Marked
              </div>
            </div>
          </Card>
        </div>

        {/* Attendance Rate Progress */}
        {stats.total > 0 && (
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                  Attendance Rate
                </h3>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: attendanceRate >= 75 ? '#10b981' : '#f59e0b'
                }}>
                  {attendanceRate}%
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{
                height: '12px',
                backgroundColor: '#e5e7eb',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${attendanceRate}%`,
                  backgroundColor: attendanceRate >= 75 ? '#10b981' : '#f59e0b',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: attendanceRate >= 75 ? '#f0fdf4' : '#fffbeb',
                borderRadius: '6px',
                borderLeft: `3px solid ${attendanceRate >= 75 ? '#10b981' : '#f59e0b'}`
              }}>
                <p style={{
                  margin: '0',
                  fontSize: '13px',
                  color: attendanceRate >= 75 ? '#065f46' : '#92400e',
                  fontWeight: '600'
                }}>
                  {attendanceRate >= 75 
                    ? '✅ Great! You meet the attendance requirement (75%+)' 
                    : '⚠️ Attention: Your attendance is below 75%. Improve to meet requirements.'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Attendance Records */}
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                📋 Detailed History
              </h2>

              {/* Filter Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'All', value: 'all', color: '#3b82f6' },
                  { label: 'Present', value: 'present', color: '#10b981' },
                  { label: 'Late', value: 'late', color: '#f59e0b' },
                  { label: 'Absent', value: 'absent', color: '#ef4444' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setFilterStatus(filter.value)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: filterStatus === filter.value ? filter.color : '#f3f4f6',
                      color: filterStatus === filter.value ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (filterStatus !== filter.value) {
                        e.target.style.backgroundColor = '#e5e7eb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterStatus !== filter.value) {
                        e.target.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Records List */}
            {filteredData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredData.map((record, index) => (
                  <div
                    key={record.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${getStatusColor(record.status)}`,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                      {/* Left Content */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                          {record.courseName}
                        </h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
                          📚 {record.class}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                          <span>📅 {record.date}</span>
                          <span>⏰ {record.time}</span>
                          <span>✓ {record.markedAt}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div style={{
                        padding: '8px 16px',
                        backgroundColor: `${getStatusColor(record.status)}20`,
                        color: getStatusColor(record.status),
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}>
                        {getStatusEmoji(record.status)} {record.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
                  {filterStatus === 'all' 
                    ? 'No attendance history available' 
                    : `No ${filterStatus} records found`}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Attendance Guidelines */}
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' }}>
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
              📚 Attendance Guidelines
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>✅</div>
                <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#065f46' }}>Present</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#047857' }}>Marked within 15 minutes of session start</p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>⏱️</div>
                <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#92400e' }}>Late</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#b45309' }}>Marked after 15 minutes of session start</p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>❌</div>
                <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#7f1d1d' }}>Absent</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#991b1b' }}>Did not mark attendance for session</p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>📊</div>
                <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#1e40af' }}>75% Minimum</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#1e3a8a' }}>Required for eligibility to take exam</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default StudentAttendanceHistory;
