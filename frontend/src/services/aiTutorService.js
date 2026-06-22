/**
 * AI Tutor Service
 *
 * This service handles the AI tutor's natural conversation capabilities,
 * contextual memory, and educational responses.
 */

import { db, writeBatch } from '../config/firebase';
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

/**
 * Generate a response from the AI tutor
 * @param {string} userId - The user ID
 * @param {string} message - The user's message
 * @param {array} conversationHistory - Previous messages in the conversation
 * @param {object} context - Additional context (subject, topic, etc.)
 * @returns {Promise<object>} - The AI response
 */
export const generateTutorResponse = async (
  userId,
  message,
  conversationHistory = [],
  context = {}
) => {
  try {
    // 1. Get user's learning profile
    const userProfile = await getUserLearningProfile(userId);

    // 2. Get relevant educational content based on context
    const relevantContent = await getRelevantContent(
      context.subjectId,
      context.topicId
    );

    // 3. Prepare the prompt with conversation history and context
    const prompt = prepareConversationPrompt(
      message,
      conversationHistory,
      userProfile,
      context,
      relevantContent
    );

    // 4. Call the AI API
    const aiResponse = await callAIAPI(prompt);

    // 5. Process and enhance the response
    const processedResponse = processAIResponse(aiResponse, context);

    // 6. Save the conversation to history
    await saveConversationEntry(userId, message, processedResponse, context);

    return processedResponse;
  } catch (error) {
    console.error('Error generating tutor response:', error);
    return {
      content:
        "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.",
      error: true,
    };
  }
};

/**
 * Get the user's learning profile
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

    // Get user's learning history
    const learningHistoryQuery = query(
      collection(db, 'learningActivities'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const learningHistorySnapshot = await getDocs(learningHistoryQuery);
    const learningHistory = learningHistorySnapshot.docs.map((doc) =>
      doc.data()
    );

    // Get user's assessment results
    const assessmentQuery = query(
      collection(db, 'assessmentResults'),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc'),
      limit(5)
    );

    const assessmentSnapshot = await getDocs(assessmentQuery);
    const assessments = assessmentSnapshot.docs.map((doc) => doc.data());

    return {
      userId,
      name: userData.displayName || userData.name,
      learningStyle: userData.learningStyle || 'visual',
      gradeLevel: userData.gradeLevel || 'high school',
      languagePreference: userData.languagePreference || 'English',
      strengths: userData.strengths || [],
      weaknesses: userData.weaknesses || [],
      learningHistory,
      assessments,
    };
  } catch (error) {
    console.error('Error getting user learning profile:', error);
    return { error: true };
  }
};

/**
 * Get relevant educational content based on subject and topic
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - The topic ID
 * @returns {Promise<object>} - Relevant educational content
 */
