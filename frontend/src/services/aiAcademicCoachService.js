/**
 * AI Academic Coach Service
 * 
 * This service provides personalized academic coaching, guidance,
 * and support to students based on their learning data and goals.
 */

import { db } from '../config/firebase';
import { doc, collection, getDoc, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// API configuration
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Get personalized academic coaching advice
 * @param {string} userId - The user ID
 * @param {string} coachingType - Type of coaching needed
 * @param {object} parameters - Additional parameters
 * @returns {Promise<object>} - The coaching advice
 */
export const getAcademicCoaching = async (userId, coachingType, parameters = {}) => {
  try {
    // 1. Get user's learning profile and history
    const userProfile = await getUserLearningProfile(userId);
    const learningHistory = await getUserLearningHistory(userId);
    
    // 2. Prepare the prompt for coaching
    const prompt = prepareCoachingPrompt(userProfile, learningHistory, coachingType, parameters);
    
    // 3. Call the AI API
    const coachingAdvice = await callAIAPI(prompt);
    
    // 4. Process and format the coaching advice
    const processedAdvice = processCoachingAdvice(coachingAdvice, coachingType);
    
    // 5. Save the coaching session
    const sessionId = await saveCoachingSession(userId, coachingType, processedAdvice, parameters);
    
    return {
      id: sessionId,
      ...processedAdvice
    };
  } catch (error) {
    console.error('Error getting academic coaching:', error);
    throw error;
  }
};

/**
 * Get user's learning profile
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - The user's learning profile
 */
const getUserLearningProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { newUser: true };
    }
    
    const userData = userDoc.data();
    
    // Get user's goals
    const goalsQuery = query(
      collection(db, 'learningGoals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const goalsSnapshot = await getDocs(goalsQuery);
    const goals = goalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date()
    }));
    
    return {
      userId,
      name: userData.displayName || userData.name,
      email: userData.email,
      learningStyle: userData.learningStyle || 'visual',
      gradeLevel: userData.gradeLevel || 'high school',
      languagePreference: userData.languagePreference || 'English',
      strengths: userData.strengths || [],
      weaknesses: userData.weaknesses || [],
      interests: userData.interests || [],
      goals: goals || []
    };
  } catch (error) {
    console.error('Error getting user learning profile:', error);
    return { error: true };
  }
};

/**
 * Get user's learning history
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - The user's learning history
 */
const getUserLearningHistory = async (userId) => {
  try {
    // Get recent learning activities
    const activitiesQuery = query(
      collection(db, 'learningActivities'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const activitiesSnapshot = await getDocs(activitiesQuery);
    const activities = activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp ? new Date(doc.data().timestamp.toMillis()) : new Date()
    }));
    
    // Get assessment results
    const resultsQuery = query(
      collection(db, 'assessmentResults'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    const assessmentResults = resultsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date()
    }));
    
    // Get learning path progress
    const pathsQuery = query(
      collection(db, 'learningPaths'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    
    const pathsSnapshot = await getDocs(pathsQuery);
    const learningPaths = pathsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date()
    }));
    
    return {
      activities,
      assessmentResults,
      learningPaths
    };
  } catch (error) {
    console.error('Error getting user learning history:', error);
    return { error: true };
  }
};

/**
 * Prepare the prompt for coaching
 * @param {object} userProfile - The user's learning profile
 * @param {object} learningHistory - The user's learning history
 * @param {string} coachingType - Type of coaching needed
 * @param {object} parameters - Additional parameters
 * @returns {object} - The prepared prompt
 */
