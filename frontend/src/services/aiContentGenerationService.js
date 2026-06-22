/**
 * AI Content Generation Service
 * 
 * This service handles the generation of custom learning materials
 * based on student needs, learning styles, and educational goals.
 */

import { db } from '../config/firebase';
import { doc, collection, getDoc, getDocs, setDoc, addDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// API configuration
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Generate custom learning material
 * @param {string} userId - The user ID
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - The topic ID
 * @param {string} contentType - Type of content to generate (notes, quiz, summary, etc.)
 * @param {object} parameters - Additional parameters for content generation
 * @returns {Promise<object>} - The generated content
 */
export const generateLearningMaterial = async (userId, subjectId, topicId, contentType, parameters = {}) => {
  try {
    // 1. Get user's learning profile
    const userProfile = await getUserLearningProfile(userId);
    
    // 2. Get subject and topic information
    const subjectData = await getSubjectData(subjectId);
    const topicData = await getTopicData(topicId);
    
    // 3. Prepare the prompt for content generation
    const prompt = prepareContentGenerationPrompt(
      userProfile,
      subjectData,
      topicData,
      contentType,
      parameters
    );
    
    // 4. Call the AI API
    const generatedContent = await callAIAPI(prompt);
    
    // 5. Process and format the generated content
    const processedContent = processGeneratedContent(generatedContent, contentType);
    
    // 6. Save the generated content
    const contentId = await saveGeneratedContent(
      userId,
      subjectId,
      topicId,
      contentType,
      processedContent
    );
    
    return {
      id: contentId,
      ...processedContent
    };
  } catch (error) {
    console.error('Error generating learning material:', error);
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
    
    return {
      userId,
      name: userData.displayName || userData.name,
      learningStyle: userData.learningStyle || 'visual',
      gradeLevel: userData.gradeLevel || 'high school',
      languagePreference: userData.languagePreference || 'English',
      strengths: userData.strengths || [],
      weaknesses: userData.weaknesses || []
    };
  } catch (error) {
    console.error('Error getting user learning profile:', error);
    return { error: true };
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
      ...subjectDoc.data()
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
    const concepts = conceptsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      id: topicId,
      ...topicDoc.data(),
      concepts
    };
  } catch (error) {
    console.error('Error getting topic data:', error);
    throw error;
  }
};

/**
 * Prepare the prompt for content generation
 * @param {object} userProfile - The user's learning profile
 * @param {object} subjectData - The subject data
 * @param {object} topicData - The topic data
 * @param {string} contentType - Type of content to generate
 * @param {object} parameters - Additional parameters
 * @returns {object} - The prepared prompt
 */
const prepareContentGenerationPrompt = (
  userProfile,
  subjectData,
  topicData,
  contentType,
  parameters
) => {
  // System message that defines the content generation behavior
  const systemMessage = {
    role: "system",
    content: `You are an educational content creator for MwanaAI, an educational platform. 
    Your task is to create high-quality ${contentType} about ${topicData.name} in ${subjectData.name}.
    
    Student profile:
    - Grade level: ${userProfile.gradeLevel || 'high school'}
    - Learning style: ${userProfile.learningStyle || 'visual'}
    - Language preference: ${userProfile.languagePreference || 'English'}
    
    Content guidelines:
    1. Create content that is accurate, engaging, and educational.
    2. Adapt to the student's learning style (${userProfile.learningStyle || 'visual'}).
    3. Use language appropriate for ${userProfile.gradeLevel || 'high school'} level.
    4. Include examples and real-world applications where relevant.
    5. Format the content in a clear, structured way.
    6. Use markdown formatting for headings, lists, and emphasis.`
  };
  
  // Add specific instructions based on content type
  switch (contentType) {
    case 'notes':
      systemMessage.content += `\n\nCreate comprehensive study notes that cover the key concepts of ${topicData.name}. Include:
      - Clear explanations of main concepts
      - Important definitions
      - Examples that illustrate the concepts
      - Visual descriptions that can be easily understood
      - Key points to remember`;
      break;
      
    case 'quiz':
      systemMessage.content += `\n\nCreate a quiz with ${parameters.questionCount || 5} questions about ${topicData.name}. For each question:
      - Provide a clear question
      - Include 4 multiple-choice options (A, B, C, D)
      - Mark the correct answer
      - Add a brief explanation for the correct answer`;
      break;
      
    case 'summary':
      systemMessage.content += `\n\nCreate a concise summary of ${topicData.name} that captures the most important concepts and ideas. The summary should:
      - Be approximately ${parameters.wordCount || 300} words
      - Cover the main points
      - Be easy to understand
      - Highlight key takeaways`;
      break;
      
    case 'exercise':
      systemMessage.content += `\n\nCreate ${parameters.exerciseCount || 3} practice exercises about ${topicData.name}. For each exercise:
      - Provide a clear problem statement
      - Include step-by-step solutions
      - Explain the reasoning behind each step
      - Vary the difficulty level`;
      break;
      
    case 'flashcards':
      systemMessage.content += `\n\nCreate a set of ${parameters.cardCount || 10} flashcards about ${topicData.name}. For each flashcard:
      - Front: Key term, concept, or question
      - Back: Definition, explanation, or answer
      - Keep content concise and focused`;
      break;
      
    default:
      systemMessage.content += `\n\nCreate educational content about ${topicData.name} that will help students understand and master this topic.`;
  }
  
  // Add topic concepts if available
  if (topicData.concepts && topicData.concepts.length > 0) {
    systemMessage.content += `\n\nKey concepts to include:\n`;
    topicData.concepts.forEach(concept => {
      systemMessage.content += `- ${concept.name}: ${concept.description}\n`;
    });
  }
  
  // Add any additional parameters
  if (parameters.focus) {
    systemMessage.content += `\n\nFocus particularly on: ${parameters.focus}`;
  }
  
  if (parameters.difficulty) {
    systemMessage.content += `\n\nDifficulty level: ${parameters.difficulty}`;
  }
  
  // User message to trigger the generation
  const userMessage = {
    role: "user",
    content: `Please create ${contentType} about ${topicData.name} for a ${userProfile.gradeLevel || 'high school'} student with a ${userProfile.learningStyle || 'visual'} learning style.`
  };
  
  // Combine everything into the final prompt
  return {
    messages: [
      systemMessage,
      userMessage
    ],
    temperature: 0.7,
    max_tokens: 1500,
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
      return getMockContent(prompt.messages[0].content);
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
    return getMockContent(prompt.messages[0].content);
  }
};