const getRelevantContent = async (subjectId, topicId) => {
  try {
    const content = {
      concepts: [],
      resources: [],
      examples: [],
    };

    if (!subjectId) {
      return content;
    }

    // Get subject information
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
    if (subjectDoc.exists()) {
      content.subject = subjectDoc.data();
    }

    // If topic is specified, get topic information
    if (topicId) {
      const topicDoc = await getDoc(doc(db, 'topics', topicId));
      if (topicDoc.exists()) {
        content.topic = topicDoc.data();
      }

      // Get concepts related to this topic
      const conceptsQuery = query(
        collection(db, 'concepts'),
        where('topicId', '==', topicId),
        limit(10)
      );

      const conceptsSnapshot = await getDocs(conceptsQuery);
      content.concepts = conceptsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get resources related to this topic
      const resourcesQuery = query(
        collection(db, 'resources'),
        where('topicIds', 'array-contains', topicId),
        limit(5)
      );

      const resourcesSnapshot = await getDocs(resourcesQuery);
      content.resources = resourcesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get examples related to this topic
      const examplesQuery = query(
        collection(db, 'examples'),
        where('topicId', '==', topicId),
        limit(5)
      );

      const examplesSnapshot = await getDocs(examplesQuery);
      content.examples = examplesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    return content;
  } catch (error) {
    console.error('Error getting relevant content:', error);
    return { error: true };
  }
};

/**
 * Prepare the conversation prompt for the AI
 * @param {string} message - The user's message
 * @param {array} conversationHistory - Previous messages in the conversation
 * @param {object} userProfile - The user's learning profile
 * @param {object} context - Additional context (subject, topic, etc.)
 * @param {object} relevantContent - Relevant educational content
 * @returns {object} - The prepared prompt
 */
const prepareConversationPrompt = (
  message,
  conversationHistory,
  userProfile,
  context,
  relevantContent
) => {
  // System message that defines the AI tutor's behavior
  const systemMessage = {
    role: 'system',
    content: `You are MwanaAI, an educational AI tutor for ${
      userProfile.gradeLevel || 'high school'
    } students. 
    Your goal is to help students understand concepts, solve problems, and develop critical thinking skills.
    
    Student profile:
    - Learning style: ${userProfile.learningStyle || 'visual'}
    - Language preference: ${userProfile.languagePreference || 'English'}
    - Strengths: ${userProfile.strengths?.join(', ') || 'Not specified'}
    - Areas for improvement: ${
      userProfile.weaknesses?.join(', ') || 'Not specified'
    }
    
    Current subject: ${
      relevantContent.subject?.name || context.subject || 'Not specified'
    }
    Current topic: ${
      relevantContent.topic?.name || context.topic || 'Not specified'
    }
    
    Guidelines:
    1. Be encouraging, patient, and supportive.
    2. Use the Socratic method to guide students toward understanding rather than just giving answers.
    3. Provide clear explanations with examples.
    4. Adapt to the student's learning style.
    5. If you don't know something, admit it rather than making up information.
    6. Keep responses concise but thorough.
    7. Use appropriate language for ${
      userProfile.gradeLevel || 'high school'
    } level.
    8. Relate concepts to real-world applications when possible.
    9. Provide step-by-step guidance for problem-solving.
    10. Encourage critical thinking and deeper understanding.`,
  };

  // Add relevant educational content to the system message
  if (relevantContent.concepts && relevantContent.concepts.length > 0) {
    systemMessage.content += `\n\nKey concepts for this topic:\n`;
    relevantContent.concepts.forEach((concept) => {
      systemMessage.content += `- ${concept.name}: ${concept.description}\n`;
    });
  }

  if (relevantContent.examples && relevantContent.examples.length > 0) {
    systemMessage.content += `\n\nUseful examples for this topic:\n`;
    relevantContent.examples.forEach((example) => {
      systemMessage.content += `- ${example.title}: ${example.content}\n`;
    });
  }

  // Convert conversation history to the format expected by the AI API
  const formattedHistory = conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Add the current user message
  const userMessage = {
    role: 'user',
    content: message,
  };

  // Combine everything into the final prompt
  return {
    messages: [systemMessage, ...formattedHistory, userMessage],
    temperature: 0.7,
    max_tokens: 500,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
};

/**
 * Call the AI API with the prepared prompt
 * @param {object} prompt - The prepared prompt
 * @returns {Promise<object>} - The AI API response
 */
const callAIAPI = async (prompt) => {
  try {
    // For development/testing, return a mock response if no API key is available
    if (!API_KEY) {
      console.warn('No API key found, using mock response');
      return getMockResponse(
        prompt.messages[prompt.messages.length - 1].content
      );
    }

    // Ensure prompt format matches Groq API requirements
    const requestBody = {
      model: 'mixtral-8x7b-32768', // or your chosen model
      messages: prompt.messages,
      temperature: prompt.temperature || 0.7,
      max_tokens: prompt.max_tokens || 2048,
      top_p: prompt.top_p || 1,
      frequency_penalty: prompt.frequency_penalty || 0,
      presence_penalty: prompt.presence_penalty || 0,
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling AI API:', error);
    return getMockResponse(prompt.messages[prompt.messages.length - 1].content);
  }
};

/**
 * Process and enhance the AI response
 * @param {string} aiResponse - The raw AI response
 * @param {object} context - Additional context
 * @returns {object} - The processed response
 */
const processAIResponse = (aiResponse, context) => {
  // Check if the response contains code blocks and format them
  let processedContent = aiResponse;

  // Add relevant resource links if available
  if (context.resources && context.resources.length > 0) {
    processedContent += '\n\nHelpful resources:';
    context.resources.slice(0, 3).forEach((resource) => {
      processedContent += `\n- [${resource.title}](${resource.url})`;
    });
  }

  return {
    content: processedContent,
    timestamp: new Date(),
    context: {
      subject: context.subject,
      topic: context.topic,
    },
  };
};

/**
 * Save the conversation entry to the database
 * @param {string} userId - The user ID
 * @param {string} userMessage - The user's message
 * @param {object} aiResponse - The AI's response
 * @param {object} context - Additional context
 * @returns {Promise<void>}
 */
const saveConversationEntry = async (
  userId,
  userMessage,
  aiResponse,
  context
) => {
  try {
    // Create a new conversation if none exists
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('userId', '==', userId),
      where('active', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    const conversationsSnapshot = await getDocs(conversationsQuery);
    let conversationId;

    if (conversationsSnapshot.empty) {
      // Create a new conversation
      const newConversationRef = await addDoc(collection(db, 'conversations'), {
        userId,
        subject: context.subject || null,
        topic: context.topic || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: true,
        messageCount: 0,
      });

      conversationId = newConversationRef.id;
    } else {
      // Use existing conversation
      conversationId = conversationsSnapshot.docs[0].id;

      // Update conversation metadata
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          updatedAt: serverTimestamp(),
          messageCount: conversationsSnapshot.docs[0].data().messageCount + 2, // User message + AI response
        },
        { merge: true }
      );
    }

    // Add user message to messages collection
    await addDoc(collection(db, 'messages'), {
      conversationId,
      userId,
      role: 'user',
      content: userMessage,
      timestamp: serverTimestamp(),
      metadata: {
        subject: context.subject || null,
        topic: context.topic || null,
      },
    });

    // Add AI response to messages collection
    await addDoc(collection(db, 'messages'), {
      conversationId,
      userId,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: serverTimestamp(),
      metadata: {
        subject: context.subject || null,
        topic: context.topic || null,
        processingTime: Date.now() - new Date(aiResponse.timestamp).getTime(),
      },
    });

    // Add to learning activities
    await addDoc(collection(db, 'learningActivities'), {
      userId,
      type: 'conversation',
      subjectId: context.subjectId || null,
      topicId: context.topicId || null,
      timestamp: serverTimestamp(),
      details: {
        conversationId,
        messageCount: 2,
      },
    });
  } catch (error) {
    console.error('Error saving conversation entry:', error);
  }
};

/**
 * Get a mock response for development/testing
 * @param {string} userMessage - The user's message
 * @returns {string} - A mock response
 */
const getMockResponse = (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();

  // Simple pattern matching for common questions
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your MwanaAI tutor. How can I help you with your studies today?";
  }

  if (lowerMessage.includes('quadratic')) {
    return "To solve a quadratic equation in the form ax² + bx + c = 0, you can use the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a. First, identify the values of a, b, and c, then substitute them into the formula. The ± symbol means you'll get two solutions. Would you like to see an example?";
  }

  if (lowerMessage.includes('cell')) {
    return 'Cells are the basic structural and functional units of all living organisms. The main parts include the cell membrane (controls what enters/exits), cytoplasm (gel-like substance where organelles float), nucleus (contains DNA and controls cell activities), mitochondria (produces energy), and ribosomes (makes proteins). Plant cells also have cell walls, chloroplasts, and a large central vacuole. Would you like me to explain any specific part in more detail?';
  }

  if (lowerMessage.includes('newton')) {
    return "Newton's Three Laws of Motion are fundamental principles in physics:\n\n1. First Law (Law of Inertia): An object at rest stays at rest, and an object in motion stays in motion with the same speed and direction unless acted upon by an unbalanced force.\n\n2. Second Law: Force equals mass times acceleration (F = ma). The acceleration of an object is directly proportional to the force applied and inversely proportional to its mass.\n\n3. Third Law: For every action, there is an equal and opposite reaction.\n\nWhich law would you like me to explain with examples?";
  }

  // Default response
  return "That's a great question! I'd be happy to help you understand this concept better. Could you tell me what specific aspect you're struggling with, or would you like me to start with the basic principles?";
};

/**
 * Get conversation history for a user
 * @param {string} userId - The user ID
 * @param {string} conversationId - Optional conversation ID
 * @returns {Promise<array>} - The conversation history
 */
export const getConversationHistory = async (userId, conversationId = null) => {
  try {
    // Get the conversation details first
    let conversationDoc;

    if (conversationId) {
      const conversationRef = doc(db, 'conversations', conversationId);
      conversationDoc = await getDoc(conversationRef);
    } else {
      // Get the most recent conversation
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);

      if (conversationsSnapshot.empty) {
        return {
          messages: [],
          title: '',
          subjectId: '',
          topicId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      conversationDoc = conversationsSnapshot.docs[0];
    }

    if (!conversationDoc || !conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const conversationData = conversationDoc.data();

    // Get messages for this conversation
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationDoc.id),
      orderBy('timestamp', 'asc')
    );

    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp
        ? new Date(doc.data().timestamp.toMillis())
        : new Date(),
    }));

    return {
      messages,
      title: conversationData.title || '',
      subjectId: conversationData.subjectId || '',
      topicId: conversationData.topicId || '',
      createdAt: conversationData.createdAt
        ? new Date(conversationData.createdAt.toMillis())
        : new Date(),
      updatedAt: conversationData.updatedAt
        ? new Date(conversationData.updatedAt.toMillis())
        : new Date(),
    };
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return {
      messages: [],
      title: '',
      subjectId: '',
      topicId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
};

