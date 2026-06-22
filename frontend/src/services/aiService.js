// AI Service for MwanaAI
// Handles AI-related functionality including generating personalized learning plans

// --- Constants ---
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const EXPLANATION_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_EXPLANATION_MAX_TOKENS = 2048;

// Authentication
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

// --- Exported Functions ---
export const callGroqAPIForAssessment = async (assessmentSummary) => {
  if (!API_KEY) {
    console.warn('No API key found');
    return null;
  }

  try {
    const formattedAssessment = {
      subject: assessmentSummary.subjectName || assessmentSummary.subject,
      level: assessmentSummary.level,
      overallScore: assessmentSummary.scorePercentage,
      questions: assessmentSummary.questions.map((q, i) => ({
        number: i + 1,
        question: q.question,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.userAnswer === q.correctAnswer
      }))
    };

    const systemPrompt = 'You are an educational AI assistant for MwanaAI. Analyze assessment data and generate personalized learning plans. Return response in valid JSON format.';
    
    const userPrompt = `Based on this assessment: ${JSON.stringify(formattedAssessment)}, generate a learning plan with:
    1. weakTopics: Array of {name: string, score: number} for topics needing improvement
    2. strengths: Array of {name: string, score: number} for well-understood topics
    3. learningPath: Array of {title: string, description: string, duration: string} for recommended steps
    4. recommendedResources: Array of {title: string, type: string, link: string, description: string}
    5. estimatedTimeToMastery: string
    6. nextSteps: string (detailed guidance)`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in assessment API call:', error);
    throw error;
  }
};

// --- Core AI Features ---

/**
 * Generate personalized learning path
 */
