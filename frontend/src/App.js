import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AITutor from './pages/AITutor';
import Learn from './pages/Learn';
import Quiz from './pages/Quiz';
import Progress from './pages/Progress';
import Teacher from './pages/Teacher';
import ParentChild from './pages/ParentChild';
import Resources from './pages/Resources';
import Flashcards from './pages/Flashcards';
import MyCourses from './pages/MyCourses';
import CourseSetup from './pages/CourseSetup';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { PageLoader } from './components/Spinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <PageLoader />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const RoutesTree = ({ location }) => (
  <Routes location={location}>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
    <Route path="/courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
    <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
    <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
    <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
    <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
    <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
    <Route path="/teacher/*" element={<ProtectedRoute><Teacher /></ProtectedRoute>} />
    <Route path="/admin/*" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="/child" element={<ProtectedRoute><ParentChild /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/profile/:tab" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function AppRoutes() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // A student must set their class + subjects once; the profile then drives
  // every page, so they're never asked to pick a class/subject again.
  const needsCourseSetup =
    currentUser && userProfile?.userType === 'student' && !(userProfile?.subjects?.length);
  if (needsCourseSetup) {
    return <CourseSetup />;
  }

  // Authenticated app — sidebar shell.
  if (currentUser) {
    // Settings/Profile is a focused, full-screen page: no sidebar, no topbar.
    // It carries its own "← Back to Dashboard" bar instead.
    const fullScreen = /^\/profile(\/|$)/.test(location.pathname);
    if (fullScreen) {
      // No per-path key here: switching Settings tabs (Profile/Security/Terms/
      // Privacy) keeps the page mounted so the left nav stays put and only the
      // right panel changes — no reflow or re-animation.
      return (
        <div className="min-h-screen bg-gray-50">
          <RoutesTree location={location} />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="lg:pl-64 flex flex-col min-h-screen min-w-0">
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1">
            <div key={location.pathname} className="page-transition">
              <RoutesTree location={location} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Public / logged-out — simple top navbar.
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <div key={location.pathname} className="page-transition">
          <RoutesTree location={location} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
