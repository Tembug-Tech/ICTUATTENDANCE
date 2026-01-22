import React, { useState } from 'react';

/**
 * AdminSidebar Component
 * Professional Admin Dashboard Sidebar for University Attendance Management System
 * Dark theme with organized sections and responsive design
 */
const AdminSidebar = ({ activeTab = 'dashboard', onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Menu sections with items
  const menuSections = [
    {
      name: 'Main',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
        }
      ]
    },
    {
      name: 'Attendance',
      items: [
        {
          id: 'sessions',
          label: 'Attendance Sessions',
          icon: 'event_note',
        },
        {
          id: 'records',
          label: 'Attendance Records',
          icon: 'assignment',
        }
      ]
    },
    {
      name: 'Academic',
      items: [
        {
          id: 'courses',
          label: 'Courses',
          icon: 'school',
        },
        {
          id: 'classes',
          label: 'Classes',
          icon: 'class',
        }
      ]
    },
    {
      name: 'Notifications',
      items: [
        {
          id: 'alerts',
          label: 'Alerts',
          icon: 'notifications',
        },
        {
          id: 'warnings',
          label: 'Warnings',
          icon: 'warning',
        }
      ]
    }
  ];

  const handleKeyDown = (e, itemId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTabChange(itemId);
    }
  };

  return (
    <aside
      className={`
        ${isCollapsed ? 'w-20' : 'w-72'}
        h-screen
        fixed left-0 top-0
        bg-gray-900 dark:bg-gray-950
        border-r border-gray-800 dark:border-gray-800
        flex flex-col
        transition-all duration-300
        shadow-2xl
        z-40
      `}
      role="navigation"
      aria-label="Admin navigation"
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between gap-3">
          {/* Logo/Brand Icon */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 hover:shadow-cyan-500/50 transition-shadow">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>

          {/* Brand Text */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base text-white tracking-tight truncate">
                Admin Control Panel
              </p>
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              ${isCollapsed ? 'hidden' : ''}
              p-2 rounded-lg
              text-gray-400 hover:text-gray-200
              hover:bg-gray-800 dark:hover:bg-gray-800
              transition-all duration-200
              flex-shrink-0
            `}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {menuSections.map((section) => (
          <div key={section.name} className="space-y-2">
            {/* Section Header */}
            {!isCollapsed && (
              <h3 className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-600 uppercase tracking-wider">
                {section.name}
              </h3>
            )}

            {/* Section Items */}
            <div className="space-y-1.5">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  className={`
                    w-full
                    flex items-center gap-3
                    px-4 py-3
                    rounded-lg
                    text-sm font-medium
                    transition-all duration-200
                    cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0
                    group
                    ${
                      activeTab === item.id
                        ? // Active state
                          `
                          bg-gradient-to-r from-blue-600/20 to-cyan-600/20
                          text-cyan-300
                          border-l-3 border-cyan-500
                          shadow-lg shadow-cyan-500/10
                          `
                        : // Inactive state
                          `
                          text-gray-400 hover:text-gray-200
                          border-l-3 border-transparent
                          hover:bg-gray-800/50 dark:hover:bg-gray-800/30
                          `
                    }
                  `}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  role="menuitem"
                >
                  {/* Icon */}
                  <span
                    className={`
                      material-symbols-outlined
                      text-xl
                      flex-shrink-0
                      transition-colors duration-200
                      ${
                        activeTab === item.id
                          ? 'text-cyan-400'
                          : 'text-gray-500 group-hover:text-gray-300'
                      }
                    `}
                  >
                    {item.icon}
                  </span>

                  {/* Label */}
                  {!isCollapsed && (
                    <span className="block text-sm font-medium truncate">
                      {item.label}
                    </span>
                  )}

                  {/* Icon Badge for Active Item (Collapsed View) */}
                  {isCollapsed && activeTab === item.id && (
                    <div className="absolute left-0 w-1.5 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-r-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-800">
        <div
          className={`
            flex items-center gap-3
            p-3 rounded-lg
            bg-gray-800/50 dark:bg-gray-800/30
            text-gray-400 text-xs
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          <span className="material-symbols-outlined text-base flex-shrink-0">
            info
          </span>
          {!isCollapsed && (
            <span className="leading-tight">
              Attendance Management System v1.0
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
