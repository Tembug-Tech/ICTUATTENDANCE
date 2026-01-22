import React, { useState, useEffect } from 'react';

export const AuthDebugger = () => {
  const [authStatus, setAuthStatus] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    // Check localStorage for auth token
    const token = localStorage.getItem('supabase.auth.token');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        setSessionToken(JSON.stringify(parsed, null, 2));
        setAuthStatus('✅ Session token found in localStorage');
      } catch (e) {
        setSessionToken('Failed to parse token');
        setAuthStatus('⚠️ Token exists but malformed');
      }
    } else {
      setAuthStatus('❌ No session token in localStorage');
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      backgroundColor: '#1E3A8A',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>🔍 Auth Debug</div>
      <div style={{ marginBottom: '10px' }}>{authStatus}</div>
      {sessionToken && (
        <details>
          <summary style={{ cursor: 'pointer', color: '#60A5FA' }}>View Token</summary>
          <pre style={{ marginTop: '10px', fontSize: '10px', overflow: 'auto' }}>
            {sessionToken}
          </pre>
        </details>
      )}
    </div>
  );
};

export default AuthDebugger;