/**
 * Process and format the generated content
 * @param {string} generatedContent - The raw generated content
 * @param {string} contentType - Type of content
 * @returns {object} - The processed content
 */
const processGeneratedContent = (generatedContent, contentType) => {
  // Process content based on type
  switch (contentType) {
    case 'quiz':
      return processQuizContent(generatedContent);
      
    case 'flashcards':
      return processFlashcardContent(generatedContent);
      
    default:
      // For notes, summaries, exercises, etc.
      return {
        content: generatedContent,
        contentType,
        format: 'markdown',
        createdAt: new Date().toISOString()
      };
  }
};

/**
 * Process quiz content into structured format
 * @param {string} content - The raw quiz content
 * @returns {object} - Structured quiz content
 */
const processQuizContent = (content) => {
  // Simple regex-based parsing (in a real app, this would be more robust)
  const questions = [];
  const questionRegex = /(\d+)\.\s+(.*?)\s+A\.\s+(.*?)\s+B\.\s+(.*?)\s+C\.\s+(.*?)\s+D\.\s+(.*?)\s+(?:Answer|Correct):\s+([A-D])/gs;
  
  let match;
  while ((match = questionRegex.exec(content)) !== null) {
    questions.push({
      question: match[2].trim(),
      options: {
        A: match[3].trim(),
        B: match[4].trim(),
        C: match[5].trim(),
        D: match[6].trim()
      },
      correctAnswer: match[7].trim(),
      explanation: '' // Would need more complex parsing to extract explanations
    });
  }
  
  return {
    content: questions.length > 0 ? questions : content, // Fall back to raw content if parsing fails
    contentType: 'quiz',
    format: 'structured',
    questionCount: questions.length,
    createdAt: new Date().toISOString()
  };
};

/**
 * Process flashcard content into structured format
 * @param {string} content - The raw flashcard content
 * @returns {object} - Structured flashcard content
 */
const processFlashcardContent = (content) => {
  // Simple parsing for flashcards
  const flashcards = [];
  const cardRegex = /(\d+)\.\s+Front:\s+(.*?)\s+Back:\s+(.*?)(?=\d+\.\s+Front:|\s*$)/gs;
  
  let match;
  while ((match = cardRegex.exec(content)) !== null) {
    flashcards.push({
      front: match[2].trim(),
      back: match[3].trim()
    });
  }
  
  return {
    content: flashcards.length > 0 ? flashcards : content, // Fall back to raw content if parsing fails
    contentType: 'flashcards',
    format: 'structured',
    cardCount: flashcards.length,
    createdAt: new Date().toISOString()
  };
};

/**
 * Save the generated content to the database
 * @param {string} userId - The user ID
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - The topic ID
 * @param {string} contentType - Type of content
 * @param {object} processedContent - The processed content
 * @returns {Promise<string>} - The content ID
 */
const saveGeneratedContent = async (userId, subjectId, topicId, contentType, processedContent) => {
  try {
    const contentRef = await addDoc(collection(db, 'generatedContent'), {
      userId,
      subjectId,
      topicId,
      contentType,
      ...processedContent,
      createdAt: serverTimestamp()
    });
    
    return contentRef.id;
  } catch (error) {
    console.error('Error saving generated content:', error);
    throw error;
  }
};

