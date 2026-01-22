import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Alert from '../components/Alert';

const StudentProfile = () => {
  const { currentUser, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    matricule: ''
  });

  // Generate avatar with initials
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'S';
  };

  const getAvatarColor = (email) => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Protect route - only allow students
  useEffect(() => {
    if (loading) return;

    if (!currentUser || userRole !== 'student') {
      navigate('/student');
      return;
    }

    fetchStudentProfile();
  }, [currentUser, userRole, loading, navigate]);

  const fetchStudentProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, name, matricule, role')
        .eq('id', currentUser.id)
        .single();

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        throw fetchError;
      }

      if (!data) {
        throw new Error('No profile data found');
      }

      setProfileData(data);
      setFormData({
        name: data.name || '',
        matricule: data.matricule || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: formData.name
        })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfileData(prev => ({
        ...prev,
        name: formData.name
      }));
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate password fields
    if (!passwordData.currentPassword) {
      setError('Please enter your current password');
      return;
    }
    if (!passwordData.newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    try {
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      setSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    }
  };

  if (isLoading) {
    return (
      <Layout role="student">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ animation: 'spin 1s linear infinite', fontSize: '32px', marginBottom: '15px' }}>⏳</div>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading your profile...</div>
          </div>
        </div>
      </Layout>
    );
  }

  const avatarColor = profileData ? getAvatarColor(currentUser?.email || '') : '#3b82f6';
  const initials = profileData ? getInitials(profileData.name) : 'S';

  return (
    <Layout role="student">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {profileData && (
          <>
            {/* Profile Header */}
            <div style={{
              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)`,
              borderRadius: '12px',
              padding: '40px',
              marginBottom: '30px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Avatar */}
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '42px',
                  fontWeight: 'bold',
                  border: '3px solid rgba(255,255,255,0.5)',
                  flexShrink: 0
                }}>
                  {initials}
                </div>

                {/* Header Info */}
                <div>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700' }}>
                    {profileData.name}
                  </h1>
                  <p style={{ margin: '0 0 4px 0', fontSize: '16px', opacity: 0.9 }}>
                    📚 Student
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
                    {currentUser?.email}
                  </p>
                </div>

                <div style={{ marginLeft: 'auto' }}>
                  {!isEditing && (
                    <Button 
                      onClick={() => setIsEditing(true)}
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.5)'
                      }}
                    >
                      ✏️ Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '0',
              marginBottom: '24px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              {['info', 'security'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab !== 'security') {
                      setShowPasswordForm(false);
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: activeTab === tab ? '#3b82f6' : '#6b7280',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab ? '3px solid #3b82f6' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'info' ? '👤 Personal Information' : '🔐 Security'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div>
              {/* Personal Information Tab */}
              {activeTab === 'info' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Profile Details Card */}
                  <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '24px' }}>
                      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                        Profile Details
                      </h2>

                      {!isEditing ? (
                        <div>
                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                              Full Name
                            </label>
                            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                              {profileData.name}
                            </p>
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                              Matricule Number
                            </label>
                            <p style={{ 
                              margin: 0, 
                              fontSize: '16px', 
                              fontWeight: '500',
                              color: '#1f2937',
                              padding: '10px 12px',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '6px',
                              fontFamily: 'monospace'
                            }}>
                              {profileData.matricule}
                            </p>
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                              Email Address
                            </label>
                            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                              {currentUser?.email}
                            </p>
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                              Account Type
                            </label>
                            <div style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '20px',
                              fontSize: '13px',
                              fontWeight: '600',
                              textTransform: 'capitalize'
                            }}>
                              👨‍🎓 {profileData.role}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                              Full Name
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                              Matricule (Cannot be changed)
                            </label>
                            <div style={{ 
                              padding: '10px 12px', 
                              backgroundColor: '#f3f4f6', 
                              borderRadius: '6px',
                              color: '#6b7280',
                              fontFamily: 'monospace',
                              fontSize: '14px'
                            }}>
                              {formData.matricule}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <Button 
                              onClick={handleSaveProfile}
                              style={{ flex: 1, backgroundColor: '#10b981' }}
                            >
                              ✓ Save Changes
                            </Button>
                            <Button 
                              onClick={() => {
                                setIsEditing(false);
                                setFormData({
                                  name: profileData.name,
                                  matricule: profileData.matricule
                                });
                              }}
                              style={{ flex: 1, backgroundColor: '#ef4444' }}
                            >
                              ✕ Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Quick Stats Card */}
                  <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '24px' }}>
                      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                        Account Status
                      </h2>

                      <div style={{
                        padding: '16px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        borderLeft: '4px solid #10b981'
                      }}>
                        <p style={{ margin: '0', fontSize: '13px', color: '#047857', fontWeight: '600' }}>
                          ✓ Account is Active
                        </p>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
                          Member Since
                        </p>
                        <p style={{ margin: '0', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                          {profileData.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }) : 'N/A'}
                        </p>
                      </div>

                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#92400e'
                      }}>
                        💡 Keep your password secure and update it regularly.
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '24px' }}>
                    <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                      Password Management
                    </h2>

                    {!showPasswordForm ? (
                      <div>
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '8px',
                          marginBottom: '20px'
                        }}>
                          <p style={{ margin: '0', fontSize: '14px', color: '#4b5563' }}>
                            Keep your account secure by using a strong password. We recommend changing your password every 3 months.
                          </p>
                        </div>

                        <Button 
                          onClick={() => setShowPasswordForm(true)}
                          style={{ width: '100%', backgroundColor: '#f59e0b' }}
                        >
                          🔐 Change Password
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordChange}>
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '13px', color: '#1f2937', marginBottom: '8px', fontWeight: '600' }}>
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              boxSizing: 'border-box'
                            }}
                            placeholder="Enter your current password"
                          />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '13px', color: '#1f2937', marginBottom: '8px', fontWeight: '600' }}>
                            New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              boxSizing: 'border-box'
                            }}
                            placeholder="Enter your new password (min 6 characters)"
                          />
                          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Password must be at least 6 characters long
                          </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '13px', color: '#1f2937', marginBottom: '8px', fontWeight: '600' }}>
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              boxSizing: 'border-box'
                            }}
                            placeholder="Confirm your new password"
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          <Button 
                            type="submit"
                            style={{ flex: 1, backgroundColor: '#10b981' }}
                          >
                            ✓ Update Password
                          </Button>
                          <Button 
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordData({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: ''
                              });
                            }}
                            style={{ flex: 1, backgroundColor: '#ef4444' }}
                          >
                            ✕ Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default StudentProfile;
