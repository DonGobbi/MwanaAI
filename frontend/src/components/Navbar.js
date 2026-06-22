import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container">
        <div className="flex justify-between items-center py-4">
          <Link to={currentUser ? '/tutor' : '/'} className="flex items-center">
            <span className="text-2xl font-bold text-primary-600">MwanaAI</span>
          </Link>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <Link
                  to="/tutor"
                  className="text-gray-700 hover:text-primary-600 transition-colors font-medium"
                >
                  Tutor
                </Link>
                <span className="hidden sm:inline text-sm text-gray-500">
                  {currentUser.displayName
                    ? currentUser.displayName.split(' ')[0]
                    : 'Student'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
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
