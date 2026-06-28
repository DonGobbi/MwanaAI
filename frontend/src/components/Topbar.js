import React from 'react';
import { FiMenu } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import AccountMenu from './AccountMenu';

const Topbar = ({ onMenuClick }) => {
  const { userProfile } = useAuth();
  const role = userProfile?.userType || 'student';

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100 h-16 flex items-center gap-2 px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden text-gray-600 hover:text-primary-600 p-1" aria-label="Open menu">
        <FiMenu className="w-6 h-6" />
      </button>

      <div className="flex-1" />

      <ThemeToggle />
      {(role === 'student' || role === 'teacher' || role === 'parent') && <NotificationBell />}
      <AccountMenu />
    </header>
  );
};

export default Topbar;
