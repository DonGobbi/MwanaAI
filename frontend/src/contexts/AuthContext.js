import React, { createContext, useContext, useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService';
import { inviteService } from '../services/inviteService';
import { schoolService } from '../services/schoolService';
import { PageLoader } from '../components/Spinner';

const GRADE_LEVEL_KEY = 'mwanaai_grade_level';

const DEACTIVATED_MSG =
  'Your account has been deactivated. Please contact your school administrator if you believe this is a mistake.';
const SCHOOL_SUSPENDED_MSG =
  "Your school's access has been suspended. Please contact your system administrator.";

// Gate every sign-in: a deactivated/archived account, or a member of a
// suspended school, must not be allowed in. Returns { ok, message }.
async function checkAccountAccess(profile) {
  const status = (profile?.status || 'active').toLowerCase();
  if (status === 'deactivated' || status === 'archived' || status === 'deleted') {
    return { ok: false, message: DEACTIVATED_MSG };
  }
  if (profile?.schoolId) {
    try {
      const school = await schoolService.getSchool(profile.schoolId);
      const sStatus = (school?.status || 'active').toLowerCase();
      if (sStatus === 'deactivated' || sStatus === 'archived' || sStatus === 'suspended') {
        return { ok: false, message: SCHOOL_SUSPENDED_MSG };
      }
    } catch (_) {
      /* can't read the school doc — don't block sign-in on that alone */
    }
  }
  return { ok: true };
}

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

          // Load the profile, redeeming any pending admin invite FIRST (the
          // invite sets role + class + subjects). We then read the canonical
          // profile and set state once — so a second auth event can't clobber
          // it with a stale read. Invited people arrive fully configured, and
          // invited students skip the "Set up your courses" gate.
          let profile = null;
          try {
            profile = await firebaseService.getUserProfile();
            try {
              const invites = await inviteService.getForEmail(user.email);
              const pending = invites.find((i) => i.status !== 'accepted');
              if (pending) {
                const updates = { userType: pending.role, schoolId: pending.schoolId, schoolName: pending.schoolName };
                if (pending.role === 'student') {
                  updates.gradeLevel = pending.gradeLevel || profile?.gradeLevel || '';
                  updates.subjects = pending.subjects?.length ? pending.subjects : profile?.subjects || [];
                  updates.classroomId = pending.classroomId || profile?.classroomId || '';
                  updates.classroomName = pending.classroomName || profile?.classroomName || '';
                }
                await firebaseService.saveUserProfile(updates);
                await inviteService.markAccepted(pending.id);
                profile = await firebaseService.getUserProfile(); // canonical, post-redeem
              }
            } catch (inviteErr) {
              /* no invite or not reachable — ignore */
            }
          } catch (profileErr) {
            console.error('Error loading user profile:', profileErr);
          }

          // Access gate — re-checked on every load so a user deactivated
          // mid-session is signed out on their next visit, not just at login.
          const gate = await checkAccountAccess(profile);
          if (!gate.ok) {
            await firebaseService.logout();
            localStorage.removeItem('token');
            setError(gate.message);
            setCurrentUser(null);
            setUserProfile(null);
            setLoading(false);
            return;
          }

          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
          });
          // Don't let a stale/basic read (e.g. a second auth event that fires
          // before the redeem write has propagated) clobber an already
          // populated profile.
          setUserProfile((prev) => {
            if (prev?.subjects?.length && !profile?.subjects?.length) return prev;
            if (prev?.userType && !profile?.userType) return prev;
            return profile;
          });
          if (profile?.gradeLevel) {
            localStorage.setItem(GRADE_LEVEL_KEY, profile.gradeLevel);
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

      // Block deactivated accounts / suspended schools before completing
      // sign-in — sign them straight back out with a clear message.
      let profile = null;
      try {
        profile = await firebaseService.getUserProfile();
      } catch (_) {
        /* ignore — gate treats a missing profile as active */
      }
      const gate = await checkAccountAccess(profile);
      if (!gate.ok) {
        await firebaseService.logout();
        localStorage.removeItem('token');
        const denied = new Error(gate.message);
        denied.code = 'auth/account-deactivated';
        throw denied;
      }

      try {
        // Get fresh ID token
        const idToken = await user.getIdToken(true);
        localStorage.setItem('token', idToken);
      } catch (err) {
        console.error('Error getting user data from backend:', err);
      }

      // On success, deliberately leave `loading` true. The onAuthStateChanged
      // handler clears it only after the profile (and any pending invite
      // redemption that sets the real role) has loaded — so we never briefly
      // render the default "student" dashboard for a teacher/admin/parent
      // before their actual role arrives.
      return user;
    } catch (err) {
      setError(err.message || 'Failed to login');
      setLoading(false); // failed login: re-enable the form
      throw err;
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

  // Send a password-reset email (self-service "Forgot password"). Normalise the
  // email the same way login/register do so it matches the stored account.
  const resetPassword = async (email) => {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) throw new Error('Please enter your email address.');
    await firebaseService.resetPassword(clean);
    return true;
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
    resetPassword,
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
