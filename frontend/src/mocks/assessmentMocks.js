// Mock data for assessments

// Mock assessments list
export const mockAssessments = [
  {
    id: 'assessment-123',
    subject: 'Mathematics',
    level: 'Intermediate',
    date: '2023-11-01T14:30:00Z',
    score: 75,
    totalQuestions: 20,
    correctAnswers: 15,
    timeSpent: '25 minutes',
    status: 'completed'
  },
  {
    id: 'assessment-124',
    subject: 'Science',
    level: 'Beginner',
    date: '2023-10-25T10:15:00Z',
    score: 82,
    totalQuestions: 15,
    correctAnswers: 12,
    timeSpent: '18 minutes',
    status: 'completed'
  },
  {
    id: 'assessment-125',
    subject: 'History',
    level: 'Advanced',
    date: '2023-10-15T09:00:00Z',
    score: 68,
    totalQuestions: 25,
    correctAnswers: 17,
    timeSpent: '35 minutes',
    status: 'completed'
  }
];

// Mock assessment questions
export const mockAssessmentQuestions = {
  'assessment-123': [
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
    },
    {
      id: 'q4',
      question: 'If f(x) = 2x² - 3x + 1, find f(2).',
      options: ['3', '5', '7', '9'],
      correctAnswer: '5',
      userAnswer: '5',
      isCorrect: true,
      explanation: 'f(2) = 2(2)² - 3(2) + 1 = 2(4) - 6 + 1 = 8 - 6 + 1 = 3'
    },
    {
      id: 'q5',
      question: 'Solve the inequality: 3x - 7 > 2',
      options: ['x > 3', 'x > 9/3', 'x < 3', 'x > 2'],
      correctAnswer: 'x > 3',
      userAnswer: 'x > 3',
      isCorrect: true,
      explanation: 'To solve 3x - 7 > 2, add 7 to both sides: 3x > 9, then divide by 3: x > 3'
    }
  ],
  'assessment-124': [
    {
      id: 'q1',
      question: 'Which of the following is NOT a state of matter?',
      options: ['Solid', 'Liquid', 'Gas', 'Energy'],
      correctAnswer: 'Energy',
      userAnswer: 'Energy',
      isCorrect: true,
      explanation: 'The three common states of matter are solid, liquid, and gas. Plasma is sometimes considered a fourth state. Energy is a form of power, not a state of matter.'
    },
    {
      id: 'q2',
      question: 'What is the chemical symbol for gold?',
      options: ['Go', 'Au', 'Ag', 'Gd'],
      correctAnswer: 'Au',
      userAnswer: 'Au',
      isCorrect: true,
      explanation: 'The chemical symbol for gold is Au, which comes from the Latin word "aurum" meaning gold.'
    },
    {
      id: 'q3',
      question: 'Which planet is closest to the Sun?',
      options: ['Venus', 'Earth', 'Mercury', 'Mars'],
      correctAnswer: 'Mercury',
      userAnswer: 'Venus',
      isCorrect: false,
      explanation: 'Mercury is the closest planet to the Sun in our solar system.'
    }
  ],
  'assessment-125': [
    {
      id: 'q1',
      question: 'In which year did World War II end?',
      options: ['1943', '1945', '1947', '1950'],
      correctAnswer: '1945',
      userAnswer: '1945',
      isCorrect: true,
      explanation: 'World War II ended in 1945 with the surrender of Japan following the atomic bombings of Hiroshima and Nagasaki.'
    },
    {
      id: 'q2',
      question: 'Who was the first President of the United States?',
      options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'Benjamin Franklin'],
      correctAnswer: 'George Washington',
      userAnswer: 'George Washington',
      isCorrect: true,
      explanation: 'George Washington was the first President of the United States, serving from 1789 to 1797.'
    },
    {
      id: 'q3',
      question: 'The Renaissance period began in which country?',
      options: ['France', 'England', 'Italy', 'Spain'],
      correctAnswer: 'Italy',
      userAnswer: 'France',
      isCorrect: false,
      explanation: 'The Renaissance began in Italy in the late 14th century before spreading to the rest of Europe.'
    }
  ]
};
