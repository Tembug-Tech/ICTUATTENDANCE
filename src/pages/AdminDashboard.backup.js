import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Alert from '../components/Alert';

const AdminDashboard = () => {
  const { currentUser, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // State for stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalDelegates: 0,
    totalCourses: 0,
    totalSessions: 0,
  });
  
  // State for user management
  const [students, setStudents] = useState([]);
  const [delegates, setDelegates] = useState([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddDelegate, setShowAddDelegate] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    matricule: '',
    email: '',
    password: ''
  });
  const [newDelegate, setNewDelegate] = useState({
    name: '',
    matricule: '',
    email: '',
    password: ''
  });
  
  // State for course management
  const [courses, setCourses] = useState([]);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    course_code: '',
    course_title: '',
    program: '',
    year_level: ''
  });
  
  // State for attendance reports
  const [attendanceReports, setAttendanceReports] = useState([]);
  const [filterByStudent, setFilterByStudent] = useState('');
  const [filterByCourse, setFilterByCourse] = useState('');
  
  const [loadingData, setLoadingData] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (loading) return;

    if (!currentUser || userRole !== 'admin') {
      navigate('/admin');
      return;
    }

    fetchData();
  }, [currentUser, userRole, loading, navigate]);

  const fetchData = async () => {
    try {
      setLoadingData(true);

      // Fetch stats
      const [studentsRes, delegatesRes, coursesRes, sessionsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'delegate'),
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('sessions').select('id', { count: 'exact' }),
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalDelegates: delegatesRes.count || 0,
        totalCourses: coursesRes.count || 0,
        totalSessions: sessionsRes.count || 0,
      });

      // Fetch students
      const { data: studentsData } = await supabase
        .from('users')
        .select('id, name, matricule, email, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      setStudents(studentsData || []);

      // Fetch delegates
      const { data: delegatesData } = await supabase
        .from('users')
        .select('id, name, matricule, email, created_at')
        .eq('role', 'delegate')
        .order('created_at', { ascending: false });

      setDelegates(delegatesData || []);

      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('course_code', { ascending: true });

      setCourses(coursesData || []);

      // Fetch attendance reports
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          created_at,
          users (
            name,
            matricule
          ),
          sessions (
            session_date,
            classes (
              courses (
                course_code,
                course_title
              )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      setAttendanceReports(attendanceData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.matricule || !newStudent.email || !newStudent.password) {
      setError('Please fill in all fields');
      return;
    }

    if (newStudent.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setAddingUser(true);
      setError(null);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStudent.email,
        password: newStudent.password,
      });

      if (authError) throw authError;

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: newStudent.name,
          matricule: newStudent.matricule,
          email: newStudent.email,
          role: 'student'
        });

      if (userError) throw userError;

      setSuccess('✅ Student added successfully!');
      setShowAddStudent(false);
      setNewStudent({ name: '', matricule: '', email: '', password: '' });
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding student:', err);
      setError(`❌ Error: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  const handleAddDelegate = async () => {
    if (!newDelegate.name || !newDelegate.matricule || !newDelegate.email || !newDelegate.password) {
      setError('Please fill in all fields');
      return;
    }

    if (newDelegate.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setAddingUser(true);
      setError(null);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDelegate.email,
        password: newDelegate.password,
      });

      if (authError) throw authError;

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: newDelegate.name,
          matricule: newDelegate.matricule,
          email: newDelegate.email,
          role: 'delegate'
        });

      if (userError) throw userError;

      setSuccess('✅ Delegate added successfully!');
      setShowAddDelegate(false);
      setNewDelegate({ name: '', matricule: '', email: '', password: '' });
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding delegate:', err);
      setError(`❌ Error: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.course_code || !newCourse.course_title || !newCourse.program) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setAddingCourse(true);
      setError(null);

      const { error } = await supabase
        .from('courses')
        .insert({
          course_code: newCourse.course_code,
          course_title: newCourse.course_title,
          program: newCourse.program,
          year_level: newCourse.year_level || ''
        });

      if (error) throw error;

      setSuccess('✅ Course added successfully!');
      setShowAddCourse(false);
      setNewCourse({ course_code: '', course_title: '', program: '', year_level: '' });
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding course:', err);
      setError(`❌ Error: ${err.message}`);
    } finally {
      setAddingCourse(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      setSuccess('✅ Student deleted successfully!');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting student:', err);
      setError(`❌ Error: ${err.message}`);
    }
  };

  const handleDeleteDelegate = async (delegateId) => {
    if (!window.confirm('Are you sure you want to delete this delegate?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', delegateId);

      if (error) throw error;

      setSuccess('✅ Delegate deleted successfully!');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting delegate:', err);
      setError(`❌ Error: ${err.message}`);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      setSuccess('✅ Course deleted successfully!');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting course:', err);
      setError(`❌ Error: ${err.message}`);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout role="admin">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ animation: 'spin 1s linear infinite', fontSize: '32px', marginBottom: '15px' }}>⏳</div>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading dashboard...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentUser || userRole !== 'admin') {
    return null;
  }

  return (
    <Layout role="admin">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
            👑 Admin Dashboard
          </h1>
          <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
            System management and attendance overview
          </p>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {/* Statistics Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {/* Total Students */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #3b82f6' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                    Total Students
                  </p>
                  <p style={{ margin: '0', fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
                    {stats.totalStudents}
                  </p>
                </div>
                <div style={{ fontSize: '32px' }}>👥</div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Active in system
              </p>
            </div>
          </Card>

          {/* Total Delegates */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #10b981' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                    Total Instructors
                  </p>
                  <p style={{ margin: '0', fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                    {stats.totalDelegates}
                  </p>
                </div>
                <div style={{ fontSize: '32px' }}>🧑‍🏫</div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Teaching staff
              </p>
            </div>
          </Card>

          {/* Total Courses */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #f59e0b' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                    Total Courses
                  </p>
                  <p style={{ margin: '0', fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
                    {stats.totalCourses}
                  </p>
                </div>
                <div style={{ fontSize: '32px' }}>📚</div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Available courses
              </p>
            </div>
          </Card>

          {/* Total Sessions */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #8b5cf6' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                    Total Sessions
                  </p>
                  <p style={{ margin: '0', fontSize: '32px', fontWeight: '700', color: '#8b5cf6' }}>
                    {stats.totalSessions}
                  </p>
                </div>
                <div style={{ fontSize: '32px' }}>📋</div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Conducted sessions
              </p>
            </div>
          </Card>
        </div>

        {/* User Management Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Add Student Card */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                ➕ Add New Student
              </h2>

              <button
                onClick={() => setShowAddStudent(!showAddStudent)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: showAddStudent ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = showAddStudent ? '#dc2626' : '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = showAddStudent ? '#ef4444' : '#3b82f6'}
              >
                {showAddStudent ? '✕ Cancel' : '+ Add Student'}
              </button>

              {showAddStudent && (
                <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Matricule *
                    </label>
                    <input
                      type="text"
                      value={newStudent.matricule}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, matricule: e.target.value }))}
                      placeholder="Enter matricule"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="student@ictuniversity.edu.cm"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Password (min 8 chars) *
                    </label>
                    <input
                      type="password"
                      value={newStudent.password}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    onClick={handleAddStudent}
                    disabled={addingUser}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: addingUser ? '#d1d5db' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: addingUser ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {addingUser ? '⏳ Adding...' : '✅ Add Student'}
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Add Delegate Card */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                ➕ Add New Instructor
              </h2>

              <button
                onClick={() => setShowAddDelegate(!showAddDelegate)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: showAddDelegate ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = showAddDelegate ? '#dc2626' : '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = showAddDelegate ? '#ef4444' : '#10b981'}
              >
                {showAddDelegate ? '✕ Cancel' : '+ Add Instructor'}
              </button>

              {showAddDelegate && (
                <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newDelegate.name}
                      onChange={(e) => setNewDelegate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Matricule *
                    </label>
                    <input
                      type="text"
                      value={newDelegate.matricule}
                      onChange={(e) => setNewDelegate(prev => ({ ...prev, matricule: e.target.value }))}
                      placeholder="Enter matricule"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newDelegate.email}
                      onChange={(e) => setNewDelegate(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="delegate@ictuniversity.edu.cm"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Password (min 8 chars) *
                    </label>
                    <input
                      type="password"
                      value={newDelegate.password}
                      onChange={(e) => setNewDelegate(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    onClick={handleAddDelegate}
                    disabled={addingUser}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: addingUser ? '#d1d5db' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: addingUser ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {addingUser ? '⏳ Adding...' : '✅ Add Instructor'}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Course Management */}
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                📚 Course Management
              </h2>
              <button
                onClick={() => setShowAddCourse(!showAddCourse)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: showAddCourse ? '#ef4444' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {showAddCourse ? '✕ Cancel' : '+ Add Course'}
              </button>
            </div>

            {showAddCourse && (
              <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', borderLeft: '3px solid #f59e0b', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Course Code *
                    </label>
                    <input
                      type="text"
                      value={newCourse.course_code}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, course_code: e.target.value }))}
                      placeholder="e.g., ICT101"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                      Year Level
                    </label>
                    <input
                      type="text"
                      value={newCourse.year_level}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, year_level: e.target.value }))}
                      placeholder="e.g., Year 1"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={newCourse.course_title}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, course_title: e.target.value }))}
                    placeholder="Enter course title"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#1f2937', marginBottom: '6px', fontWeight: '600' }}>
                    Program *
                  </label>
                  <input
                    type="text"
                    value={newCourse.program}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, program: e.target.value }))}
                    placeholder="e.g., BSc. Computer Science"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  onClick={handleAddCourse}
                  disabled={addingCourse}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: addingCourse ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: addingCourse ? 'not-allowed' : 'pointer'
                  }}
                >
                  {addingCourse ? '⏳ Adding...' : '✅ Add Course'}
                </button>
              </div>
            )}

            {/* Courses Table */}
            {courses.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#6b7280',
                        fontSize: '12px',
                        textTransform: 'uppercase'
                      }}>
                        Code
                      </th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#6b7280',
                        fontSize: '12px',
                        textTransform: 'uppercase'
                      }}>
                        Title
                      </th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#6b7280',
                        fontSize: '12px',
                        textTransform: 'uppercase'
                      }}>
                        Program
                      </th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#6b7280',
                        fontSize: '12px',
                        textTransform: 'uppercase'
                      }}>
                        Year
                      </th>
                      <th style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#6b7280',
                        fontSize: '12px',
                        textTransform: 'uppercase'
                      }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.slice(0, 20).map((course) => (
                      <tr
                        key={course.id}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: '600', fontFamily: 'monospace' }}>
                          {course.course_code}
                        </td>
                        <td style={{ padding: '12px', color: '#1f2937' }}>
                          {course.course_title}
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>
                          {course.program}
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>
                          {course.year_level || '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {courses.length > 20 && (
                  <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                    Showing 20 of {courses.length} courses (scroll to see more)
                  </p>
                )}
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  No courses added yet
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Student Management */}
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
              👥 Student Management ({students.length})
            </h2>

            {students.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Matricule</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Registered</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #e5e7eb' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: '600' }}>{student.name}</td>
                        <td style={{ padding: '12px', color: '#1f2937', fontFamily: 'monospace' }}>{student.matricule}</td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{student.email}</td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{new Date(student.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button onClick={() => handleDeleteStudent(student.id)} style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  No students registered
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Delegate Management */}
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
              🧑‍🏫 Instructor Management ({delegates.length})
            </h2>

            {delegates.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Matricule</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Registered</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delegates.map((delegate) => (
                      <tr key={delegate.id} style={{ borderBottom: '1px solid #e5e7eb' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: '600' }}>{delegate.name}</td>
                        <td style={{ padding: '12px', color: '#1f2937', fontFamily: 'monospace' }}>{delegate.matricule}</td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{delegate.email}</td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{new Date(delegate.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button onClick={() => handleDeleteDelegate(delegate.id)} style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧑‍🏫</div>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  No instructors assigned
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Attendance Reports */}
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
              📊 Attendance Reports ({attendanceReports.length})
            </h2>

            {attendanceReports.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Student</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Matricule</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Course</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReports.map((record) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: '600' }}>{record.users?.name}</td>
                        <td style={{ padding: '12px', color: '#1f2937', fontFamily: 'monospace' }}>{record.users?.matricule}</td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>{record.sessions?.classes?.courses?.course_code}</td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{record.sessions?.session_date}</td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                  No attendance records yet
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminDashboard;