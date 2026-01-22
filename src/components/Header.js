import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ role }) => {
  const { currentUser, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const roleDisplay = {
    admin: '👑 Administrator',
    delegate: '🧑‍💼 Delegate',
    student: '🎓 Student',
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      window.location.href = '/student';
    } catch (err) {
      console.error('Logout error:', err);
      alert('Error logging out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="px-6 sm:px-8 py-4 flex justify-between items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-blue-900 truncate">University Attendance System</h1>
          <p className="text-sm text-gray-600 mt-1">{roleDisplay[role]}</p>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          {/* User Info */}
          <div className="hidden sm:block text-right">
            <p className="font-semibold text-gray-900 text-sm">{currentUser?.email}</p>
            <p className="text-xs text-gray-600">{currentUser?.full_name || 'User'}</p>
          </div>
          
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Logout"
          >
            {isLoggingOut ? '...' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
