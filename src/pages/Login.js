import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login, currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    console.log('🔄 Login: Checking if user is already logged in - currentUser:', !!currentUser, 'userRole:', userRole);
    
    if (currentUser && userRole) {
      console.log('✅ Login: User is logged in with role:', userRole);
      
      if (userRole === 'admin') {
        console.log('📍 Login: Redirecting to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
      } else if (userRole === 'delegate') {
        console.log('📍 Login: Redirecting to delegate dashboard');
        navigate('/delegate/dashboard', { replace: true });
      } else if (userRole === 'student') {
        console.log('📍 Login: Redirecting to student dashboard');
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [currentUser, userRole, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('🔐 Login.handleLogin: Login attempt with email:', email);
    setError('');
    setLoading(true);

    try {
      // Validate email format
      if (!email.toLowerCase().endsWith('@ictuniversity.edu.cm')) {
        console.warn('❌ Login.handleLogin: Invalid email domain:', email);
        setError('❌ Only ICT University emails (@ictuniversity.edu.cm) are allowed');
        setLoading(false);
        return;
      }

      if (!password) {
        console.warn('❌ Login.handleLogin: No password provided');
        setError('❌ Please enter your password');
        setLoading(false);
        return;
      }

      console.log('🔄 Login.handleLogin: Calling AuthContext.login()...');
      
      // Call login - AuthContext handles role fetching automatically
      await login(email, password);
      
      console.log('✅ Login.handleLogin: Login successful! AuthContext should be updated');
      
    } catch (err) {
      console.error('❌ Login.handleLogin: Login error caught:', err.message);
      
      let errorMsg = err?.message || 'Invalid email or password';
      
      if (err?.message?.includes('Invalid')) {
        errorMsg = 'Invalid email or password. Please check your credentials.';
      } else if (err?.message?.includes('CORS') || err?.message?.includes('fetch')) {
        errorMsg = 'Connection error. Please check your internet connection and try again.';
      } else if (err?.message?.includes('timeout')) {
        errorMsg = 'Login is taking too long. Please try again or check your connection.';
      } else if (err?.status === 401) {
        errorMsg = 'Invalid email or password. Please check your credentials.';
      } else if (err?.status === 403) {
        errorMsg = 'Access denied. Your account may be disabled.';
      }
      
      setError(`❌ ${errorMsg}`);
      setLoading(false);
    }
  };

  // Modern, Responsive Login Page
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: '#F8FAFC',
      fontFamily: '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Main Login Card */}
      <div style={{
        maxWidth: '350px',
        width: '100%',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        animation: 'slideUp 0.4s ease-out'
      }}>
        {/* Header Section */}
        <div style={{
          padding: '12px 20px 8px',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>🎓</div>
          <h1 style={{
            fontSize: '16px',
            fontWeight: '700',
            margin: '0 0 2px 0',
            letterSpacing: '-0.5px'
          }}>
            ICT University
          </h1>
          <p style={{
            fontSize: '10px',
            color: '#DBEAFE',
            margin: '0',
            fontWeight: '500',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Attendance Portal
          </p>
        </div>

        {/* Form Container */}
        <div style={{
          padding: '24px',
          background: '#FFFFFF'
        }}>
          {/* Error Alert */}
          {error && (
            <div style={{
              marginBottom: '10px',
              padding: '8px 10px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#991B1B',
              animation: 'slideDown 0.3s ease-out'
            }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Email Input */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '3px',
                color: '#0F172A',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="Enter your university email"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: emailFocused ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                  fontSize: '14px',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  backgroundColor: emailFocused ? '#F0F9FF' : '#FFFFFF',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                required
              />
              <p style={{
                fontSize: '11px',
                marginTop: '2px',
                color: '#94A3B8',
                margin: '2px 0 0 0'
              }}>
                e.g., student.name@ictuniversity.edu.cm
              </p>
            </div>

            {/* Password Input */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3px'
              }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0F172A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Password
                </label>
                <a href="#" style={{
                  fontSize: '11px',
                  color: '#1E3A8A',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#FACC15'}
                onMouseLeave={(e) => e.target.style.color = '#1E3A8A'}
                >
                  Forgot?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    paddingRight: '36px',
                    borderRadius: '8px',
                    border: passwordFocused ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                    fontSize: '14px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    backgroundColor: passwordFocused ? '#F0F9FF' : '#FFFFFF',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: '#94A3B8',
                    padding: '4px 8px',
                    transition: 'color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#1E3A8A'}
                  onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                fontWeight: '600',
                padding: '8px 12px',
                borderRadius: '8px',
                marginTop: '6px',
                boxShadow: loading ? 'none' : '0 4px 12px -2px rgba(30, 58, 138, 0.15)',
                color: 'white',
                fontSize: '15px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                backgroundColor: loading ? '#1E40AF' : '#1E3A8A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.9 : 1
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#163089')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#1E3A8A')}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></span>
                  Signing in...
                </>
              ) : (
                <>🔐 Sign In</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '8px 0',
            color: '#CBD5E1'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }}></div>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }}></div>
          </div>

          {/* Sign Up Link */}
          <p style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748B',
            margin: '0'
          }}>
            Don't have an account?{' '}
            <a href="/signup" style={{
              color: '#1E3A8A',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'color 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.color = '#FACC15'}
            onMouseLeave={(e) => e.target.style.color = '#1E3A8A'}
            >
              Sign Up
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '40px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#94A3B8'
      }}>
        <p style={{ margin: '0 0 6px 0' }}>
          © 2026 ICT University | Secure Student Attendance Portal
        </p>
        <p style={{ margin: '0' }}>
          <a href="#" style={{
            color: '#1E3A8A',
            textDecoration: 'none',
            marginRight: '16px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.color = '#FACC15'}
          onMouseLeave={(e) => e.target.style.color = '#1E3A8A'}
          >
            Privacy Policy
          </a>
          <a href="#" style={{
            color: '#1E3A8A',
            textDecoration: 'none',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.color = '#FACC15'}
          onMouseLeave={(e) => e.target.style.color = '#1E3A8A'}
          >
            Terms of Service
          </a>
        </p>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          body {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
