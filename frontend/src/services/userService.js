// User Service for MwanaAI
// Handles user-related functionality

// --- Mock Data ---
const MOCK_USER_PROFILE = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'student',
  grade: '10th Grade',
  school: 'Springfield High School',
  joinDate: '2023-09-01',
  avatar: 'https://i.pravatar.cc/150?img=12',
  subjects: ['Mathematics', 'Science', 'History'],
  preferences: {
    theme: 'light',
    notifications: true,
    emailUpdates: true
  },
  stats: {
    assessmentsCompleted: 15,
    averageScore: 78,
    studyHours: 42,
    activeDays: 28
  }
};

/**
 * Fetches the current user's profile
 */
async function getUserProfile() {
  // In a real app, this would make an API call
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_USER_PROFILE);
    }, 500);
  });
}

/**
 * Updates the user's profile
 */
async function updateUserProfile(profileData) {
  // In a real app, this would make an API call
  // For now, simulate a successful update
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Profile updated successfully',
        profile: { ...MOCK_USER_PROFILE, ...profileData }
      });
    }, 1000);
  });
}

/**
 * Updates the user's preferences
 */
async function updateUserPreferences(preferences) {
  // In a real app, this would make an API call
  // For now, simulate a successful update
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Preferences updated successfully',
        preferences: { ...MOCK_USER_PROFILE.preferences, ...preferences }
      });
    }, 500);
  });
}

/**
 * Fetches the user's learning progress
 */
async function getUserLearningProgress() {
  // In a real app, this would make an API call
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        subjects: {
          Mathematics: 75,
          Science: 82,
          History: 68,
          English: 90
        },
        recentActivity: [
          { type: 'assessment', subject: 'Mathematics', score: 85, date: '2023-11-01' },
          { type: 'lesson', subject: 'Science', completed: true, date: '2023-10-28' },
          { type: 'quiz', subject: 'History', score: 70, date: '2023-10-25' }
        ],
        recommendations: [
          { type: 'lesson', subject: 'Mathematics', title: 'Advanced Algebra', priority: 'high' },
          { type: 'practice', subject: 'History', title: 'World War II Quiz', priority: 'medium' }
        ]
      });
    }, 700);
  });
}

const userService = {
  getUserProfile,
  updateUserProfile,
  updateUserPreferences,
  getUserLearningProgress
};

export {
  getUserProfile,
  updateUserProfile,
  updateUserPreferences,
  getUserLearningProgress
};

export default userService;
