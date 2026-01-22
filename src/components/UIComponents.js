import React from 'react';

// ============================================
// CARDS
// ============================================

export const StatCard = ({ label, value, icon, trend, trendColor = 'green' }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {label}
        </p>
        <p className="text-4xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
          {icon}
        </span>
      </div>
    </div>
    {trend && (
      <p className={`text-xs font-semibold ${
        trendColor === 'green' ? 'text-green-600 dark:text-green-400' :
        trendColor === 'red' ? 'text-red-600 dark:text-red-400' :
        'text-amber-600 dark:text-amber-400'
      }`}>
        {trend}
      </p>
    )}
  </div>
);

export const DataCard = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 ${className}`}>
    {children}
  </div>
);

export const SectionCard = ({ title, action, children }) => (
  <DataCard className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {title}
      </h3>
      {action}
    </div>
    {children}
  </DataCard>
);

// ============================================
// BADGES & CHIPS
// ============================================

export const StatusBadge = ({ status, className = '' }) => {
  const colors = {
    'Open': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'Closed': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
    'Warning': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    'Good': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'Fair': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    'Low': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    'Critical': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    'Active': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'Inactive': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || colors['Inactive']} ${className}`}>
      {status}
    </span>
  );
};

export const ProgressBar = ({ percentage, status = 'Good', animated = true }) => {
  const colors = {
    'Good': 'bg-green-500',
    'Fair': 'bg-amber-500',
    'Low': 'bg-red-500',
  };

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full ${colors[status] || colors['Good']} ${animated ? 'transition-all duration-500' : ''}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

// ============================================
// BUTTONS
// ============================================

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  loading = false,
  disabled = false,
  onClick,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        font-semibold rounded-lg transition-all duration-200 flex items-center gap-2
        ${variants[variant]}
        ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {loading && <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />}
      {icon && !loading && <span className="material-symbols-outlined text-lg">{icon}</span>}
      {children}
    </button>
  );
};

// ============================================
// ALERTS & NOTIFICATIONS
// ============================================

export const AlertBox = ({ type = 'info', title, message, closable = true, onClose }) => {
  const colors = {
    'info': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-200',
    'success': 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-900 dark:text-green-200',
    'warning': 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-200',
    'error': 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-900 dark:text-red-200',
  };

  const icons = {
    'info': 'info',
    'success': 'check_circle',
    'warning': 'warning',
    'error': 'error',
  };

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${colors[type]}`}>
      <span className="material-symbols-outlined flex-shrink-0">{icons[type]}</span>
      <div className="flex-1">
        {title && <p className="font-semibold mb-1">{title}</p>}
        {message && <p className="text-sm">{message}</p>}
      </div>
      {closable && (
        <button onClick={onClose} className="flex-shrink-0 opacity-50 hover:opacity-100">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  );
};

export const Toast = ({ type = 'success', message, duration = 3000 }) => (
  <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white font-semibold flex items-center gap-2 shadow-lg animate-slide-in ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    type === 'warning' ? 'bg-amber-600' :
    'bg-blue-600'
  }`}>
    <span className="material-symbols-outlined">{
      type === 'success' ? 'check_circle' :
      type === 'error' ? 'error' :
      type === 'warning' ? 'warning' :
      'info'
    }</span>
    {message}
  </div>
);

// ============================================
// LOADING STATES
// ============================================

export const LoadingSpinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 ${sizes[size]}`} />
    </div>
  );
};

export const SkeletonLoader = ({ count = 1, height = 'h-12', className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className={`bg-gray-200 dark:bg-gray-700 rounded-lg ${height} animate-pulse`} />
    ))}
  </div>
);

// ============================================
// EMPTY STATE
// ============================================

export const EmptyState = ({ icon, title, message, action }) => (
  <div className="py-12 px-4 text-center">
    <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4 block">
      {icon}
    </span>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-6">
      {message}
    </p>
    {action}
  </div>
);

// ============================================
// TABLE
// ============================================

export const Table = ({ columns, data, loading = false, empty = false, emptyIcon = 'table_chart' }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (empty) {
    return <EmptyState icon={emptyIcon} title="No Data" message="No records found" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// MODAL
// ============================================

export const Modal = ({ isOpen, title, children, footer, onClose, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-xl ${sizes[size]} w-full`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// TIMELINE ITEM
// ============================================

export const TimelineItem = ({ time, title, description, icon, highlighted = false }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className={`p-2 rounded-full ${highlighted ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
        <span className={`material-symbols-outlined ${highlighted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {icon}
        </span>
      </div>
      <div className="w-0.5 h-12 bg-gray-200 dark:bg-gray-700" />
    </div>
    <div className="pb-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{time}</p>
      <p className={`font-semibold ${highlighted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
        {title}
      </p>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {description}
        </p>
      )}
    </div>
  </div>
);

// ============================================
// GRID LAYOUT
// ============================================

export const ResponsiveGrid = ({ children, cols = 3 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-6`}>
    {children}
  </div>
);