/**
 * Get all conversations for a user
 * @param {string} userId - The user ID
 * @returns {Promise<array>} - The user's conversations
 */
export const getUserConversations = async (userId) => {
  try {
    if (!userId) {
      console.warn('getUserConversations called with undefined userId');
      return [];
    }
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const conversationsSnapshot = await getDocs(conversationsQuery);

    return conversationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
        ? new Date(doc.data().createdAt.toMillis())
        : new Date(),
      updatedAt: doc.data().updatedAt
        ? new Date(doc.data().updatedAt.toMillis())
        : new Date(),
    }));
  } catch (error) {
    console.error('Error getting user conversations:', error);
    return [];
  }
};

/**
 * Create a new conversation
 * @param {string} userId - The user ID
 * @param {object} context - Conversation context
 * @returns {Promise<string>} - The new conversation ID
 */
export const createNewConversation = async (userId, context = {}) => {
  try {
    // Set existing conversations to inactive
    const activeConversationsQuery = query(
      collection(db, 'conversations'),
      where('userId', '==', userId),
      where('active', '==', true)
    );

    const activeConversationsSnapshot = await getDocs(activeConversationsQuery);

    const batch = writeBatch(db);
    activeConversationsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { active: false });
    });

    await batch.commit();

    // Create a new conversation
    const newConversationRef = await addDoc(collection(db, 'conversations'), {
      userId,
      subject: context.subject || null,
      topic: context.topic || null,
      subjectId: context.subjectId || null,
      topicId: context.topicId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: true,
      messageCount: 0,
    });

    return newConversationRef.id;
  } catch (error) {
    console.error('Error creating new conversation:', error);
    throw error;
  }
};

