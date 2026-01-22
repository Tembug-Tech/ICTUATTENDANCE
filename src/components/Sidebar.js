import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ role }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const getMenuItems = () => {
    const baseClass = role === 'admin' ? '/admin' : role === 'delegate' ? '/delegate' : '/student';

    if (role === 'admin') {
      return [
      ];
    } else if (role === 'student') {
      return [
        { label: 'Mark Attendance', path: `${baseClass}/mark`, icon: '✅' },
        { label: 'Attendance History', path: `${baseClass}/history`, icon: '📋' },
        { label: 'My Courses', path: `${baseClass}/courses`, icon: '📚' },
        { label: 'Profile', path: `${baseClass}/profile`, icon: '👤' },
      ];
    } else if (role === 'delegate') {
      return [
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();
  const isActive = (path) => location.pathname === path;

  return (
    <aside
      className={`bg-gradient-to-b from-black to-gray-900 text-white transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      } flex flex-col shadow-lg`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {isOpen && <h1 className="font-bold text-lg">Attendance</h1>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-700 rounded-lg transition"
        >
          {isOpen ? '←' : '→'}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all ${
              isActive(item.path)
                ? 'bg-black text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            title={!isOpen ? item.label : ''}
          >
            <span className="text-xl">{item.icon}</span>
            {isOpen && <span className="ml-3 text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>


    </aside>
  );
};

export default Sidebar;
