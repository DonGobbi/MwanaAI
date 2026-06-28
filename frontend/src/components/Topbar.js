import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiLogOut, FiChevronDown, FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

const Topbar = ({ onMenuClick }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const role = userProfile?.userType || 'student';
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const name = currentUser?.displayName || 'Account';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const requestLogout = () => {
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100 h-16 flex items-center gap-2 px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden text-gray-600 hover:text-primary-600 p-1" aria-label="Open menu">
        <FiMenu className="w-6 h-6" />
      </button>

      <div className="flex-1" />

      <ThemeToggle />
      {(role === 'student' || role === 'teacher' || role === 'parent') && <NotificationBell />}

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-gray-200 pl-1 pr-2 py-1 hover:bg-gray-50 transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </span>
          <span className="hidden sm:inline text-sm font-medium text-gray-700">{name.split(' ')[0]}</span>
          <FiChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-52 card p-1 z-20 shadow-lg">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiUser /> My profile
              </button>
              <button
                onClick={requestLogout}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiLogOut /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>

      {/* Log out confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loggingOut && setConfirmOpen(false)}
          />
          <div className="relative card p-5 w-full max-w-sm animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <FiLogOut />
              </span>
              <h3 className="font-bold text-gray-900">Log out?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              You'll need to sign in again to continue using MwanaAI.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={loggingOut}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 inline-flex items-center gap-2 transition-colors"
              >
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;