/**
 * Analyze conversation for learning insights
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<object>} - Learning insights from the conversation
 */
export const analyzeConversation = async (conversationId) => {
  try {
    if (!conversationId) {
      throw new Error('Conversation ID is required for analysis');
    }

    // First, verify the conversation exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    }));

    // Extract user messages
    const userMessages = messages.filter((msg) => msg.role === 'user');

    // Simple analysis - in a real implementation, this would use NLP
    const topics = new Set();
    const concepts = new Set();
    const questions = [];

    userMessages.forEach((msg) => {
      // Extract potential topics (simplified)
      const words = msg.content.split(/\s+/);
      words.forEach((word) => {
        if (word.length > 5) {
          topics.add(word.toLowerCase());
        }
      });

      // Extract questions
      if (msg.content.includes('?')) {
        questions.push(msg.content);
      }
    });

    return {
      conversationId,
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      duration:
        messages.length > 1
          ? messages[messages.length - 1].timestamp - messages[0].timestamp
          : 0,
      mainTopics: Array.from(topics).slice(0, 5),
      conceptsCovered: Array.from(concepts),
      difficultyLevel: calculateDifficultyLevel(messages),
      engagementLevel: calculateEngagementLevel(messages),
      recommendedNextSteps: generateRecommendations(
        messages,
        Array.from(topics),
        Array.from(concepts)
      ),
    };
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return {
      conversationId: conversationId || '',
      messageCount: 0,
      userMessageCount: 0,
      duration: 0,
      mainTopics: [],
      conceptsCovered: [],
      difficultyLevel: 'Basic',
      engagementLevel: 'Low',
      recommendedNextSteps: [
        'Start with basic concepts',
        'Review prerequisites',
        'Try a practice problem',
      ],
    };
  }
};

