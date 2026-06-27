import React, { createContext, useContext, useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService';
import { PageLoader } from '../components/Spinner';

const GRADE_LEVEL_KEY = 'mwanaai_grade_level';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on component mount
  useEffect(() => {
    // Set up Firebase auth state listener
    const unsubscribe = firebaseService.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in
        try {
          // Get ID token for backend API calls
          const idToken = await user.getIdToken();
          
          // Store token for API calls
          localStorage.setItem('token', idToken);
          
          // Set user data in state
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
          });

          // Load the student's profile (grade level etc.) — best effort.
          try {
            const profile = await firebaseService.getUserProfile();
            setUserProfile(profile);
            if (profile?.gradeLevel) {
              localStorage.setItem(GRADE_LEVEL_KEY, profile.gradeLevel);
            }
          } catch (profileErr) {
            console.error('Error loading user profile:', profileErr);
          }
        } catch (err) {
          console.error('Error getting user token:', err);
          setError('Failed to authenticate with the server');
        }
      } else {
        // User is signed out
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      // Use Firebase authentication directly
      const user = await firebaseService.login(email, password);
      
      // Get user data from backend after successful login
      try {
        // Get fresh ID token
        const idToken = await user.getIdToken(true);
        localStorage.setItem('token', idToken);
        
        // Fetch additional user data from backend if needed
        // This is optional if you're storing user data in Firestore
        // const userData = await authService.getCurrentUser();
      } catch (err) {
        console.error('Error getting user data from backend:', err);
      }
      
      return user;
    } catch (err) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      
      // Use Firebase authentication directly
      const user = await firebaseService.register(
        userData.email,
        userData.password,
        userData.displayName || `${userData.firstName} ${userData.lastName}`
      );

      // Save the student's profile (incl. grade level) to Firestore — best effort.
      try {
        await user.getIdToken(true);
        await firebaseService.saveUserProfile({
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
          userType: userData.userType || 'student',
          gradeLevel: userData.gradeLevel || '',
          subjects: userData.subjects || [],
        });
        if (userData.gradeLevel) {
          localStorage.setItem(GRADE_LEVEL_KEY, userData.gradeLevel);
        }
      } catch (err) {
        console.error('Error storing user profile:', err);
      }

      // Sign out so the user explicitly logs in after creating their account.
      await firebaseService.logout();
      localStorage.removeItem('token');

      return user;
    } catch (err) {
      setError(err.message || 'Failed to create account');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update the student's grade/form level (Firestore + local cache + state).
  const updateGradeLevel = async (level) => {
    localStorage.setItem(GRADE_LEVEL_KEY, level);
    setUserProfile((prev) => ({ ...(prev || {}), gradeLevel: level }));
    try {
      await firebaseService.saveUserProfile({ gradeLevel: level });
    } catch (err) {
      console.error('Error updating grade level:', err);
    }
  };

  // Set the student's class + subjects once — the profile then drives every
  // page (Learn, Practice, Tutor, Flashcards) so they're never asked again.
  const updateCourses = async ({ gradeLevel, subjects }) => {
    // Persist first — only update local state once the save succeeds, so a
    // failed write doesn't leave the student "set up" in this session but
    // empty again on the next load.
    await firebaseService.saveUserProfile({
      ...(gradeLevel ? { gradeLevel } : {}),
      subjects: subjects || [],
    });
    if (gradeLevel) localStorage.setItem(GRADE_LEVEL_KEY, gradeLevel);
    setUserProfile((prev) => ({
      ...(prev || {}),
      ...(gradeLevel ? { gradeLevel } : {}),
      subjects: subjects || [],
    }));
  };

  // Logout function
  const logout = async () => {
    try {
      await firebaseService.logout();
      // Firebase auth state listener will handle clearing the state
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out');
    }
  };

  // Context value
  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    login,
    signup,
    logout,
    updateGradeLevel,
    updateCourses,
    isAuthenticated: () => !!currentUser,
    getIdToken: firebaseService.getIdToken
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <PageLoader label="Starting MwanaAI…" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;
