import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [matriculeFocused, setMatriculeFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    console.log('📝 Signup.handleSignup: Signup attempt with email:', email);
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!fullName.trim()) {
        setError('❌ Please enter your full name');
        setLoading(false);
        return;
      }

      if (!matricule.trim()) {
        setError('❌ Please enter your matricule number');
        setLoading(false);
        return;
      }

      if (!email.toLowerCase().endsWith('@ictuniversity.edu.cm')) {
        console.warn('❌ Signup.handleSignup: Invalid email domain:', email);
        setError('❌ Only ICT University emails (@ictuniversity.edu.cm) are allowed');
        setLoading(false);
        return;
      }

      if (!password || password.length < 6) {
        setError('❌ Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('❌ Passwords do not match');
        setLoading(false);
        return;
      }

      console.log('🔄 Signup.handleSignup: Creating account...');

      // Call signup function from AuthContext
      await signup(fullName, matricule, email, password);

      console.log('✅ Signup.handleSignup: Account created successfully!');
      navigate('/login', { replace: true });

    } catch (err) {
      console.error('❌ Signup.handleSignup: Signup error caught:', err.message);
      setError(`❌ ${err?.message || 'Failed to create account. Please try again.'}`);
      setLoading(false);
    }
  };

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
      {/* Main Signup Card */}
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
            Create Account
          </h1>
          <p style={{
            fontSize: '10px',
            color: '#DBEAFE',
            margin: '0',
            fontWeight: '500',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            ICT University Portal
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

          {/* Signup Form */}
          <form onSubmit={handleSignup} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Full Name Input */}
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
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onFocus={() => setFullNameFocused(true)}
                onBlur={() => setFullNameFocused(false)}
                placeholder="Enter your full name"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: fullNameFocused ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                  fontSize: '14px',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  backgroundColor: fullNameFocused ? '#F0F9FF' : '#FFFFFF',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>

            {/* Matricule Input */}
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
                Matricule
              </label>
              <input
                type="text"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                onFocus={() => setMatriculeFocused(true)}
                onBlur={() => setMatriculeFocused(false)}
                placeholder="Enter your matricule number"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: matriculeFocused ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                  fontSize: '14px',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  backgroundColor: matriculeFocused ? '#F0F9FF' : '#FFFFFF',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>

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
              <label style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#0F172A',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                marginBottom: '3px'
              }}>
                Password
              </label>
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

            {/* Confirm Password Input */}
            <div>
              <label style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#0F172A',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                marginBottom: '3px'
              }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  placeholder="Confirm your password"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    paddingRight: '36px',
                    borderRadius: '8px',
                    border: confirmPasswordFocused ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                    fontSize: '14px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    backgroundColor: confirmPasswordFocused ? '#F0F9FF' : '#FFFFFF',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Sign Up Button */}
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
                  Creating Account...
                </>
              ) : (
                <>✨ Create Account</>
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

          {/* Back to Login */}
          <p style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748B',
            margin: '0'
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{
              color: '#1E3A8A',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'color 0.2s',
              cursor: 'pointer'
            }}
              onMouseEnter={(e) => e.target.style.color = '#FACC15'}
              onMouseLeave={(e) => e.target.style.color = '#1E3A8A'}
            >
              Sign In
            </Link>
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
      </footer>

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
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Signup;