/**
 * Calculate difficulty level based on message content
 * @param {array} messages - Array of conversation messages
 * @returns {string} - Difficulty level (Basic, Intermediate, Advanced)
 */
const calculateDifficultyLevel = (messages) => {
  // Simple heuristic based on message length and complexity
  const complexityScore = messages.reduce((score, msg) => {
    const wordCount = msg.content.split(/\s+/).length;
    const longWords = msg.content
      .split(/\s+/)
      .filter((word) => word.length > 6).length;
    return score + wordCount * 0.1 + longWords * 0.3;
  }, 0);

  if (complexityScore > 50) return 'Advanced';
  if (complexityScore > 25) return 'Intermediate';
  return 'Basic';
};

/**
 * Calculate engagement level based on interaction patterns
 * @param {array} messages - Array of conversation messages
 * @returns {string} - Engagement level (Low, Medium, High)
 */
const calculateEngagementLevel = (messages) => {
  const userMessages = messages.filter((msg) => msg.role === 'user').length;
  const avgResponseTime =
    messages.reduce((total, msg, i) => {
      if (i === 0) return 0;
      return total + (msg.timestamp - messages[i - 1].timestamp);
    }, 0) /
    (messages.length - 1);

  if (userMessages > 5 && avgResponseTime < 60000) return 'High';
  if (userMessages > 3 || avgResponseTime < 120000) return 'Medium';
  return 'Low';
};

/**
 * Generate recommended next steps based on conversation analysis
 * @param {array} messages - Array of conversation messages
 * @param {array} topics - Array of identified topics
 * @param {array} concepts - Array of covered concepts
 * @returns {array} - Array of recommended next steps
 */
const generateRecommendations = (messages, topics, concepts) => {
  const recommendations = [];

  // Add practice recommendation if concepts were covered
  if (concepts.length > 0) {
    recommendations.push(
      `Practice applying the concepts: ${concepts.slice(0, 2).join(', ')}`
    );
  }

  // Suggest exploring related topics
  if (topics.length > 0) {
    recommendations.push(
      `Explore related topics: ${topics.slice(0, 2).join(', ')}`
    );
  }

  // Add general recommendations
  recommendations.push('Complete practice exercises to reinforce learning');
  recommendations.push('Review key concepts from this session');

  return recommendations;
};