const prepareCoachingPrompt = (userProfile, learningHistory, coachingType, parameters) => {
  // System message that defines the coaching behavior
  const systemMessage = {
    role: "system",
    content: `You are an AI academic coach for MwanaAI, an educational platform. 
    Your task is to provide personalized ${coachingType} coaching to ${userProfile.name || 'the student'}.
    
    Student profile:
    - Grade level: ${userProfile.gradeLevel || 'high school'}
    - Learning style: ${userProfile.learningStyle || 'visual'}
    - Strengths: ${userProfile.strengths.join(', ') || 'Not specified'}
    - Areas for improvement: ${userProfile.weaknesses.join(', ') || 'Not specified'}
    - Interests: ${userProfile.interests.join(', ') || 'Not specified'}
    
    Coaching guidelines:
    1. Be supportive, encouraging, and empathetic.
    2. Provide specific, actionable advice tailored to the student's profile.
    3. Reference the student's learning history and performance data when relevant.
    4. Use a positive, growth mindset approach.
    5. Suggest practical strategies and resources.
    6. Be concise but thorough in your guidance.`
  };
  
  // Add specific instructions based on coaching type
  switch (coachingType) {
    case 'study-planning':
      systemMessage.content += `\n\nProvide study planning advice that helps the student:
      - Create an effective study schedule
      - Prioritize subjects and topics
      - Use appropriate study techniques for their learning style
      - Manage their time efficiently
      - Set realistic goals and milestones`;
      break;
      
    case 'test-preparation':
      systemMessage.content += `\n\nProvide test preparation advice that helps the student:
      - Develop effective test-taking strategies
      - Manage test anxiety
      - Focus on key concepts and likely test topics
      - Practice with sample questions
      - Review efficiently and effectively`;
      break;
      
    case 'skill-development':
      systemMessage.content += `\n\nProvide skill development advice that helps the student:
      - Identify specific skills to improve in ${parameters.subject || 'their subjects'}
      - Use targeted practice techniques
      - Track progress and measure improvement
      - Overcome specific learning challenges
      - Build on existing strengths`;
      break;
      
    case 'motivation':
      systemMessage.content += `\n\nProvide motivation and encouragement that helps the student:
      - Stay engaged with their learning
      - Overcome learning obstacles and frustrations
      - Reconnect with their academic goals and purpose
      - Celebrate progress and achievements
      - Develop intrinsic motivation`;
      break;
      
    case 'goal-setting':
      systemMessage.content += `\n\nProvide goal-setting advice that helps the student:
      - Create SMART academic goals (Specific, Measurable, Achievable, Relevant, Time-bound)
      - Break down long-term goals into manageable steps
      - Track progress toward goals
      - Adjust goals as needed
      - Connect daily actions to larger objectives`;
      break;
      
    default:
      systemMessage.content += `\n\nProvide general academic coaching that will help the student succeed in their educational journey.`;
  }
  
  // Add learning history information if available
  if (learningHistory.activities && learningHistory.activities.length > 0) {
    systemMessage.content += `\n\nRecent learning activities:`;
    learningHistory.activities.slice(0, 5).forEach(activity => {
      systemMessage.content += `\n- ${activity.type} on ${activity.timestamp.toLocaleDateString()}: ${activity.details || ''}`;
    });
  }
  
  if (learningHistory.assessmentResults && learningHistory.assessmentResults.length > 0) {
    systemMessage.content += `\n\nRecent assessment results:`;
    learningHistory.assessmentResults.slice(0, 3).forEach(result => {
      systemMessage.content += `\n- Score: ${result.score}/${result.totalPossible} (${result.percentage}%) on ${result.createdAt.toLocaleDateString()}`;
      if (result.feedback && result.feedback.areasForImprovement) {
        systemMessage.content += `\n  Areas for improvement: ${result.feedback.areasForImprovement.substring(0, 100)}...`;
      }
    });
  }
  
  // Add any additional parameters
  if (parameters.specificConcern) {
    systemMessage.content += `\n\nThe student has a specific concern about: ${parameters.specificConcern}`;
  }
  
  if (parameters.upcomingEvent) {
    systemMessage.content += `\n\nThe student has an upcoming ${parameters.upcomingEvent.type} on ${parameters.upcomingEvent.date} about ${parameters.upcomingEvent.topic}`;
  }
  
  // User message to trigger the coaching
  const userMessage = {
    role: "user",
    content: `I need help with ${coachingType}${parameters.subject ? ' for ' + parameters.subject : ''}. ${parameters.specificRequest || ''}`
  };
  
  // Combine everything into the final prompt
  return {
    messages: [
      systemMessage,
      userMessage
    ],
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
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
      return getMockCoachingResponse(prompt.messages[0].content);
    }
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: prompt.messages,
        temperature: prompt.temperature,
        max_tokens: prompt.max_tokens,
        top_p: prompt.top_p,
        frequency_penalty: prompt.frequency_penalty,
        presence_penalty: prompt.presence_penalty
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling AI API:', error);
    return getMockCoachingResponse(prompt.messages[0].content);
  }
};

/**
 * Process and format the coaching advice
 * @param {string} coachingAdvice - The raw coaching advice
 * @param {string} coachingType - Type of coaching
 * @returns {object} - The processed coaching advice
 */
const processCoachingAdvice = (coachingAdvice, coachingType) => {
  // Try to extract sections using regex
  const sections = {};
  
  // Look for headings and content
  const headingRegex = /#+\s+(.*?)(?=\n)/g;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(coachingAdvice)) !== null) {
    headings.push({
      title: match[1].trim(),
      index: match.index
    });
  }
  
  // Extract content between headings
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];
    const content = nextHeading 
      ? coachingAdvice.substring(heading.index + heading.title.length + 2, nextHeading.index).trim()
      : coachingAdvice.substring(heading.index + heading.title.length + 2).trim();
    
    sections[heading.title.toLowerCase().replace(/\s+/g, '-')] = content;
  }
  
  // If no sections were found, use the entire content
  if (Object.keys(sections).length === 0) {
    sections.advice = coachingAdvice;
  }
  
  return {
    content: coachingAdvice,
    sections,
    coachingType,
    format: 'markdown',
    createdAt: new Date().toISOString()
  };
};

/**
 * Save the coaching session to the database
 * @param {string} userId - The user ID
 * @param {string} coachingType - Type of coaching
 * @param {object} processedAdvice - The processed coaching advice
 * @param {object} parameters - Additional parameters
 * @returns {Promise<string>} - The session ID
 */
