import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FiBookOpen,
  FiMessageCircle,
  FiEdit3,
  FiBarChart2,
  FiUsers,
  FiLogOut,
} from 'react-icons/fi';

const navLink = ({ isActive }) =>
  `inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
    isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
  }`;

const Navbar = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const role = userProfile?.userType || 'student';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="container">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600 text-white font-bold font-display">
              M
            </span>
            <span className="text-xl font-bold font-display text-gray-900">MwanaAI</span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            {currentUser ? (
              <>
                {role === 'teacher' ? (
                  <>
                    <NavLink to="/teacher" className={navLink}>
                      <FiUsers /> My Classes
                    </NavLink>
                    <NavLink to="/tutor" className={navLink}>
                      <FiMessageCircle /> <span className="hidden sm:inline">Tutor</span>
                    </NavLink>
                  </>
                ) : role === 'parent' ? (
                  <NavLink to="/child" className={navLink}>
                    <FiUsers /> My Child
                  </NavLink>
                ) : (
                  <>
                    <NavLink to="/learn" className={navLink}>
                      <FiBookOpen /> <span className="hidden sm:inline">Learn</span>
                    </NavLink>
                    <NavLink to="/tutor" className={navLink}>
                      <FiMessageCircle /> <span className="hidden sm:inline">Tutor</span>
                    </NavLink>
                    <NavLink to="/quiz" className={navLink}>
                      <FiEdit3 /> <span className="hidden sm:inline">Practice</span>
                    </NavLink>
                    <NavLink to="/progress" className={`${navLink({ isActive: false })} hidden sm:inline-flex`}>
                      <FiBarChart2 /> Progress
                    </NavLink>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
                  title="Log out"
                >
                  <FiLogOut /> <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