/**
 * Get mock content for development/testing
 * @param {string} prompt - The content generation prompt
 * @returns {string} - Mock content
 */
const getMockContent = (prompt) => {
  if (prompt.includes('quiz')) {
    return `
1. What is photosynthesis?
   A. The process by which plants release oxygen
   B. The process by which plants convert light energy into chemical energy
   C. The process by which plants absorb carbon dioxide
   D. The process by which plants grow taller
   Answer: B

2. Which of the following is NOT required for photosynthesis?
   A. Water
   B. Carbon dioxide
   C. Chlorophyll
   D. Oxygen
   Answer: D

3. Where does photosynthesis primarily take place in plants?
   A. Roots
   B. Stems
   C. Chloroplasts
   D. Cell membrane
   Answer: C

4. What is the primary pigment involved in photosynthesis?
   A. Chlorophyll
   B. Melanin
   C. Carotene
   D. Xanthophyll
   Answer: A

5. What is the chemical equation for photosynthesis?
   A. 6CO2 + 6H2O + light energy → C6H12O6 + 6O2
   B. C6H12O6 + 6O2 → 6CO2 + 6H2O + energy
   C. 6CO2 + 12H2O + light energy → C6H12O6 + 6O2 + 6H2O
   D. C6H12O6 + 6H2O → 6CO2 + 12H2O + energy
   Answer: A
    `;
  }
  
  if (prompt.includes('notes')) {
    return `
# Photosynthesis

## Definition
Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy, usually from the sun, into chemical energy in the form of glucose or other sugars.

## Key Components
- **Chlorophyll**: The green pigment that captures light energy
- **Chloroplasts**: Organelles where photosynthesis occurs
- **Stomata**: Pores in leaves that allow CO2 to enter and O2 to exit

## The Process
Photosynthesis occurs in two main stages:

1. **Light-dependent reactions**:
   - Take place in the thylakoid membrane
   - Capture energy from sunlight
   - Convert it to chemical energy (ATP and NADPH)
   - Release oxygen as a byproduct

2. **Light-independent reactions** (Calvin Cycle):
   - Take place in the stroma
   - Use ATP and NADPH from the light-dependent reactions
   - Convert CO2 into glucose
   - Don't directly require light

## Chemical Equation
6CO2 + 6H2O + light energy → C6H12O6 + 6O2

## Importance
- Produces oxygen for all aerobic organisms
- Creates glucose that serves as the base of food chains
- Removes carbon dioxide from the atmosphere
- Provides energy for plant growth and reproduction

## Factors Affecting Photosynthesis
- Light intensity
- Carbon dioxide concentration
- Temperature
- Water availability
- Chlorophyll concentration
    `;
  }
  
  // Default mock content
  return `
# Topic Overview

## Introduction
This topic is fundamental to understanding the subject matter. It provides the foundation for more advanced concepts and applications.

## Key Concepts
1. **First Concept**: Description and explanation
2. **Second Concept**: Description and explanation
3. **Third Concept**: Description and explanation

## Examples
Here are some examples that illustrate the key concepts:

### Example 1
Detailed explanation of the first example.

### Example 2
Detailed explanation of the second example.

## Applications
These concepts can be applied in the following ways:
- Application 1
- Application 2
- Application 3

## Summary
In summary, this topic covers essential principles that help us understand how things work in this field. Mastering these concepts will enable you to solve problems and advance to more complex topics.
  `;
};

/**
 * Get generated content for a user
 * @param {string} userId - The user ID
 * @param {string} contentId - Optional content ID
 * @returns {Promise<object|array>} - The generated content
 */
export const getGeneratedContent = async (userId, contentId = null) => {
  try {
    if (contentId) {
      // Get specific content
      const contentDoc = await getDoc(doc(db, 'generatedContent', contentId));
      
      if (!contentDoc.exists()) {
        throw new Error('Content not found');
      }
      
      return {
        id: contentId,
        ...contentDoc.data(),
        createdAt: contentDoc.data().createdAt ? new Date(contentDoc.data().createdAt.toMillis()) : new Date()
      };
    } else {
      // Get all content for user
      const contentQuery = query(
        collection(db, 'generatedContent'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const contentSnapshot = await getDocs(contentQuery);
      
      return contentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date()
      }));
    }
  } catch (error) {
    console.error('Error getting generated content:', error);
    throw error;
  }
};

/**
 * Get content by subject and topic
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - The topic ID
 * @returns {Promise<array>} - The generated content
 */
export const getContentBySubjectAndTopic = async (subjectId, topicId) => {
  try {
    const contentQuery = query(
      collection(db, 'generatedContent'),
      where('subjectId', '==', subjectId),
      where('topicId', '==', topicId),
      orderBy('createdAt', 'desc')
    );
    
    const contentSnapshot = await getDocs(contentQuery);
    
    return contentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting content by subject and topic:', error);
    throw error;
  }
};
