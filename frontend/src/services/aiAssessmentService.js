/**
 * AI Assessment Service
 *
 * This service handles the generation, grading, and feedback for
 * educational assessments using AI.
 */

import { db } from '../config/firebase';
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

// API configuration
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const MODEL = 'llama-3.1-8b-instant';

/**
 * Generate an assessment for a specific topic
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - The topic ID
 * @param {object} options - Assessment options
 * @returns {Promise<object>} - The generated assessment
 */
export const generateAssessment = async (subjectId, topicId, options = {}) => {
  try {
    // Get subject and topic data
    const subjectData = await getSubjectData(subjectId);
    const topicData = await getTopicData(topicId);

    // Prepare the prompt for assessment generation
    const prompt = prepareAssessmentPrompt(subjectData, topicData, options);

    // Call the AI API
    const generatedAssessment = await callAIAPI(prompt);

    // Process and structure the assessment
    const processedAssessment = processAssessment(
      generatedAssessment,
      options.type
    );

    // Save the assessment to the database
    const assessmentId = await saveAssessment(
      subjectId,
      topicId,
      processedAssessment
    );

    return {
      id: assessmentId,
      ...processedAssessment,
    };
  } catch (error) {
    console.error('Error generating assessment:', error);
    throw error;
  }
};

/**
 * Grade a student's assessment submission
 * @param {string} assessmentId - The assessment ID
 * @param {object} submission - The student's submission
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - The grading results
 */
export const gradeAssessment = async (assessmentId, submission, userId) => {
  try {
    // Get the assessment
    const assessmentDoc = await getDoc(doc(db, 'assessments', assessmentId));

    if (!assessmentDoc.exists()) {
      throw new Error('Assessment not found');
    }

    const assessment = assessmentDoc.data();

    // Prepare the prompt for grading
    const prompt = prepareGradingPrompt(assessment, submission);

    // Call the AI API
    const gradingResult = await callAIAPI(prompt);

    // Process the grading result
    const processedResult = processGradingResult(
      gradingResult,
      assessment.type
    );

    // Save the result to the database
    const resultId = await saveAssessmentResult(
      assessmentId,
      userId,
      submission,
      processedResult
    );

    return {
      id: resultId,
      ...processedResult,
    };
  } catch (error) {
    console.error('Error grading assessment:', error);
    throw error;
  }
};

/**
 * Get subject data
 * @param {string} subjectId - The subject ID
 * @returns {Promise<object>} - The subject data
 */
const getSubjectData = async (subjectId) => {
  try {
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));

    if (!subjectDoc.exists()) {
      throw new Error('Subject not found');
    }

    return {
      id: subjectId,
      ...subjectDoc.data(),
    };
  } catch (error) {
    console.error('Error getting subject data:', error);
    throw error;
  }
};

/**
 * Get topic data
 * @param {string} topicId - The topic ID
 * @returns {Promise<object>} - The topic data
 */
const getTopicData = async (topicId) => {
  try {
    const topicDoc = await getDoc(doc(db, 'topics', topicId));

    if (!topicDoc.exists()) {
      throw new Error('Topic not found');
    }

    // Get concepts related to this topic
    const conceptsQuery = query(
      collection(db, 'concepts'),
      where('topicId', '==', topicId)
    );

    const conceptsSnapshot = await getDocs(conceptsQuery);
    const concepts = conceptsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      id: topicId,
      ...topicDoc.data(),
      concepts,
    };
  } catch (error) {
    console.error('Error getting topic data:', error);
    throw error;
  }
};

/**
 * Prepare the prompt for assessment generation
 * @param {object} subjectData - The subject data
 * @param {object} topicData - The topic data
 * @param {object} options - Assessment options
 * @returns {object} - The prepared prompt
 */
