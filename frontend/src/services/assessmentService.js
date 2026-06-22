// Assessment Service for MwanaAI
// Handles assessment-related functionality

import { mockAssessments, mockAssessmentQuestions } from '../mocks/assessmentMocks';

// --- Mock Data ---
const MOCK_LATEST_ASSESSMENT = {
  id: 'assessment-123',
  subject: 'Mathematics',
  level: 'Intermediate',
  date: new Date().toISOString(),
  score: 75,
  scorePercentage: 75,
  totalQuestions: 20,
  correctAnswers: 15,
  timeSpent: '25 minutes',
  status: 'completed',
  subjectName: 'Mathematics',
  questions: [
    {
      id: 'q1',
      question: 'What is the solution to the equation 2x + 5 = 15?',
      options: ['x = 5', 'x = 10', 'x = 7.5', 'x = 3'],
      correctAnswer: 'x = 5',
      userAnswer: 'x = 5',
      isCorrect: true,
      explanation: 'To solve 2x + 5 = 15, subtract 5 from both sides to get 2x = 10, then divide by 2 to get x = 5.'
    },
    {
      id: 'q2',
      question: 'Find the area of a circle with radius 4 units.',
      options: ['16π square units', '8π square units', '4π square units', '12π square units'],
      correctAnswer: '16π square units',
      userAnswer: '8π square units',
      isCorrect: false,
      explanation: 'The area of a circle is πr², where r is the radius. So with r = 4, the area is π(4)² = 16π square units.'
    },
    {
      id: 'q3',
      question: 'Simplify the expression: 3(2x - 4) + 5',
      options: ['6x - 12 + 5', '6x - 7', '6x - 12', '6x + 5'],
      correctAnswer: '6x - 7',
      userAnswer: '6x - 7',
      isCorrect: true,
      explanation: '3(2x - 4) + 5 = 6x - 12 + 5 = 6x - 7'
    }
  ]
};

/**
 * Fetches all assessments for the current user
 */
async function getAssessments() {
  // In a real app, this would make an API call
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockAssessments);
    }, 500);
  });
}

/**
 * Fetches the latest assessment for the current user
 */
async function getLatestAssessment() {
  // In a real app, this would make an API call
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_LATEST_ASSESSMENT);
    }, 500);
  });
}

/**
 * Fetches questions for a specific assessment
 */
async function getAssessmentQuestions(assessmentId) {
  // In a real app, this would make an API call
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockAssessmentQuestions[assessmentId] || []);
    }, 500);
  });
}

/**
 * Submits an assessment
 */
async function submitAssessment(assessmentData) {
  // In a real app, this would make an API call
  // For now, simulate a successful submission
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Assessment submitted successfully',
        assessmentId: 'new-assessment-id',
        score: Math.floor(Math.random() * 100),
      });
    }, 1000);
  });
}

const assessmentService = {
  getAssessments,
  getLatestAssessment,
  getAssessmentQuestions,
  submitAssessment,
};

export {
  getAssessments,
  getLatestAssessment,
  getAssessmentQuestions,
  submitAssessment,
};

export default assessmentService;
