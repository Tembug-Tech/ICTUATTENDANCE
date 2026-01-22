import React, { useState } from 'react';

const Alert = ({ type = 'info', title, message, dismissible = true }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const typeClasses = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 flex justify-between items-start ${typeClasses[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{icons[type]}</span>
        <div>
          {title && <h3 className="font-semibold">{title}</h3>}
          {message && <p className="text-sm mt-1">{message}</p>}
        </div>
      </div>
      {dismissible && (
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Alert;