async function generateLearningPath(userId, subject, topic, currentLevel) {
  try {
    const prompt = `Create a personalized learning path for a student studying ${subject}, specifically ${topic}.
                     Level: ${currentLevel}
                     
                     Include:
                     1. Learning objectives
                     2. Key concepts to master
                     3. Step-by-step progression
                     4. Practice exercises
                     5. Assessment checkpoints
                     6. Estimated time requirements
                     
                     Format as a structured plan with clear sections.`;

    const response = await callGroqAPI([
      {
        role: 'system',
        content:
          'You are an expert educational planner specializing in creating personalized learning paths aligned with the Malawi curriculum.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return response;
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw new Error('Failed to generate learning path');
  }
}

/**
 * Generate AI-powered tutoring response
 */
async function generateTutoringResponse(
  subject,
  topic,
  question,
  context = []
) {
  try {
    const systemPrompt = `You are an expert tutor in ${subject}, specifically teaching about ${topic}.
                          Your goal is to explain concepts clearly using examples relevant to Malawian students.
                          Break down complex ideas into simple steps and encourage critical thinking.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context,
      { role: 'user', content: question },
    ];

    const response = await callGroqAPI(messages);
    return response;
  } catch (error) {
    console.error('Error generating tutoring response:', error);
    throw new Error('Failed to generate tutoring response');
  }
}

/**
 * Generate and grade assessment
 */
async function generateAssessment(
  subject,
  topic,
  difficulty = 'medium',
  questionCount = 5
) {
  try {
    const prompt = `Create a ${difficulty} difficulty assessment for ${topic} in ${subject} with ${questionCount} questions.
                     Include for each question:
                     1. Question text
                     2. Multiple choice options (A-D)
                     3. Correct answer
                     4. Detailed explanation
                     5. Key concepts tested
                     
                     Format the response as a structured assessment.`;

    const response = await callGroqAPI([
      {
        role: 'system',
        content:
          'You are an expert assessment creator specializing in educational content aligned with the Malawi curriculum.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return response;
  } catch (error) {
    console.error('Error generating assessment:', error);
    throw new Error('Failed to generate assessment');
  }
}

/**
 * Call Groq API with proper error handling
 */
async function callGroqAPI(messages, model = DEFAULT_MODEL) {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
      }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}

// --- Helper Functions ---

/**
 * Extracts topic from question text using keyword matching
 */
function extractTopicFromQuestion(question) {
  const text = question.text || question.question || '';
  const topicKeywords = {
    Algebra: /equation|algebra|variable|polynomial|factor|simplify/i,
    Geometry: /triangle|circle|angle|polygon|geometry|shape|area|volume/i,
    'Statistics & Probability':
      /statistic|probability|data|chance|likelihood|random/i,
    'Functions & Graphs': /function|graph|coordinate|plot|slope|intercept/i,
    Biology: /cell|organism|biology|ecosystem|plant|animal/i,
    Chemistry: /chemical|element|compound|reaction|molecule|atom/i,
    Physics: /force|motion|energy|physics|gravity|momentum/i,
    History: /history|civilization|war|empire|revolution|century/i,
  };
  for (const [topic, regex] of Object.entries(topicKeywords)) {
    if (text.match(regex)) return topic;
  }
  return 'General Knowledge';
}

/**
 * Analyzes questions and answers to identify weak topics.
 */
function analyzeWeakTopics(questions, answers) {
  const topicPerformance = {};
  questions.forEach((question) => {
    const topic = extractTopicFromQuestion(question);
    if (!topicPerformance[topic])
      topicPerformance[topic] = { correct: 0, total: 0 };
    const isCorrect = answers[question.id] === question.correctAnswer;
    topicPerformance[topic].total++;
    if (isCorrect) topicPerformance[topic].correct++;
  });
  return Object.entries(topicPerformance)
    .filter(([, { correct, total }]) => (correct / total) * 100 < 70)
    .map(([name, { correct, total }]) => ({
      name,
      score: (correct / total) * 100,
      questionsCount: total,
      correctCount: correct,
    }));
}

/**
 * Analyzes questions and answers to identify strengths.
 */
function analyzeStrengths(questions, answers) {
  const topicPerformance = {};
  questions.forEach((question) => {
    const topic = extractTopicFromQuestion(question);
    if (!topicPerformance[topic])
      topicPerformance[topic] = { correct: 0, total: 0 };
    const isCorrect = answers[question.id] === question.correctAnswer;
    topicPerformance[topic].total++;
    if (isCorrect) topicPerformance[topic].correct++;
  });
  return Object.entries(topicPerformance)
    .filter(([, { correct, total }]) => (correct / total) * 100 >= 80)
    .map(([name, { correct, total }]) => ({
      name,
      score: (correct / total) * 100,
      questionsCount: total,
      correctCount: correct,
    }));
}

/**
 * Generates a basic learning path based on subject, level, and weak topics.
 * This is the legacy implementation.
 */
function generateBasicLearningPath(subject, level, weakTopics) {
  const standardModules = getStandardModules(subject, level);
  if (!weakTopics.length) return standardModules;
  const weakTopicNames = weakTopics.map((t) => t.name);
  const advancedModules = getAdvancedModules(subject);
  const specializedModules = advancedModules.filter((module) =>
    weakTopicNames.some(
      (topic) =>
        module.title.includes(topic) || module.description.includes(topic)
    )
  );
  return [...specializedModules, ...standardModules].slice(0, 5);
}

/**
 * Returns standard modules for a given subject and level.
 */
function getStandardModules(subject, level) {
  const subjectLower = (subject || '').toLowerCase();
  const levelLower = (level || '').toLowerCase();

  const modules = {
    mathematics: {
      beginner: [
        {
          title: 'Basic Arithmetic',
          description:
            'Master addition, subtraction, multiplication, and division',
        },
        {
          title: 'Introduction to Fractions',
          description: 'Understanding fractions and basic operations',
        },
      ],
      intermediate: [
        {
          title: 'Algebra Fundamentals',
          description: 'Solving equations and understanding variables',
        },
        {
          title: 'Geometry Basics',
          description:
            'Understanding shapes, angles, and spatial relationships',
        },
      ],
      advanced: [
        {
          title: 'Pre-Calculus',
          description:
            'Preparing for calculus with advanced functions and trigonometry',
        },
        {
          title: 'Statistics',
          description: 'Data analysis and probability concepts',
        },
      ],
    },
    science: {
      beginner: [
        {
          title: 'Scientific Method',
          description: 'Understanding the process of scientific inquiry',
        },
        {
          title: 'Basic Biology',
          description: 'Introduction to living organisms and their systems',
        },
      ],
      intermediate: [
        {
          title: 'Chemistry Fundamentals',
          description: 'Understanding atoms, molecules, and chemical reactions',
        },
        {
          title: 'Physics Principles',
          description: 'Basic laws of motion and energy',
        },
      ],
      advanced: [
        {
          title: 'Advanced Biology',
          description: 'Cellular processes and genetics',
        },
        {
          title: 'Environmental Science',
          description: 'Understanding ecosystems and human impact',
        },
      ],
    },
    history: {
      beginner: [
        {
          title: 'World History Overview',
          description: 'Major events and periods in global history',
        },
        {
          title: 'Ancient Civilizations',
          description: 'Early human societies and their developments',
        },
      ],
      intermediate: [
        {
          title: 'Medieval Period',
          description: 'Understanding the Middle Ages and feudal systems',
        },
        {
          title: 'Modern History',
          description:
            'Events and developments from the Renaissance to present day',
        },
      ],
      advanced: [
        {
          title: 'Historical Analysis',
          description:
            'Critical examination of historical sources and interpretations',
        },
        {
          title: 'Specialized History Topics',
          description:
            'In-depth study of specific historical periods or themes',
        },
      ],
    },
  };

  // Default modules if subject or level not found
  const defaultModules = [
    {
      title: 'Learning Strategies',
      description: 'Effective approaches to mastering new content',
    },
    {
      title: 'Study Skills',
      description: 'Techniques for effective learning and retention',
    },
  ];

  // Try to match the subject and level, with fallbacks
  return (
    modules[subjectLower]?.[levelLower] ||
    modules[subjectLower]?.intermediate ||
    modules.mathematics?.beginner ||
    defaultModules
  );
}

/**
 * Returns advanced modules for a given subject.
 */
function getAdvancedModules(subject) {
  const subjectLower = (subject || '').toLowerCase();

  const advancedModules = {
    mathematics: [
      {
        title: 'Calculus',
        description: 'Advanced mathematical analysis of change and motion',
      },
      {
        title: 'Linear Algebra',
        description: 'Study of vectors, matrices, and linear transformations',
      },
      {
        title: 'Discrete Mathematics',
        description: 'Mathematical structures that are fundamentally discrete',
      },
      {
        title: 'Number Theory',
        description: 'Properties and relationships of numbers',
      },
    ],
    science: [
      {
        title: 'Quantum Physics',
        description: 'Study of matter and energy at the quantum level',
      },
      {
        title: 'Molecular Biology',
        description: 'Study of biological activity at the molecular level',
      },
      {
        title: 'Organic Chemistry',
        description: 'Study of carbon-based compounds and their reactions',
      },
      {
        title: 'Astrophysics',
        description: 'Physics of astronomical objects and the universe',
      },
    ],
    history: [
      {
        title: 'Historiography',
        description: 'Study of historical writing and methods',
      },
      {
        title: 'Comparative History',
        description:
          'Analysis of similarities and differences across historical periods',
      },
      {
        title: 'Economic History',
        description: 'Study of economies and economic phenomena of the past',
      },
      {
        title: 'Cultural History',
        description:
          'Study of cultural interpretation and expression throughout history',
      },
    ],
  };

  return advancedModules[subjectLower] || [];
}

/**
 * Generates recommended resources based on subject, level, and weak topics.
 */
function generateRecommendedResources(subject, level, weakTopics) {
  const standardResources = getStandardResources(subject, level);
  if (!weakTopics.length) return standardResources;
  const weakTopicNames = weakTopics.map((t) => t.name);
  let resources = standardResources.filter((resource) =>
    weakTopicNames.some(
      (topic) =>
        resource.title.includes(topic) || resource.description.includes(topic)
    )
  );
  if (resources.length < 3) {
    resources = [
      ...resources,
      ...standardResources.filter(
        (r) => !resources.some((existing) => existing.title === r.title)
      ),
    ];
  }
  return resources.slice(0, 6);
}

/**
 * Returns standard resources for a given subject and level.
 */
function getStandardResources(subject, level) {
  const subjectLower = (subject || '').toLowerCase();
  const levelLower = (level || '').toLowerCase();

  const resources = {
    mathematics: {
      beginner: [
        {
          title: 'Basic Math Concepts',
          type: 'Video Series',
          link: '/resources/math-basics',
          description: 'Introduction to fundamental mathematical concepts',
        },
        {
          title: 'Math Practice Problems',
          type: 'Interactive',
          link: '/resources/math-practice',
          description: 'Practice exercises with step-by-step solutions',
        },
      ],
      intermediate: [
        {
          title: 'Algebra Fundamentals',
          type: 'Course',
          link: '/resources/algebra',
          description: 'Comprehensive course on algebraic concepts',
        },
        {
          title: 'Geometry Essentials',
          type: 'Interactive',
          link: '/resources/geometry',
          description: 'Interactive lessons on geometric principles',
        },
      ],
      advanced: [
        {
          title: 'Advanced Calculus',
          type: 'Course',
          link: '/resources/calculus',
          description: 'In-depth study of calculus concepts',
        },
        {
          title: 'Statistics and Probability',
          type: 'Video Series',
          link: '/resources/statistics',
          description: 'Comprehensive coverage of statistical methods',
        },
      ],
    },
    science: {
      beginner: [
        {
          title: 'Introduction to Science',
          type: 'Course',
          link: '/resources/science-intro',
          description: 'Overview of scientific principles and methods',
        },
        {
          title: 'Basic Scientific Concepts',
          type: 'Interactive',
          link: '/resources/science-basics',
          description:
            'Interactive exploration of fundamental science concepts',
        },
      ],
      intermediate: [
        {
          title: 'Biology Essentials',
          type: 'Course',
          link: '/resources/biology',
          description: 'Comprehensive course on biological systems',
        },
        {
          title: 'Chemistry Fundamentals',
          type: 'Interactive',
          link: '/resources/chemistry',
          description: 'Interactive lessons on chemical principles',
        },
      ],
      advanced: [
        {
          title: 'Advanced Physics',
          type: 'Course',
          link: '/resources/physics',
          description: 'In-depth study of physics concepts',
        },
        {
          title: 'Environmental Science',
          type: 'Video Series',
          link: '/resources/environmental',
          description: 'Comprehensive coverage of environmental systems',
        },
      ],
    },
    history: {
      beginner: [
        {
          title: 'Introduction to World History',
          type: 'Course',
          link: '/resources/history-intro',
          description: 'Overview of major historical events and periods',
        },
        {
          title: 'Historical Timeline Explorer',
          type: 'Interactive',
          link: '/resources/history-timeline',
          description: 'Interactive exploration of historical timelines',
        },
      ],
      intermediate: [
        {
          title: 'Ancient Civilizations',
          type: 'Course',
          link: '/resources/ancient-history',
          description: 'Comprehensive course on ancient civilizations',
        },
        {
          title: 'Modern History',
          type: 'Interactive',
          link: '/resources/modern-history',
          description: 'Interactive lessons on modern historical events',
        },
      ],
      advanced: [
        {
          title: 'Specialized Historical Analysis',
          type: 'Course',
          link: '/resources/historical-analysis',
          description: 'In-depth analysis of historical movements and impacts',
        },
        {
          title: 'Cultural History',
          type: 'Video Series',
          link: '/resources/cultural-history',
          description:
            'Comprehensive coverage of cultural developments through history',
        },
      ],
    },
  };

  // Default resources if subject or level not found
  const defaultResources = [
    {
      title: 'Learning Fundamentals',
      type: 'Course',
      link: '/resources/learning-basics',
      description: 'Core concepts to improve your learning in any subject',
    },
    {
      title: 'Study Skills',
      type: 'Interactive',
      link: '/resources/study-skills',
      description: 'Interactive tools to enhance your study effectiveness',
    },
  ];

  // Try to match the subject and level, with fallbacks
  return (
    resources[subjectLower]?.[levelLower] ||
    resources[subjectLower]?.intermediate ||
    resources.mathematics?.beginner ||
    defaultResources
  );
}

/**
 * Generates next steps based on level and weak topics.
 */
function generateNextSteps(level, weakTopics) {
  if (weakTopics.length) {
    return `Focus on strengthening your understanding of ${weakTopics
      .map((t) => t.name)
      .join(
        ', '
      )}. Start with the recommended resources for these topics, then progress through your learning path.`;
  }
  const messages = {
    Beginner:
      'Build a strong foundation by working through the core modules in your learning path.',
    Basic:
      'Continue developing your knowledge by completing the modules in your learning path.',
    Intermediate:
      'Challenge yourself with more complex problems and explore the connections between different topics.',
    Advanced:
      'Deepen your expertise by exploring specialized topics and engaging with advanced resources.',
  };
  return (
    messages[level] ||
    'Work through your personalized learning path and use the recommended resources to strengthen your understanding.'
  );
}

/**
 * Calculates estimated time to reach the next level.
 */
function calculateEstimatedTime(level, weakTopics) {
  const baseTimes = { Beginner: 8, Basic: 12, Intermediate: 16, Advanced: 20 };
  return (baseTimes[level] || 10) + weakTopics.length * 2;
}

// --- Core AI Functions ---

/**
 * Prepares assessment data for the AI.
 */
function prepareAssessmentDataForAI(assessmentData) {
  const {
    subject,
    subjectName,
    scorePercentage,
    level,
    questions,
    userAnswers,
  } = assessmentData;
  const questionSummaries = questions.map((q) => {
    const userAnswer = userAnswers?.[q.id];
    const isCorrect = userAnswer === q.correctAnswer;
    return {
      question: q.question || q.text,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation || '',
    };
  });
  const correctCount = questionSummaries.filter((q) => q.isCorrect).length;
  const overallScore = questionSummaries.length
    ? (correctCount / questionSummaries.length) * 100
    : 0;
  return {
    subject,
    subjectName,
    level,
    scorePercentage: scorePercentage || Math.round(overallScore),
    questions: questionSummaries,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generates a mock learning plan when the AI service is unavailable or fails.
 */
function generateMockLearningPlan(assessmentData) {
  const { subject, level, questions, userAnswers, scorePercentage } =
    assessmentData;

  // Generate weak topics from the answers, or fall back to a mock topic
  let weakTopics = [];
  if (questions && questions.length > 0 && userAnswers) {
    weakTopics = analyzeWeakTopics(questions, userAnswers);
  } else {
    const mockScore =
      typeof scorePercentage === 'number' ? scorePercentage : 60;
    weakTopics = [
      {
        name: subject || 'General Knowledge',
        score: mockScore,
        questionsCount: 5,
        correctCount: Math.round((mockScore / 100) * 5),
      },
    ];
  }

  // Generate strengths similarly
  let strengths = [];
  if (questions && questions.length > 0 && userAnswers) {
    strengths = analyzeStrengths(questions, userAnswers);
  } else {
    // Create a mock strength in a related area
    strengths = [
      {
        name:
          subject === 'Mathematics'
            ? 'Basic Arithmetic'
            : subject === 'Science'
            ? 'Scientific Method'
            : subject === 'History'
            ? 'Modern History'
            : 'Critical Thinking',
        score: 85,
        questionsCount: 3,
        correctCount: 3,
      },
    ];
  }

  return {
    weakTopics,
    strengths,
    learningPath: generateBasicLearningPath(subject, level, weakTopics),
    recommendedResources: generateRecommendedResources(
      subject,
      level,
      weakTopics
    ),
    estimatedTimeToMastery: calculateEstimatedTime(level, weakTopics),
    nextSteps: generateNextSteps(level, weakTopics),
  };
}

/**
 * Generates an AI-powered explanation for a question.
 */
async function generateExplanation(question, userAnswer, correctAnswer) {
  // Use the API key from environment variables
  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  console.log('Using Groq API key:', apiKey ? 'Key exists' : 'Key missing');
  const prompt = `
    Provide a clear, concise explanation for the following question:
    Question: ${question.question || question.text}
    User's Answer: ${userAnswer}
    Correct Answer: ${correctAnswer}
    Explain why the correct answer is right and, if the user's answer is wrong, explain the misconception. Keep it educational, encouraging, and under 150 words.
  `;
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EXPLANATION_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an educational AI assistant that provides clear, helpful explanations for assessment questions.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_EXPLANATION_MAX_TOKENS,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error: ${errorData.error?.message || response.statusText}`
    );
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Parses the AI's JSON response into a learning-plan object.
 * Strips any markdown code fences the model may add. Throws on invalid JSON
 * so callers can fall back to the mock plan.
 */
function parseAIResponse(response) {
  if (!response) {
    throw new Error('Empty AI response');
  }
  const cleaned = response.replace(/```json\s*|\s*```/g, '').trim();
  return JSON.parse(cleaned);
}

// --- Exported Service ---
const aiService = {
  generateExplanation,
  generateLearningPath,
  generateTutoringResponse,
  generateAssessment,
  async generateLearningPlan(assessmentData) {
    if (!assessmentData) throw new Error('No assessment data provided');
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.REACT_APP_GROQ_API_KEY
    ) {
      console.log('Using mock AI service in development mode');
      return generateMockLearningPlan(assessmentData);
    }
    try {
      const assessmentSummary = prepareAssessmentDataForAI(assessmentData);
      const response = await callGroqAPIForAssessment(assessmentSummary);
      return parseAIResponse(response);
    } catch (error) {
      console.error('AI service error:', error);
      return generateMockLearningPlan(assessmentData);
    }
  },
  async testGroqApiConnection() {
    const apiKey = process.env.REACT_APP_GROQ_API_KEY;
    console.log(
      'Testing Groq API connection with key:',
      apiKey ? 'Key exists' : 'Key missing'
    );
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok)
        return {
          success: false,
          message: `API test failed: ${response.status}`,
        };
      return { success: true, message: 'API connection successful' };
    } catch (error) {
      return { success: false, message: `API test error: ${error.message}` };
    }
  },
};

export default aiService;
