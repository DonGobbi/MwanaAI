import { doc, collection, addDoc, getDocs, query, where, deleteDoc, writeBatch } from 'firebase/firestore';

/**
 * Test data for MwanaAI demo
 * 
 * This file contains sample data for testing and demonstrating
 * the AI features of the MwanaAI platform.
 */

// Sample subjects
export const subjects = [
  {
    id: 'subject-math-01',
    name: 'Mathematics',
    description: 'Explore numbers, shapes, patterns, and logical relationships',
    grade: '9-12',
    icon: 'math-icon',
    color: '#4285F4',
    popularity: 95
  },
  {
    id: 'subject-biology-01',
    name: 'Biology',
    description: 'Study of living organisms and their interactions with each other and the environment',
    grade: '9-12',
    icon: 'biology-icon',
    color: '#0F9D58',
    popularity: 87
  },
  {
    id: 'subject-history-01',
    name: 'History',
    description: 'Examination of past events, civilizations, and their impact on the modern world',
    grade: '9-12',
    icon: 'history-icon',
    color: '#DB4437',
    popularity: 78
  }
];

// Sample topics for Mathematics
export const mathTopics = [
  {
    id: 'topic-math-algebra-01',
    name: 'Algebra',
    description: 'Study of mathematical symbols and the rules for manipulating these symbols',
    subjectId: 'subject-math-01',
    conceptCount: 15,
    difficulty: 'intermediate'
  },
  {
    id: 'topic-math-geometry-01',
    name: 'Geometry',
    description: 'Study of shapes, sizes, relative positions of figures, and properties of space',
    subjectId: 'subject-math-01',
    conceptCount: 12,
    difficulty: 'intermediate'
  },
  {
    id: 'topic-math-calculus-01',
    name: 'Calculus',
    description: 'Study of continuous change and its applications',
    subjectId: 'subject-math-01',
    conceptCount: 18,
    difficulty: 'advanced'
  }
];

// Sample topics for Biology
export const biologyTopics = [
  {
    id: 'topic-biology-cells-01',
    name: 'Cell Biology',
    description: 'Study of cells, their structure, function, and the life processes they perform',
    subjectId: 'subject-biology-01',
    conceptCount: 14,
    difficulty: 'intermediate'
  },
  {
    id: 'topic-biology-genetics-01',
    name: 'Genetics',
    description: 'Study of genes, genetic variation, and heredity in living organisms',
    subjectId: 'subject-biology-01',
    conceptCount: 16,
    difficulty: 'advanced'
  },
  {
    id: 'topic-biology-ecology-01',
    name: 'Ecology',
    description: 'Study of interactions among organisms and their environment',
    subjectId: 'subject-biology-01',
    conceptCount: 13,
    difficulty: 'intermediate'
  }
];

// Sample topics for History
export const historyTopics = [
  {
    id: 'topic-history-ancient-01',
    name: 'Ancient Civilizations',
    description: 'Study of the earliest human societies and their development',
    subjectId: 'subject-history-01',
    conceptCount: 15,
    difficulty: 'intermediate'
  },
  {
    id: 'topic-history-world-wars-01',
    name: 'World Wars',
    description: 'Examination of the global conflicts of the 20th century',
    subjectId: 'subject-history-01',
    conceptCount: 17,
    difficulty: 'intermediate'
  },
  {
    id: 'topic-history-modern-01',
    name: 'Modern History',
    description: 'Study of recent historical events and their impact on contemporary society',
    subjectId: 'subject-history-01',
    conceptCount: 12,
    difficulty: 'intermediate'
  }
];

// Sample user data
export const sampleUser = {
  id: 'user-test-01',
  name: 'Alex Student',
  email: 'alex@example.com',
  grade: '10',
  learningStyle: 'visual',
  interests: ['mathematics', 'computer science', 'music'],
  goals: ['Improve math skills', 'Prepare for college entrance exams'],
  createdAt: new Date('2023-01-15')
};

// Sample learning activities
export const sampleLearningActivities = [
  {
    id: 'activity-01',
    userId: 'user-test-01',
    type: 'video_watched',
    subjectId: 'subject-math-01',
    topicId: 'topic-math-algebra-01',
    timeSpent: 1250, // in seconds
    completed: true,
    timestamp: new Date('2023-08-15T14:30:00')
  },
  {
    id: 'activity-02',
    userId: 'user-test-01',
    type: 'quiz_completed',
    subjectId: 'subject-math-01',
    topicId: 'topic-math-algebra-01',
    score: 85,
    timeSpent: 900, // in seconds
    completed: true,
    timestamp: new Date('2023-08-15T15:00:00')
  },
  {
    id: 'activity-03',
    userId: 'user-test-01',
    type: 'concept_learned',
    subjectId: 'subject-math-01',
    topicId: 'topic-math-algebra-01',
    conceptId: 'concept-algebra-equations-01',
    timeSpent: 600, // in seconds
    completed: true,
    timestamp: new Date('2023-08-16T10:15:00')
  },
  {
    id: 'activity-04',
    userId: 'user-test-01',
    type: 'resource_viewed',
    subjectId: 'subject-biology-01',
    topicId: 'topic-biology-cells-01',
    resourceId: 'resource-cells-structure-01',
    timeSpent: 1800, // in seconds
    completed: true,
    timestamp: new Date('2023-08-17T13:45:00')
  },
  {
    id: 'activity-05',
    userId: 'user-test-01',
    type: 'assessment_completed',
    subjectId: 'subject-biology-01',
    topicId: 'topic-biology-cells-01',
    assessmentId: 'assessment-cells-01',
    score: 72,
    timeSpent: 1500, // in seconds
    completed: true,
    timestamp: new Date('2023-08-17T14:30:00')
  }
];

