import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const linkClass = 'text-gray-700 hover:text-primary-600 transition-colors font-medium';

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
    <nav className="bg-white shadow-sm">
      <div className="container">
        <div className="flex justify-between items-center py-4">
          <Link to={currentUser ? '/' : '/'} className="flex items-center">
            <span className="text-2xl font-bold text-primary-600">MwanaAI</span>
          </Link>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                {role === 'teacher' ? (
                  <>
                    <Link to="/teacher" className={linkClass}>My Classes</Link>
                    <Link to="/tutor" className={`hidden sm:inline ${linkClass}`}>Tutor</Link>
                  </>
                ) : role === 'parent' ? (
                  <Link to="/child" className={linkClass}>My Child</Link>
                ) : (
                  <>
                    <Link to="/learn" className={linkClass}>Learn</Link>
                    <Link to="/tutor" className={linkClass}>Tutor</Link>
                    <Link to="/quiz" className={`hidden sm:inline ${linkClass}`}>Practice</Link>
                    <Link to="/progress" className={`hidden sm:inline ${linkClass}`}>Progress</Link>
                  </>
                )}
                <span className="hidden md:inline text-sm text-gray-500">
                  {currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Account'}
                </span>
                <button onClick={handleLogout} className="text-gray-700 hover:text-primary-600 transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">Login</Link>
                <Link to="/signup" className="btn-primary">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