const prepareAssessmentPrompt = (subjectData, topicData, options) => {
  const { type = 'quiz', difficulty = 'medium', questionCount = 5 } = options;

  // System message that defines the assessment generation behavior
  const systemMessage = {
    role: 'system',
    content: `You are an educational assessment creator for MwanaAI. 
    Your task is to create a high-quality ${type} assessment about ${topicData.name} in ${subjectData.name}.
    
    Assessment guidelines:
    1. Create ${questionCount} questions at ${difficulty} difficulty level.
    2. Ensure questions test understanding, not just memorization.
    3. Cover the key concepts of the topic.
    4. Include a mix of question types appropriate for the subject.
    5. Provide clear, correct answers for each question.
    6. For open-ended questions, include a rubric or scoring guide.`,
  };

  // Add specific instructions based on assessment type
  switch (type) {
    case 'quiz':
      systemMessage.content += `\n\nCreate a multiple-choice quiz with ${questionCount} questions. For each question:
      - Provide a clear question
      - Include 4 options (A, B, C, D)
      - Mark the correct answer
      - Add a brief explanation for why the answer is correct`;
      break;

    case 'essay':
      systemMessage.content += `\n\nCreate ${questionCount} essay questions. For each question:
      - Provide a clear prompt that requires analysis and critical thinking
      - Include expected key points that should be covered in a good answer
      - Provide a scoring rubric with criteria for excellent, good, satisfactory, and needs improvement responses`;
      break;

    case 'problem-set':
      systemMessage.content += `\n\nCreate ${questionCount} problems to solve. For each problem:
      - Provide a clear problem statement
      - Include step-by-step solutions
      - Identify common mistakes students might make
      - Include hints that could be provided to struggling students`;
      break;

    default:
      systemMessage.content += `\n\nCreate an assessment with ${questionCount} questions that will effectively evaluate student understanding of ${topicData.name}.`;
  }

  // Add topic concepts if available
  if (topicData.concepts && topicData.concepts.length > 0) {
    systemMessage.content += `\n\nKey concepts to assess:\n`;
    topicData.concepts.forEach((concept) => {
      systemMessage.content += `- ${concept.name}: ${concept.description}\n`;
    });
  }

  // User message to trigger the generation
  const userMessage = {
    role: 'user',
    content: `Please create a ${difficulty} difficulty ${type} assessment about ${topicData.name} with ${questionCount} questions.`,
  };

  // Combine everything into the final prompt
  return {
    messages: [systemMessage, userMessage],
    temperature: 0.7,
    max_tokens: 1500,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
};

/**
 * Prepare the prompt for grading an assessment
 * @param {object} assessment - The assessment
 * @param {object} submission - The student's submission
 * @returns {object} - The prepared prompt
 */
const prepareGradingPrompt = (assessment, submission) => {
  // System message that defines the grading behavior
  const systemMessage = {
    role: 'system',
    content: `You are an educational assessment grader for MwanaAI. 
    Your task is to grade a student's submission for a ${assessment.type} assessment about ${assessment.topic}.
    
    Grading guidelines:
    1. Be fair and consistent in your evaluation.
    2. Provide specific feedback on strengths and areas for improvement.
    3. Explain why answers are correct or incorrect.
    4. Suggest resources or strategies to improve understanding.
    5. Be encouraging and constructive in your feedback.`,
  };

  // Add the assessment questions and answers
  systemMessage.content += `\n\nAssessment questions and correct answers:\n`;
  assessment.questions.forEach((question, index) => {
    systemMessage.content += `\nQuestion ${index + 1}: ${question.question}\n`;

    if (assessment.type === 'quiz') {
      systemMessage.content += `Options:\n`;
      Object.entries(question.options).forEach(([key, value]) => {
        systemMessage.content += `${key}: ${value}\n`;
      });
      systemMessage.content += `Correct answer: ${question.correctAnswer}\n`;
      if (question.explanation) {
        systemMessage.content += `Explanation: ${question.explanation}\n`;
      }
    } else if (assessment.type === 'essay') {
      systemMessage.content += `Expected key points:\n`;
      question.keyPoints.forEach((point) => {
        systemMessage.content += `- ${point}\n`;
      });
      systemMessage.content += `Rubric: ${question.rubric}\n`;
    } else if (assessment.type === 'problem-set') {
      systemMessage.content += `Solution: ${question.solution}\n`;
      systemMessage.content += `Common mistakes: ${question.commonMistakes.join(
        ', '
      )}\n`;
    }
  });

  // Add the student's submission
  let userMessage = {
    role: 'user',
    content: `Here is the student's submission for grading:\n\n`,
  };

  // Format the submission based on assessment type
  if (assessment.type === 'quiz') {
    submission.answers.forEach((answer, index) => {
      userMessage.content += `Question ${index + 1}: ${answer}\n`;
    });
  } else if (assessment.type === 'essay') {
    submission.essays.forEach((essay, index) => {
      userMessage.content += `Essay ${index + 1}:\n${essay}\n\n`;
    });
  } else if (assessment.type === 'problem-set') {
    submission.solutions.forEach((solution, index) => {
      userMessage.content += `Problem ${index + 1} Solution:\n${solution}\n\n`;
    });
  }

  userMessage.content += `\nPlease grade this submission and provide feedback.`;

  // Combine everything into the final prompt
  return {
    messages: [systemMessage, userMessage],
    temperature: 0.7,
    max_tokens: 1500,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
};

/**
 * Call the AI API with the prepared prompt
 * @param {object} prompt - The prepared prompt
 * @returns {Promise<string>} - The AI API response
 */
const callAIAPI = async (prompt) => {
  try {
    // For development/testing, return a mock response if no API key is available
    if (!API_KEY) {
      console.warn('No API key found, using mock response');
      return getMockResponse(prompt.messages[0].content);
    }

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: prompt.messages,
        temperature: prompt.temperature || 0.7,
        max_tokens: prompt.max_tokens || 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling AI API:', error);
    return getMockResponse(prompt.messages[0].content);
  }
};

/**
 * Process and structure the generated assessment
 * @param {string} generatedAssessment - The raw generated assessment
 * @param {string} type - The assessment type
 * @returns {object} - The processed assessment
 */
const processAssessment = (generatedAssessment, type) => {
  // Process based on assessment type
  switch (type) {
    case 'quiz':
      return processQuizAssessment(generatedAssessment);

    case 'essay':
      return processEssayAssessment(generatedAssessment);

    case 'problem-set':
      return processProblemSetAssessment(generatedAssessment);

    default:
      return {
        content: generatedAssessment,
        type,
        format: 'raw',
        createdAt: new Date().toISOString(),
      };
  }
};

/**
 * Process quiz assessment into structured format
 * @param {string} content - The raw quiz assessment
 * @returns {object} - Structured quiz assessment
 */
const processQuizAssessment = (content) => {
  // Simple regex-based parsing (in a real app, this would be more robust)
  const questions = [];
  const questionRegex =
    /(\d+)\.\s+(.*?)\s+A\.\s+(.*?)\s+B\.\s+(.*?)\s+C\.\s+(.*?)\s+D\.\s+(.*?)\s+(?:Answer|Correct):\s+([A-D])/gs;

  let match;
  while ((match = questionRegex.exec(content)) !== null) {
    questions.push({
      question: match[2].trim(),
      options: {
        A: match[3].trim(),
        B: match[4].trim(),
        C: match[5].trim(),
        D: match[6].trim(),
      },
      correctAnswer: match[7].trim(),
      explanation: '', // Would need more complex parsing to extract explanations
    });
  }

  return {
    questions:
      questions.length > 0
        ? questions
        : [{ question: content, options: {}, correctAnswer: '' }],
    type: 'quiz',
    format: 'structured',
    questionCount: questions.length,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Process essay assessment into structured format
 * @param {string} content - The raw essay assessment
 * @returns {object} - Structured essay assessment
 */
const processEssayAssessment = (content) => {
  // Simple parsing for essay questions
  const questions = [];
  const questionRegex = /(\d+)\.\s+(.*?)(?=\d+\.|$)/gs;

  let match;
  while ((match = questionRegex.exec(content)) !== null) {
    const questionText = match[2].trim();

    // Try to extract key points and rubric
    const keyPointsMatch = questionText.match(/Key Points:(.*?)(?=Rubric:|$)/s);
    const rubricMatch = questionText.match(/Rubric:(.*?)$/s);

    questions.push({
      question: questionText.split('Key Points:')[0].trim(),
      keyPoints: keyPointsMatch
        ? keyPointsMatch[1]
            .trim()
            .split('\n')
            .map((point) => point.replace(/^-\s*/, '').trim())
            .filter(Boolean)
        : [],
      rubric: rubricMatch ? rubricMatch[1].trim() : '',
    });
  }

  return {
    questions:
      questions.length > 0
        ? questions
        : [{ question: content, keyPoints: [], rubric: '' }],
    type: 'essay',
    format: 'structured',
    questionCount: questions.length,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Process problem set assessment into structured format
 * @param {string} content - The raw problem set assessment
 * @returns {object} - Structured problem set assessment
 */
const processProblemSetAssessment = (content) => {
  // Simple parsing for problems
  const questions = [];
  const problemRegex = /(\d+)\.\s+(.*?)(?=\d+\.|$)/gs;

  let match;
  while ((match = problemRegex.exec(content)) !== null) {
    const problemText = match[2].trim();

    // Try to extract solution and common mistakes
    const solutionMatch = problemText.match(
      /Solution:(.*?)(?=Common Mistakes:|Hints:|$)/s
    );
    const mistakesMatch = problemText.match(
      /Common Mistakes:(.*?)(?=Hints:|$)/s
    );
    const hintsMatch = problemText.match(/Hints:(.*?)$/s);

    questions.push({
      question: problemText.split('Solution:')[0].trim(),
      solution: solutionMatch ? solutionMatch[1].trim() : '',
      commonMistakes: mistakesMatch
        ? mistakesMatch[1]
            .trim()
            .split('\n')
            .map((mistake) => mistake.replace(/^-\s*/, '').trim())
            .filter(Boolean)
        : [],
      hints: hintsMatch
        ? hintsMatch[1]
            .trim()
            .split('\n')
            .map((hint) => hint.replace(/^-\s*/, '').trim())
            .filter(Boolean)
        : [],
    });
  }

  return {
    questions:
      questions.length > 0
        ? questions
        : [{ question: content, solution: '', commonMistakes: [], hints: [] }],
    type: 'problem-set',
    format: 'structured',
    questionCount: questions.length,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Process the grading result
 * @param {string} gradingResult - The raw grading result
 * @param {string} type - The assessment type
 * @returns {object} - The processed grading result
 */
const processGradingResult = (gradingResult, type) => {
  // Try to extract overall score
  const scoreMatch = gradingResult.match(
    /(?:Overall Score|Total Score|Score):\s*(\d+)(?:[\/\\](\d+)|%)/
  );
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
  const totalPossible =
    scoreMatch && scoreMatch[2] ? parseInt(scoreMatch[2]) : 100;

  // Try to extract individual question scores
  const questionScores = [];
  const questionScoreRegex =
    /Question (\d+)[\s\S]*?Score:?\s*(\d+)(?:[\/\\](\d+)|%)/g;

  let match;
  while ((match = questionScoreRegex.exec(gradingResult)) !== null) {
    questionScores.push({
      questionNumber: parseInt(match[1]),
      score: parseInt(match[2]),
      totalPossible: match[3] ? parseInt(match[3]) : 100,
    });
  }

  // Try to extract feedback sections
  const strengthsMatch = gradingResult.match(
    /(?:Strengths|What You Did Well):([\s\S]*?)(?=Areas for Improvement|Weaknesses|What to Work On|$)/
  );
  const weaknessesMatch = gradingResult.match(
    /(?:Areas for Improvement|Weaknesses|What to Work On):([\s\S]*?)(?=Resources|Suggestions|Next Steps|$)/
  );
  const suggestionsMatch = gradingResult.match(
    /(?:Resources|Suggestions|Next Steps):([\s\S]*?)$/
  );

  return {
    score: score !== null ? score : null,
    totalPossible,
    percentage:
      score !== null ? Math.round((score / totalPossible) * 100) : null,
    questionScores: questionScores.length > 0 ? questionScores : [],
    feedback: {
      strengths: strengthsMatch ? strengthsMatch[1].trim() : '',
      areasForImprovement: weaknessesMatch ? weaknessesMatch[1].trim() : '',
      suggestions: suggestionsMatch ? suggestionsMatch[1].trim() : '',
    },
    rawFeedback: gradingResult,
    gradedAt: new Date().toISOString(),
  };
};

/**
 * Save the assessment to the database
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - The topic ID
 * @param {object} assessment - The processed assessment
 * @returns {Promise<string>} - The assessment ID
 */
const saveAssessment = async (subjectId, topicId, assessment) => {
  try {
    const assessmentRef = await addDoc(collection(db, 'assessments'), {
      subjectId,
      topicId,
      ...assessment,
      createdAt: serverTimestamp(),
    });

    return assessmentRef.id;
  } catch (error) {
    console.error('Error saving assessment:', error);
    throw error;
  }
};

/**
 * Save the assessment result to the database
 * @param {string} assessmentId - The assessment ID
 * @param {string} userId - The user ID
 * @param {object} submission - The student's submission
 * @param {object} result - The grading result
 * @returns {Promise<string>} - The result ID
 */
const saveAssessmentResult = async (
  assessmentId,
  userId,
  submission,
  result
) => {
  try {
    const resultRef = await addDoc(collection(db, 'assessmentResults'), {
      assessmentId,
      userId,
      submission,
      ...result,
      createdAt: serverTimestamp(),
    });

    // Update user's learning activities
    await addDoc(collection(db, 'learningActivities'), {
      userId,
      type: 'assessment',
      assessmentId,
      resultId: resultRef.id,
      score: result.score,
      timestamp: serverTimestamp(),
    });

    return resultRef.id;
  } catch (error) {
    console.error('Error saving assessment result:', error);
    throw error;
  }
};

/**
 * Get mock response for development/testing
 * @param {string} prompt - The prompt content
 * @returns {string} - Mock response
 */
const getMockResponse = (prompt) => {
  if (prompt.includes('quiz')) {
    return `
1. What is the capital of France?
   A. London
   B. Berlin
   C. Paris
   D. Madrid
   Answer: C

2. Which planet is known as the Red Planet?
   A. Venus
   B. Mars
   C. Jupiter
   D. Saturn
   Answer: B

3. Who wrote "Romeo and Juliet"?
   A. Charles Dickens
   B. Jane Austen
   C. William Shakespeare
   D. Mark Twain
   Answer: C

4. What is the chemical symbol for gold?
   A. Go
   B. Gd
   C. Au
   D. Ag
   Answer: C

5. Which of these is NOT a primary color?
   A. Red
   B. Blue
   C. Green
   D. Yellow
   Answer: C
    `;
  }

  if (prompt.includes('grading')) {
    return `
Overall Score: 80/100

Question 1: Correct (20/20)
The student correctly identified Paris as the capital of France.

Question 2: Correct (20/20)
The student correctly identified Mars as the Red Planet.

Question 3: Correct (20/20)
The student correctly identified William Shakespeare as the author of "Romeo and Juliet".

Question 4: Incorrect (0/20)
The student selected Ag, which is the symbol for silver. The correct answer is Au.

Question 5: Correct (20/20)
The student correctly identified that green is not a primary color.

Strengths:
- Strong knowledge of geography and literature
- Good understanding of basic science concepts

Areas for Improvement:
- Review chemical symbols, particularly for common elements
- Consider creating flashcards for memorizing scientific facts

Resources:
- The periodic table of elements would be a helpful study resource
- Practice with more chemistry quizzes to reinforce knowledge
    `;
  }

  // Default mock response
  return `
1. Define photosynthesis and explain its importance to life on Earth.

Key Points:
- Definition of photosynthesis as the process by which plants convert light energy into chemical energy
- The chemical equation: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2
- Importance as the foundation of food chains
- Role in oxygen production
- Carbon dioxide removal from atmosphere

Rubric:
Excellent (90-100%): Comprehensive definition with accurate chemical equation, detailed explanation of all ecological importance aspects, well-structured response with examples.
Good (80-89%): Clear definition with mostly accurate chemical equation, good explanation of most ecological importance aspects, organized response.
Satisfactory (70-79%): Basic definition, partial chemical equation, mentions some ecological importance, adequate organization.
Needs Improvement (<70%): Incomplete or incorrect definition, missing or incorrect chemical equation, minimal explanation of importance, poor organization.

2. Compare and contrast mitosis and meiosis, focusing on their purposes, processes, and outcomes.

Key Points:
- Purpose of mitosis (growth, repair) vs. meiosis (reproduction)
- Number of divisions in each process
- Changes in chromosome number
- Genetic variation in outcomes
- Where each process occurs in the body

Rubric:
Excellent (90-100%): Thorough comparison of all key differences and similarities, accurate description of both processes, clear explanation of purposes and outcomes, well-organized with specific examples.
Good (80-89%): Good comparison of most differences and similarities, mostly accurate description of both processes, clear explanation of main purposes and outcomes.
Satisfactory (70-79%): Basic comparison covering some differences and similarities, general description of processes, mentions purposes and outcomes.
Needs Improvement (<70%): Few comparisons made, inaccurate descriptions, confusion between processes, missing key information.
  `;
};

/**
 * Get assessments for a topic
 * @param {string} topicId - The topic ID
 * @returns {Promise<array>} - The assessments
 */
export const getAssessmentsForTopic = async (topicId) => {
  try {
    const assessmentsQuery = query(
      collection(db, 'assessments'),
      where('topicId', '==', topicId),
      orderBy('createdAt', 'desc')
    );

    const assessmentsSnapshot = await getDocs(assessmentsQuery);

    return assessmentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
        ? new Date(doc.data().createdAt.toMillis())
        : new Date(),
    }));
  } catch (error) {
    console.error('Error getting assessments for topic:', error);
    throw error;
  }
};

/**
 * Get assessment results for a user
 * @param {string} userId - The user ID
 * @returns {Promise<array>} - The assessment results
 */
export const getAssessmentResultsForUser = async (userId) => {
  try {
    const resultsQuery = query(
      collection(db, 'assessmentResults'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const resultsSnapshot = await getDocs(resultsQuery);

    return resultsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
        ? new Date(doc.data().createdAt.toMillis())
        : new Date(),
    }));
  } catch (error) {
    console.error('Error getting assessment results for user:', error);
    throw error;
  }
};
