import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Card from '../components/Card';

const StudentCourses = () => {
  const { currentUser, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!currentUser || userRole !== 'student') {
      navigate('/student');
      return;
    }

    fetchCourses();
  }, [currentUser, userRole, loading, navigate]);

  const fetchCourses = async () => {
    try {
      setLoadingData(true);

      // Get student's class
      const { data: userData } = await supabase
        .from('users')
        .select('class_id')
        .eq('id', currentUser.id)
        .single();

      if (!userData?.class_id) {
        setCourses([]);
        return;
      }

      // Get class details with delegate
      const { data: classData } = await supabase
        .from('classes')
        .select(`
          id,
          class_name,
          users!classes_delegate_id_fkey (
            name
          )
        `)
        .eq('id', userData.class_id)
        .single();

      if (classData) {
        const course = {
          id: classData.id,
          name: classData.class_name,
          code: classData.class_name.replace(/\s+/g, '').toUpperCase(),
          delegate: classData.users?.name || 'Unknown'
        };
        setCourses([course]);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setCourses([]);
    } finally {
      setLoadingData(false);
    }
  };

  const getColorByIndex = (index) => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    return colors[index % colors.length];
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.delegate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <Layout role="student">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ animation: 'spin 1s linear infinite', fontSize: '32px', marginBottom: '15px' }}>⏳</div>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading your courses...</div>
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
            📚 My Courses
          </h1>
          <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
            View and manage your enrolled courses
          </p>
        </div>

        {courses.length > 0 ? (
          <>
            {/* Search Bar */}
            <div style={{ marginBottom: '28px' }}>
              <input
                type="text"
                placeholder="🔍 Search by course name, code, or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  backgroundColor: '#fff'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Courses Grid */}
            {filteredCourses.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
              }}>
                {filteredCourses.map((course, index) => (
                  <Card
                    key={course.id}
                    style={{
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      borderTop: `4px solid ${getColorByIndex(index)}`,
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '24px' }}>
                      {/* Course Header */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: `${getColorByIndex(index)}15`,
                        borderRadius: '6px',
                        marginBottom: '16px'
                      }}>
                        <p style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#6b7280',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Course Code
                        </p>
                        <p style={{
                          margin: '0',
                          fontSize: '18px',
                          fontWeight: '700',
                          color: getColorByIndex(index),
                          fontFamily: 'monospace'
                        }}>
                          {course.code}
                        </p>
                      </div>

                      {/* Course Name */}
                      <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1f2937',
                        lineHeight: '1.4'
                      }}>
                        {course.name}
                      </h3>

                      {/* Delegate Info */}
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          fontSize: '24px'
                        }}>
                          👨‍🏫
                        </div>
                        <div>
                          <p style={{
                            margin: '0 0 2px 0',
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '600'
                          }}>
                            Instructor
                          </p>
                          <p style={{
                            margin: '0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}>
                            {course.delegate}
                          </p>
                        </div>
                      </div>

                      {/* Course Status Badges */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{
                          padding: '6px 12px',
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ✅ Enrolled
                        </div>
                        <div style={{
                          padding: '6px 12px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          📝 Active
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <p style={{ margin: '0', fontSize: '16px', color: '#6b7280' }}>
                    No courses match your search
                  </p>
                </div>
              </Card>
            )}

            {/* Course Summary Section */}
            <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' }}>
              <div style={{ padding: '24px' }}>
                <h2 style={{
                  margin: '0 0 20px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  📊 Course Overview
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    borderLeft: '3px solid #3b82f6'
                  }}>
                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '12px',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      Total Courses
                    </p>
                    <p style={{
                      margin: '0',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1f2937'
                    }}>
                      {courses.length}
                    </p>
                  </div>

                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    borderLeft: '3px solid #10b981'
                  }}>
                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '12px',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      Active Instructors
                    </p>
                    <p style={{
                      margin: '0',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1f2937'
                    }}>
                      {new Set(courses.map(c => c.delegate)).size}
                    </p>
                  </div>

                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    borderLeft: '3px solid #f59e0b'
                  }}>
                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '12px',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      Enrollment Status
                    </p>
                    <p style={{
                      margin: '0',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1f2937'
                    }}>
                      ✅ Active
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Detailed Table */}
            <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' }}>
              <div style={{ padding: '24px' }}>
                <h2 style={{
                  margin: '0 0 20px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  📋 Course Details
                </h2>

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
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Code
                        </th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#6b7280',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Course Name
                        </th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#6b7280',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Instructor
                        </th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#6b7280',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map((course, index) => (
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
                            {course.code}
                          </td>
                          <td style={{ padding: '12px', color: '#1f2937', fontWeight: '500' }}>
                            {course.name}
                          </td>
                          <td style={{ padding: '12px', color: '#1f2937' }}>
                            👨‍🏫 {course.delegate}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              backgroundColor: '#d1fae5',
                              color: '#065f46',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              Active
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </>
        ) : (
          // No Courses State
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
                No Courses Enrolled
              </h2>
              <p style={{ margin: '0', fontSize: '16px', color: '#6b7280', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                You haven't been enrolled in any courses yet. Please contact your administrator for course enrollment.
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default StudentCourses;
