/**
 * AI Study Companion Service
 * 
 * This service provides an AI-powered study companion that helps students
 * with quick questions, explanations, and study support.
 */

import { db } from '../config/firebase';
import { doc, collection, getDoc, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// API configuration
const API_ENDPOINT = process.env.REACT_APP_AI_API_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Get study companion response
 * @param {string} userId - The user ID
 * @param {string} question - The student's question
 * @param {object} context - Additional context
 * @returns {Promise<object>} - The study companion response
 */
export const getStudyCompanionResponse = async (userId, question, context = {}) => {
  try {
    // 1. Get user's learning profile
    const userProfile = await getUserLearningProfile(userId);
    
    // 2. Get relevant educational content
    const relevantContent = await getRelevantContent(question, context.subjectId, context.topicId);
    
    // 3. Get conversation history if available
    const conversationHistory = context.conversationId ? 
      await getConversationHistory(context.conversationId) : 
      [];
    
    // 4. Prepare the prompt for the study companion
    const prompt = prepareStudyCompanionPrompt(
      userProfile,
      question,
      relevantContent,
      conversationHistory,
      context
    );
    
    // 5. Call the AI API
    const companionResponse = await callAIAPI(prompt);
    
    // 6. Save the conversation
    const messageId = await saveConversation(
      userId,
      question,
      companionResponse,
      context.conversationId,
      context
    );
    
    return {
      id: messageId,
      question,
      response: companionResponse,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting study companion response:', error);
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
 * Get relevant educational content
 * @param {string} question - The student's question
 * @param {string} subjectId - Optional subject ID
 * @param {string} topicId - Optional topic ID
 * @returns {Promise<object>} - Relevant educational content
 */
const getRelevantContent = async (question, subjectId, topicId) => {
  try {
    const content = {
      concepts: [],
      resources: [],
      examples: []
    };
    
    // If we have a specific topic, get its concepts
    if (topicId) {
      const conceptsQuery = query(
        collection(db, 'concepts'),
        where('topicId', '==', topicId)
      );
      
      const conceptsSnapshot = await getDocs(conceptsQuery);
      content.concepts = conceptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    // If we have a subject but no topic, get concepts for the subject
    else if (subjectId) {
      const topicsQuery = query(
        collection(db, 'topics'),
        where('subjectId', '==', subjectId)
      );
      
      const topicsSnapshot = await getDocs(topicsQuery);
      const topicIds = topicsSnapshot.docs.map(doc => doc.id);
      
      if (topicIds.length > 0) {
        const conceptsQuery = query(
          collection(db, 'concepts'),
          where('topicId', 'in', topicIds.slice(0, 10)) // Firestore limits 'in' queries to 10 values
        );
        
        const conceptsSnapshot = await getDocs(conceptsQuery);
        content.concepts = conceptsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    }
    
    // Get relevant resources
    const resourcesQuery = subjectId ?
      query(
        collection(db, 'resources'),
        where('subjectId', '==', subjectId),
        limit(5)
      ) :
      query(
        collection(db, 'resources'),
        limit(5)
      );
    
    const resourcesSnapshot = await getDocs(resourcesQuery);
    content.resources = resourcesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return content;
  } catch (error) {
    console.error('Error getting relevant content:', error);
    return { concepts: [], resources: [], examples: [] };
  }
};

/**
 * Get conversation history
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<array>} - The conversation history
 */
const getConversationHistory = async (conversationId) => {
  try {
    const conversationDoc = await getDoc(doc(db, 'studyCompanionConversations', conversationId));
    
    if (!conversationDoc.exists()) {
      return [];
    }
    
    const messagesQuery = query(
      collection(db, 'studyCompanionMessages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    
    return messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp ? new Date(doc.data().timestamp.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
};

/**
 * Prepare the prompt for the study companion
 * @param {object} userProfile - The user's learning profile
 * @param {string} question - The student's question
 * @param {object} relevantContent - Relevant educational content
 * @param {array} conversationHistory - Previous conversation history
 * @param {object} context - Additional context
 * @returns {object} - The prepared prompt
 */
const prepareStudyCompanionPrompt = (userProfile, question, relevantContent, conversationHistory, context) => {
  // System message that defines the study companion behavior
  const systemMessage = {
    role: "system",
    content: `You are an AI study companion for MwanaAI, an educational platform. 
    Your task is to help ${userProfile.name || 'the student'} with their studies by answering questions,
    explaining concepts, and providing learning support.
    
    Student profile:
    - Grade level: ${userProfile.gradeLevel || 'high school'}
    - Learning style: ${userProfile.learningStyle || 'visual'}
    - Language preference: ${userProfile.languagePreference || 'English'}
    
    Study companion guidelines:
    1. Be friendly, supportive, and encouraging.
    2. Explain concepts clearly and at an appropriate level for the student.
    3. Use examples and analogies to illustrate points.
    4. When appropriate, use the Socratic method to guide the student to discover answers.
    5. Adapt explanations to the student's learning style.
    6. Keep responses concise but thorough.
    7. Use markdown formatting for clarity.`
  };
  
  // Add relevant concepts if available
  if (relevantContent.concepts && relevantContent.concepts.length > 0) {
    systemMessage.content += `\n\nRelevant concepts that may help with this question:`;
    relevantContent.concepts.forEach(concept => {
      systemMessage.content += `\n- ${concept.name}: ${concept.description}`;
    });
  }
  
  // Add relevant resources if available
  if (relevantContent.resources && relevantContent.resources.length > 0) {
    systemMessage.content += `\n\nRelevant resources that may help with this question:`;
    relevantContent.resources.forEach(resource => {
      systemMessage.content += `\n- ${resource.title}: ${resource.description || 'No description available'}`;
    });
  }
  
  // Add subject and topic context if available
  if (context.subjectName) {
    systemMessage.content += `\n\nThe student is currently studying ${context.subjectName}`;
    if (context.topicName) {
      systemMessage.content += `, specifically the topic of ${context.topicName}`;
    }
    systemMessage.content += '.';
  }
  
  // Convert conversation history to messages
  const messages = [systemMessage];
  
  conversationHistory.forEach(message => {
    messages.push({
      role: message.isUser ? "user" : "assistant",
      content: message.isUser ? message.question : message.response
    });
  });
  
  // Add the current question
  messages.push({
    role: "user",
    content: question
  });
  
  // Combine everything into the final prompt
  return {
    messages,
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0.5,
    presence_penalty: 0.5
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
      return getMockCompanionResponse(prompt.messages[prompt.messages.length - 1].content);
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
    return getMockCompanionResponse(prompt.messages[prompt.messages.length - 1].content);
  }
};

/**
 * Save the conversation to the database
 * @param {string} userId - The user ID
 * @param {string} question - The student's question
 * @param {string} response - The AI response
 * @param {string} conversationId - Optional existing conversation ID
 * @param {object} context - Additional context
 * @returns {Promise<string>} - The message ID
 */
const saveConversation = async (userId, question, response, conversationId, context) => {
  try {
    let convId = conversationId;
    
    // If no conversation ID, create a new conversation
    if (!convId) {
      const conversationRef = await addDoc(collection(db, 'studyCompanionConversations'), {
        userId,
        subjectId: context.subjectId || null,
        topicId: context.topicId || null,
        subjectName: context.subjectName || null,
        topicName: context.topicName || null,
        title: generateConversationTitle(question),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      convId = conversationRef.id;
    } else {
      // Update the existing conversation's timestamp
      await getDoc(doc(db, 'studyCompanionConversations', convId)).then(docSnap => {
        if (docSnap.exists()) {
          docSnap.ref.update({
            updatedAt: serverTimestamp()
          });
        }
      });
    }
    
    // Save the user's question
    const userMessageRef = await addDoc(collection(db, 'studyCompanionMessages'), {
      conversationId: convId,
      userId,
      isUser: true,
      question,
      timestamp: serverTimestamp()
    });
    
    // Save the AI's response
    const aiMessageRef = await addDoc(collection(db, 'studyCompanionMessages'), {
      conversationId: convId,
      userId,
      isUser: false,
      response,
      timestamp: serverTimestamp()
    });
    
    // Add to learning activities
    await addDoc(collection(db, 'learningActivities'), {
      userId,
      type: 'studyCompanion',
      conversationId: convId,
      messageId: aiMessageRef.id,
      timestamp: serverTimestamp()
    });
    
    return aiMessageRef.id;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
};

/**
 * Generate a conversation title based on the first question
 * @param {string} question - The first question in the conversation
 * @returns {string} - A generated title
 */
const generateConversationTitle = (question) => {
  // Truncate and clean up the question to create a title
  const maxLength = 50;
  let title = question.trim();
  
  // Remove special characters
  title = title.replace(/[^\w\s]/gi, '');
  
  // Truncate if too long
  if (title.length > maxLength) {
    title = title.substring(0, maxLength) + '...';
  }
  
  return title;
};

/**
 * Get mock companion response for development/testing
 * @param {string} question - The student's question
 * @returns {string} - Mock response
 */
const getMockCompanionResponse = (question) => {
  // Simple keyword matching for mock responses
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('photosynthesis')) {
    return `
# Photosynthesis Explained

Photosynthesis is the process plants use to convert light energy into chemical energy. Here's how it works:

## The Basic Process
1. Plants capture sunlight using chlorophyll in their leaves
2. They take in carbon dioxide (CO₂) from the air through tiny pores called stomata
3. They absorb water (H₂O) through their roots
4. Using the energy from sunlight, they convert CO₂ and H₂O into glucose (sugar) and oxygen
5. The oxygen is released into the air, and the glucose is used for energy or stored

The chemical equation is:
6CO₂ + 6H₂O + light energy → C6H12O6 + 6O₂

## Why It Matters
Photosynthesis is essential because:
- It produces oxygen for animals to breathe
- It creates food (glucose) that powers plant growth
- It's the foundation of most food chains on Earth
- It removes carbon dioxide from the atmosphere

Does this help explain photosynthesis? Would you like me to go deeper into any specific part of the process?
    `;
  }
  
  if (questionLower.includes('quadratic')) {
    return `
# Solving Quadratic Equations

A quadratic equation has the form: ax² + bx + c = 0, where a, b, and c are constants and a ≠ 0.

There are three main methods to solve quadratic equations:

## 1. Factoring
If you can factor the equation into (px + q)(rx + s) = 0, then the solutions are x = -q/p and x = -s/r.

Example: x² - 5x + 6 = 0
Factored: (x - 2)(x - 3) = 0
Solutions: x = 2 or x = 3

## 2. Quadratic Formula
If factoring is difficult, use the quadratic formula:
x = (-b ± √(b² - 4ac)) / 2a

Example: 2x² - 4x + 1 = 0
a = 2, b = -4, c = 1
x = (4 ± √(16 - 8)) / 4
x = (4 ± √8) / 4
x = (4 ± 2√2) / 4
x = 1 ± √2/2

## 3. Completing the Square
This involves rewriting the equation to create a perfect square trinomial.

Would you like me to walk through an example problem with you?
    `;
  }
  
  if (questionLower.includes('mitosis')) {
    return `
# Mitosis: Cell Division Explained

Mitosis is the process of cell division that results in two identical daughter cells from one parent cell. It's crucial for growth, repair, and asexual reproduction.

## The Stages of Mitosis

### 1. Prophase
- Chromosomes condense and become visible
- Nuclear membrane breaks down
- Spindle fibers begin to form

### 2. Metaphase
- Chromosomes align at the center (metaphase plate)
- Spindle fibers attach to the centromeres

### 3. Anaphase
- Sister chromatids separate and move to opposite poles
- Cell begins to elongate

### 4. Telophase
- Nuclear membranes reform around each set of chromosomes
- Chromosomes begin to uncoil
- Cytokinesis (division of the cytoplasm) begins

## Key Points
- The result is two genetically identical daughter cells
- Each daughter cell has the same number of chromosomes as the parent cell
- In humans, each daughter cell has 46 chromosomes

Would you like me to explain any of these stages in more detail or compare mitosis to meiosis?
    `;
  }
  
  // Default response for other questions
  return `
I'd be happy to help you with that question!

Based on what you're asking, I think we should break this down into smaller parts to understand it better.

First, let's clarify the key concepts involved:
- The main idea here is understanding how the process works
- There are several important factors to consider
- We can approach this step-by-step

Would it help if I explained this with an example? Or would you prefer I focus on the theoretical concepts first?

Feel free to ask follow-up questions if anything isn't clear!
  `;
};

/**
 * Get conversations for a user
 * @param {string} userId - The user ID
 * @returns {Promise<array>} - The conversations
 */
export const getStudyCompanionConversations = async (userId) => {
  try {
    const conversationsQuery = query(
      collection(db, 'studyCompanionConversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const conversationsSnapshot = await getDocs(conversationsQuery);
    
    return conversationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date(),
      updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting study companion conversations:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<array>} - The messages
 */
export const getStudyCompanionMessages = async (conversationId) => {
  try {
    const messagesQuery = query(
      collection(db, 'studyCompanionMessages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    
    return messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp ? new Date(doc.data().timestamp.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting study companion messages:', error);
    throw error;
  }
};