// Sample AI tutor conversations
export const sampleTutorConversations = [
  {
    id: 'conversation-01',
    userId: 'user-test-01',
    subjectId: 'subject-math-01',
    topicId: 'topic-math-algebra-01',
    title: 'Help with Quadratic Equations',
    messages: [
      {
        id: 'msg-01',
        role: 'user',
        content: 'I\'m having trouble understanding how to solve quadratic equations.',
        timestamp: new Date('2023-08-18T09:30:00')
      },
      {
        id: 'msg-02',
        role: 'assistant',
        content: 'I\'d be happy to help you with quadratic equations! These are equations in the form ax² + bx + c = 0, where a, b, and c are constants and a ≠ 0. There are several methods to solve them: factoring, completing the square, and using the quadratic formula. Which part are you struggling with specifically?',
        timestamp: new Date('2023-08-18T09:30:15')
      },
      {
        id: 'msg-03',
        role: 'user',
        content: 'I don\'t understand when to use the quadratic formula versus factoring.',
        timestamp: new Date('2023-08-18T09:31:00')
      },
      {
        id: 'msg-04',
        role: 'assistant',
        content: 'That\'s a great question! Here\'s a simple guideline:\n\n1. **Try factoring first** if the equation looks "nice" (has integer coefficients that are small). For example, x² + 5x + 6 = 0 can be factored as (x + 2)(x + 3) = 0.\n\n2. **Use the quadratic formula** when factoring is difficult or impossible. The formula works for ALL quadratic equations: x = (-b ± √(b² - 4ac)) / 2a.\n\nWould you like to try a few examples together?',
        timestamp: new Date('2023-08-18T09:31:30')
      }
    ],
    createdAt: new Date('2023-08-18T09:30:00'),
    updatedAt: new Date('2023-08-18T09:31:30')
  }
];

// Sample generated content
export const sampleGeneratedContent = [
  {
    id: 'content-01',
    userId: 'user-test-01',
    subjectId: 'subject-math-01',
    topicId: 'topic-math-algebra-01',
    type: 'notes',
    title: 'Quadratic Equations Summary',
    content: `# Quadratic Equations

A quadratic equation is a second-degree polynomial equation in a single variable x:

ax² + bx + c = 0

Where a, b, and c are constants, and a ≠ 0.

## Solving Methods

### 1. Factoring
If the quadratic expression can be factored, we can write:
(px + q)(rx + s) = 0

This means either px + q = 0 or rx + s = 0, giving us our solutions.

### 2. Quadratic Formula
For any quadratic equation ax² + bx + c = 0:

x = (-b ± √(b² - 4ac)) / 2a

### 3. Completing the Square
Rearrange the equation to:
x² + (b/a)x = -c/a
Add (b/2a)² to both sides:
x² + (b/a)x + (b/2a)² = -c/a + (b/2a)²
Simplify the left side:
(x + b/2a)² = (b² - 4ac) / 4a²
Solve for x:
x = -b/2a ± √(b² - 4ac) / 2a

## Discriminant
The expression b² - 4ac is called the discriminant and tells us about the nature of the solutions:
- If b² - 4ac > 0: Two distinct real solutions
- If b² - 4ac = 0: One repeated real solution
- If b² - 4ac < 0: Two complex conjugate solutions`,
    createdAt: new Date('2023-08-18T10:15:00')
  },
  {
    id: 'content-02',
    userId: 'user-test-01',
    subjectId: 'subject-math-01',
    topicId: 'topic-math-algebra-01',
    type: 'quiz',
    title: 'Quadratic Equations Practice Quiz',
    content: `[
      {
        "question": "Solve the quadratic equation: x² - 5x + 6 = 0",
        "options": ["x = 2, x = 3", "x = -2, x = -3", "x = 2, x = -3", "x = -2, x = 3"],
        "correctAnswer": "x = 2, x = 3",
        "explanation": "Factoring x² - 5x + 6 = 0 gives (x - 2)(x - 3) = 0, so x = 2 or x = 3."
      },
      {
        "question": "What is the discriminant of the equation 2x² - 4x + 7 = 0?",
        "options": ["16", "-40", "40", "-56"],
        "correctAnswer": "-40",
        "explanation": "For ax² + bx + c = 0, the discriminant is b² - 4ac. Here, a = 2, b = -4, c = 7, so the discriminant is (-4)² - 4(2)(7) = 16 - 56 = -40."
      },
      {
        "question": "How many real solutions does the equation x² + 4x + 5 = 0 have?",
        "options": ["0", "1", "2", "Infinite"],
        "correctAnswer": "0",
        "explanation": "The discriminant is b² - 4ac = 4² - 4(1)(5) = 16 - 20 = -4. Since the discriminant is negative, there are no real solutions."
      }
    ]`,
    createdAt: new Date('2023-08-18T11:30:00')
  }
];