const saveCoachingSession = async (userId, coachingType, processedAdvice, parameters) => {
  try {
    const sessionRef = await addDoc(collection(db, 'coachingSessions'), {
      userId,
      coachingType,
      parameters,
      ...processedAdvice,
      createdAt: serverTimestamp()
    });
    
    // Add to learning activities
    await addDoc(collection(db, 'learningActivities'), {
      userId,
      type: 'coaching',
      coachingType,
      sessionId: sessionRef.id,
      timestamp: serverTimestamp()
    });
    
    return sessionRef.id;
  } catch (error) {
    console.error('Error saving coaching session:', error);
    throw error;
  }
};

/**
 * Get mock coaching response for development/testing
 * @param {string} prompt - The prompt content
 * @returns {string} - Mock coaching response
 */
const getMockCoachingResponse = (prompt) => {
  if (prompt.includes('study-planning')) {
    return `
# Personalized Study Plan

Based on your visual learning style and recent activities, here's a study plan tailored just for you:

## Daily Structure
- Start with 25-minute focused study sessions (Pomodoro technique)
- Take 5-minute breaks between sessions
- After 4 sessions, take a longer 30-minute break
- Use color-coding for your notes and schedules to engage your visual learning style

## Weekly Schedule
- Monday & Wednesday: Focus on challenging subjects in the morning when your mind is fresh
- Tuesday & Thursday: Work on projects and assignments
- Friday: Review the week's material and prepare for next week
- Weekend: Light review and rest (don't skip this!)

## Study Techniques for Visual Learners
- Create mind maps for complex topics
- Use flashcards with images or color coding
- Watch educational videos before reading text
- Redraw diagrams and charts from memory
- Use visualization techniques for memorization

## Prioritization Strategy
1. Urgent assignments with upcoming deadlines
2. Difficult subjects that need more attention
3. Regular review of previously learned material
4. New content exploration

Remember to adjust this plan based on your energy levels and unexpected events. The key is consistency, not perfection!
    `;
  }
  
  if (prompt.includes('test-preparation')) {
    return `
# Test Preparation Strategy

## One Week Before
- Create a comprehensive study schedule
- Identify and focus on high-value topics (those most likely to be tested)
- Take practice tests to identify knowledge gaps
- Review class notes and highlight key concepts
- Form or join a study group for difficult topics

## Three Days Before
- Focus on weak areas identified from practice tests
- Create condensed summary sheets for quick review
- Practice applying concepts to different problem types
- Get plenty of sleep and exercise
- Reduce screen time in the evening

## Day Before
- Light review of summary sheets
- Prepare all materials needed for the test
- Avoid learning new material
- Go to bed early
- Practice relaxation techniques if you experience test anxiety

## Test Day
- Eat a nutritious breakfast
- Arrive early to the test location
- Use deep breathing to manage anxiety
- Read all questions carefully before answering
- Start with questions you know well to build confidence
- Manage your time - don't get stuck on difficult questions

## Test-Taking Strategies
- For multiple choice: eliminate obviously wrong answers first
- For essays: create a quick outline before writing
- For problem-solving: show all your work clearly
- If stuck, mark the question and return to it later

Remember, preparation builds confidence, and confidence improves performance!
    `;
  }
  
  // Default mock response
  return `
# Academic Coaching Advice

## Strengths to Build On
You've shown consistent engagement with your learning materials, which is excellent! Your recent assessment results show strong performance in conceptual understanding. Continue to leverage your visual learning style by using diagrams, charts, and color-coding in your notes.

## Areas for Growth
Based on your recent activities, time management appears to be a challenge. You're also showing some difficulty with applying concepts to new situations, particularly in problem-solving scenarios.

## Recommended Strategies
1. **Time Blocking**: Dedicate specific time blocks for different subjects or tasks
2. **Active Practice**: Instead of just reading or watching, actively solve problems
3. **Spaced Repetition**: Review material at increasing intervals to improve retention
4. **Peer Teaching**: Explain concepts to others to solidify your understanding
5. **Regular Self-Assessment**: Test yourself frequently with practice questions

## Resources to Explore
- The Pomodoro Technique app for time management
- Practice problem sets in your learning platform
- Study group opportunities with peers
- Video tutorials that match your visual learning style

## Next Steps
1. Create a weekly schedule with dedicated study blocks
2. Set specific, measurable goals for each study session
3. Review your progress weekly and adjust your approach as needed
4. Celebrate small wins to maintain motivation

Remember that learning is a journey, not a destination. Each challenge you overcome builds your academic resilience!
  `;
};

/**
 * Get coaching sessions for a user
 * @param {string} userId - The user ID
 * @returns {Promise<array>} - The coaching sessions
 */
export const getCoachingSessionsForUser = async (userId) => {
  try {
    const sessionsQuery = query(
      collection(db, 'coachingSessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const sessionsSnapshot = await getDocs(sessionsQuery);
    
    return sessionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting coaching sessions for user:', error);
    throw error;
  }
};
