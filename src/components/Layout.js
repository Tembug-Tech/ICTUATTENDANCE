import React from 'react';
import Header from './Header';

const Layout = ({ children, role }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header role={role} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