// Sample assessments
export const sampleAssessments = [
  {
    id: 'assessment-01',
    userId: 'user-test-01',
    subjectId: 'subject-math-01',
    topicId: 'topic-math-algebra-01',
    type: 'quiz',
    title: 'Algebra Fundamentals Quiz',
    questions: [
      {
        id: 'q1',
        text: 'Solve for x: 2x + 5 = 15',
        options: ['x = 5', 'x = 10', 'x = 7.5', 'x = 5.5'],
        correctAnswer: 'x = 5'
      },
      {
        id: 'q2',
        text: 'Simplify: 3(2x - 4) + 5',
        options: ['6x - 12 + 5', '6x - 7', '6x - 12', '6x + 5'],
        correctAnswer: '6x - 7'
      },
      {
        id: 'q3',
        text: 'Factor: x² - 9',
        options: ['(x - 3)(x + 3)', '(x - 9)(x + 1)', '(x - 3)²', '(x + 3)²'],
        correctAnswer: '(x - 3)(x + 3)'
      }
    ],
    createdAt: new Date('2023-08-19T09:00:00')
  }
];

// Sample assessment results
export const sampleAssessmentResults = [
  {
    id: 'result-01',
    userId: 'user-test-01',
    assessmentId: 'assessment-01',
    score: 67,
    answers: [
      {
        questionId: 'q1',
        selectedAnswer: 'x = 5',
        isCorrect: true
      },
      {
        questionId: 'q2',
        selectedAnswer: '6x - 12',
        isCorrect: false
      },
      {
        questionId: 'q3',
        selectedAnswer: '(x - 3)(x + 3)',
        isCorrect: true
      }
    ],
    feedback: 'Good work on algebraic equations and factoring. Review the distributive property and combining like terms.',
    completedAt: new Date('2023-08-19T09:15:00')
  }
];

// Sample knowledge graph
export const sampleKnowledgeGraph = {
  id: 'graph-01',
  subjectId: 'subject-math-01',
  topicId: 'topic-math-algebra-01',
  concepts: [
    {
      name: 'Variable',
      description: 'A symbol (usually a letter) that represents an unknown value.',
      difficulty: 'beginner',
      prerequisites: []
    },
    {
      name: 'Expression',
      description: 'A combination of variables, numbers, and operations that represents a value.',
      difficulty: 'beginner',
      prerequisites: ['Variable']
    },
    {
      name: 'Equation',
      description: 'A statement that two expressions are equal.',
      difficulty: 'beginner',
      prerequisites: ['Expression']
    },
    {
      name: 'Linear Equation',
      description: 'An equation where the variable has an exponent of 1.',
      difficulty: 'intermediate',
      prerequisites: ['Equation']
    },
    {
      name: 'Quadratic Equation',
      description: 'An equation where the highest exponent of the variable is 2.',
      difficulty: 'intermediate',
      prerequisites: ['Equation']
    }
  ],
  relationships: [
    {
      source: 'Variable',
      target: 'Expression',
      type: 'component of',
      strength: 0.9
    },
    {
      source: 'Expression',
      target: 'Equation',
      type: 'component of',
      strength: 0.9
    },
    {
      source: 'Equation',
      target: 'Linear Equation',
      type: 'generalizes',
      strength: 0.8
    },
    {
      source: 'Equation',
      target: 'Quadratic Equation',
      type: 'generalizes',
      strength: 0.8
    }
  ],
  createdAt: new Date('2023-08-15T08:30:00'),
  updatedAt: new Date('2023-08-15T08:30:00')
};


// Helper function to add test data to Firestore
export const populateTestData = async (db) => {
  const batch = writeBatch(db);
  
  // Add subjects
  subjects.forEach(subject => {
    const subjectRef = doc(db, 'subjects', subject.id);
    batch.set(subjectRef, subject);
  });
  
  // Add topics
  const allTopics = [...mathTopics, ...biologyTopics, ...historyTopics];
  allTopics.forEach(topic => {
    const topicRef = doc(db, 'topics', topic.id);
    batch.set(topicRef, topic);
  });
  
  // Add user
  const userRef = doc(db, 'users', sampleUser.id);
  batch.set(userRef, sampleUser);
  
  // Commit the batch
  await batch.commit();
  
  console.log('Test data populated successfully!');
};
