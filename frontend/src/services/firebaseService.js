import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import firebaseConfig from '../config/firebase';

// Default questions for subjects (fallback if not found in Firestore)
const defaultQuestions = {
  math: [
    {
      id: 'math1',
      text: 'What is the value of x in the equation 2x + 5 = 15?',
      options: ['5', '10', '7.5', '4'],
      correctAnswer: '5',
      explanation: 'To solve 2x + 5 = 15, subtract 5 from both sides to get 2x = 10, then divide by 2 to get x = 5.'
    },
    {
      id: 'math2',
      text: 'What is the area of a circle with radius 4 units?',
      options: ['16π square units', '8π square units', '4π square units', '12π square units'],
      correctAnswer: '16π square units',
      explanation: 'The area of a circle is calculated using the formula A = πr². With r = 4, we get A = π(4)² = 16π square units.'
    },
    {
      id: 'math3',
      text: 'If a triangle has sides of length 3, 4, and 5 units, what type of triangle is it?',
      options: ['Equilateral', 'Isosceles', 'Scalene', 'Right-angled'],
      correctAnswer: 'Right-angled',
      explanation: 'This is a 3-4-5 triangle, which is a right-angled triangle. It satisfies the Pythagorean theorem: 3² + 4² = 5².'
    }
  ],
  science: [
    {
      id: 'science1',
      text: 'What is the chemical symbol for gold?',
      options: ['Go', 'Au', 'Ag', 'Gd'],
      correctAnswer: 'Au',
      explanation: 'The chemical symbol for gold is Au, which comes from the Latin word "aurum".'
    },
    {
      id: 'science2',
      text: 'Which of the following is NOT a state of matter?',
      options: ['Solid', 'Liquid', 'Gas', 'Energy'],
      correctAnswer: 'Energy',
      explanation: 'The three common states of matter are solid, liquid, and gas. Plasma is sometimes considered a fourth state. Energy is a form of power, not a state of matter.'
    },
    {
      id: 'science3',
      text: 'What is the process by which plants make their own food using sunlight?',
      options: ['Photosynthesis', 'Respiration', 'Fermentation', 'Digestion'],
      correctAnswer: 'Photosynthesis',
      explanation: 'Photosynthesis is the process by which green plants use sunlight, carbon dioxide, and water to create oxygen and energy in the form of sugar.'
    }
  ],
  english: [
    {
      id: 'english1',
      text: 'Which of the following is a proper noun?',
      options: ['City', 'London', 'Building', 'Mountain'],
      correctAnswer: 'London',
      explanation: 'London is a proper noun because it names a specific city. The other options are common nouns.'
    },
    {
      id: 'english2',
      text: 'What is the past tense of the verb "to go"?',
      options: ['Goed', 'Gone', 'Went', 'Going'],
      correctAnswer: 'Went',
      explanation: '"Went" is the past tense of "to go". "Gone" is the past participle, used with helping verbs like "have".'
    },
    {
      id: 'english3',
      text: 'Which of these is an example of a simile?',
      options: ['The tree is tall', 'The moon is a silver coin', 'She runs like the wind', 'Time flies'],
      correctAnswer: 'She runs like the wind',
      explanation: 'A simile is a figure of speech that compares two different things using "like" or "as". "She runs like the wind" is a simile comparing her running to the wind.'
    }
  ],
  history: [
    {
      id: 'history1',
      text: 'In which year did World War II end?',
      options: ['1943', '1945', '1947', '1950'],
      correctAnswer: '1945',
      explanation: 'World War II ended in 1945 with the surrender of Germany in May and Japan in September.'
    },
    {
      id: 'history2',
      text: 'Who was the first President of the United States?',
      options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'Abraham Lincoln'],
      correctAnswer: 'George Washington',
      explanation: 'George Washington was the first President of the United States, serving from 1789 to 1797.'
    },
    {
      id: 'history3',
      text: 'Which ancient civilization built the pyramids at Giza?',
      options: ['Romans', 'Greeks', 'Mayans', 'Egyptians'],
      correctAnswer: 'Egyptians',
      explanation: 'The pyramids at Giza were built by the ancient Egyptians as tombs for their pharaohs.'
    }
  ],
  computer: [
    {
      id: 'computer1',
      text: 'What does CPU stand for?',
      options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Central Processor Underlying'],
      correctAnswer: 'Central Processing Unit',
      explanation: 'CPU stands for Central Processing Unit, which is the primary component of a computer that performs most of the processing.'
    },
    {
      id: 'computer2',
      text: 'Which of these is NOT a programming language?',
      options: ['Java', 'Python', 'Microsoft', 'C++'],
      correctAnswer: 'Microsoft',
      explanation: 'Microsoft is a technology company, not a programming language. Java, Python, and C++ are all programming languages.'
    },
    {
      id: 'computer3',
      text: 'What does HTML stand for?',
      options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Hyper Text Modern Links'],
      correctAnswer: 'Hyper Text Markup Language',
      explanation: 'HTML stands for Hyper Text Markup Language, which is the standard markup language for creating web pages.'
    }
  ]
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firebase authentication service
const firebaseService = {
  // Current user
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Register a new user
  register: async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      return userCredential.user;
    } catch (error) {
      throw handleFirebaseError(error);
    }
  },

  // Sign in existing user
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw handleFirebaseError(error);
    }
  },

  // Sign out
  logout: async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      throw handleFirebaseError(error);
    }
  },

  // Reset password
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      throw handleFirebaseError(error);
    }
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // Get ID token
  getIdToken: async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  },
  
  // Assessment related functions
  
  // Save assessment results
  saveAssessment: async (assessmentData) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const assessmentRef = doc(collection(db, 'assessments'), `${user.uid}_${assessmentData.subject}`);
      
      // Convert feedback object to a serializable format if needed
      const serializedFeedback = assessmentData.feedback ? {
        color: assessmentData.feedback.color || '',
        title: assessmentData.feedback.title || '',
        message: assessmentData.feedback.message || '',
        recommendation: assessmentData.feedback.recommendation || '',
        nextSteps: assessmentData.feedback.nextSteps || '',
        action: assessmentData.feedback.action || ''
      } : {};
      
      // Save all assessment data including questions
      await setDoc(assessmentRef, {
        id: `${user.uid}_${assessmentData.subject}`,
        userId: user.uid,
        subject: assessmentData.subject,
        subjectName: assessmentData.subjectName,
        answers: assessmentData.answers,
        score: assessmentData.score,
        scorePercentage: assessmentData.scorePercentage,
        level: assessmentData.level,
        feedback: serializedFeedback,
        timestamp: assessmentData.timestamp,
        dateCompleted: assessmentData.dateCompleted,
        totalQuestions: assessmentData.totalQuestions,
        answeredQuestions: assessmentData.answeredQuestions,
        // Save the complete questions with all their details
        questions: assessmentData.questions,
        completedAt: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  },
  
  // Check if user has completed an assessment
  hasCompletedAssessment: async (subject = null) => {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      let q;
      if (subject) {
        // Check for specific subject
        const assessmentRef = doc(db, 'assessments', `${user.uid}_${subject}`);
        const docSnap = await getDoc(assessmentRef);
        return docSnap.exists();
      } else {
        // Check for any assessment
        q = query(collection(db, 'assessments'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
      }
    } catch (error) {
      console.error('Error checking assessment completion:', error);
      return false;
    }
  },
  
  // Get user's assessment results
  getUserAssessments: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const q = query(collection(db, 'assessments'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const assessments = [];
      querySnapshot.forEach((doc) => {
        assessments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return assessments;
    } catch (error) {
      console.error('Error getting user assessments:', error);
      throw error;
    }
  },
  
  // Get a specific assessment by ID
  getAssessmentById: async (assessmentId) => {
    try {
      if (!assessmentId) return null;
      
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Get the assessment document from Firestore
      const assessmentRef = doc(db, 'assessments', assessmentId);
      const assessmentDoc = await getDoc(assessmentRef);
      
      if (assessmentDoc.exists()) {
        const assessmentData = assessmentDoc.data();
        
        // Check if questions exist and have explanations
        if (assessmentData.questions && assessmentData.questions.length > 0) {
          // Make sure each question has all required fields including explanation
          assessmentData.questions = assessmentData.questions.map(q => {
            // Ensure the question has an explanation field, even if it's empty
            if (!q.explanation) {
              q.explanation = 'No explanation available for this question.';
            }
            return q;
          });
        }
        
        // Return the assessment data with its ID
        return {
          id: assessmentDoc.id,
          ...assessmentData
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting assessment by ID:', error);
      return null;
    }
  },
  
  // Save / update the signed-in user's profile (e.g. grade level).
  // Merges into the existing users/{uid} document.
  saveUserProfile: async (data) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || data.displayName || 'Student',
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  },

  // Get user profile data
  getUserProfile: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Get user document from Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      // If user document exists in Firestore, return that data
      if (userDoc.exists()) {
        return {
          uid: user.uid,
          displayName: user.displayName || 'Student',
          email: user.email,
          ...userDoc.data()
        };
      }
      
      // Otherwise return basic auth data
      return {
        uid: user.uid,
        displayName: user.displayName || 'Student',
        email: user.email
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      // Return basic info from auth if Firestore fails
      const user = auth.currentUser;
      return user ? {
        displayName: user.displayName || 'Student',
        email: user.email
      } : null;
    }
  },
  
  // Get assessment questions for a specific subject
  getAssessmentQuestions: async (subjectId) => {
    try {
      if (!subjectId) throw new Error('Subject ID is required');
      
      // First try to get questions from Firestore
      const q = query(collection(db, 'questions'), where('subjectId', '==', subjectId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const questions = [];
        querySnapshot.forEach((doc) => {
          questions.push({
            id: doc.id,
            ...doc.data()
          });
        });
        return questions;
      }
      
      // If no questions found in Firestore, return the default questions
      // This is a fallback for subjects that don't have custom questions in the database
      return defaultQuestions[subjectId] || [];
    } catch (error) {
      console.error('Error getting assessment questions:', error);
      // Return default questions as fallback
      return defaultQuestions[subjectId] || [];
    }
  },
  
  // Get specific assessment questions by their IDs
  getAssessmentQuestionsById: async (subjectId, questionIds) => {
    try {
      if (!subjectId) throw new Error('Subject ID is required');
      if (!questionIds || questionIds.length === 0) return [];
      
      // Try to get the specific questions from Firestore
      const questions = [];
      
      // First try to get questions directly by their IDs
      for (const questionId of questionIds) {
        const questionRef = doc(db, 'questions', questionId);
        const questionDoc = await getDoc(questionRef);
        
        if (questionDoc.exists()) {
          questions.push({
            id: questionDoc.id,
            ...questionDoc.data()
          });
        }
      }
      
      // If we found all questions, return them
      if (questions.length === questionIds.length) {
        return questions;
      }
      
      // If we couldn't find all questions by direct ID lookup,
      // try to get questions from the subject collection and filter by IDs
      const q = query(collection(db, 'questions'), where('subjectId', '==', subjectId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const allSubjectQuestions = [];
        querySnapshot.forEach((doc) => {
          if (questionIds.includes(doc.id)) {
            allSubjectQuestions.push({
              id: doc.id,
              ...doc.data()
            });
          }
        });
        
        // If we found any matching questions, return them
        if (allSubjectQuestions.length > 0) {
          return allSubjectQuestions;
        }
      }
      
      // If we still couldn't find the questions, use default questions as fallback
      // but only return those that match the IDs we're looking for
      const defaultSubjectQuestions = defaultQuestions[subjectId] || [];
      return defaultSubjectQuestions.filter(q => questionIds.includes(q.id));
    } catch (error) {
      console.error('Error getting specific assessment questions:', error);
      // Return matching default questions as fallback
      const defaultSubjectQuestions = defaultQuestions[subjectId] || [];
      return defaultSubjectQuestions.filter(q => questionIds.includes(q.id));
    }
  },
};

// Helper function to handle Firebase errors
const handleFirebaseError = (error) => {
  let message = 'An error occurred. Please try again.';
  
  switch (error.code) {
    case 'auth/email-already-in-use':
      message = 'This email is already in use.';
      break;
    case 'auth/invalid-email':
      message = 'Invalid email address.';
      break;
    case 'auth/weak-password':
      message = 'Password is too weak. It should be at least 6 characters.';
      break;
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      message = 'Invalid email or password.';
      break;
    case 'auth/too-many-requests':
      message = 'Too many failed login attempts. Please try again later.';
      break;
    default:
      message = error.message || 'An error occurred. Please try again.';
  }
  
  return { code: error.code, message };
};

export default firebaseService;
