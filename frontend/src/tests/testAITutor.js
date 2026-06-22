/**
 * Test script for AI Tutor Conversation
 *
 * This script demonstrates the functionality of the AI Tutor service
 * by simulating a conversation between a student and the AI tutor.
 */

import { db } from '../config/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import {
  subjects,
  mathTopics,
  sampleUser,
  populateTestData,
} from '../utils/testData';
import {
  createNewConversation,
  generateTutorResponse,
  getConversationHistory,
  getUserConversations,
  analyzeConversation,
} from '../services/aiTutorService';

// API configuration
// Using variables instead of trying to modify process.env which causes errors in browser
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Main test function
 */
async function testAITutorConversation() {
  console.log('🤖 Starting AI Tutor Conversation Test...');

  try {
    // Initialize test results
    let results = {
      success: false,
      conversationId: null,
      messages: [],
    };

    // Step 1: Ensure test data exists
    console.log('Step 1: Checking for test data...');
    const subjectsQuery = query(collection(db, 'subjects'));
    const subjectsSnapshot = await getDocs(subjectsQuery);

    if (subjectsSnapshot.empty) {
      console.log('No test data found. Populating database with test data...');
      await populateTestData(db);
      console.log('Test data populated successfully!');
    } else {
      console.log(`Found ${subjectsSnapshot.size} subjects in the database.`);
    }

    const userId = sampleUser.id || 'test-user-01'; // Provide fallback ID
    const subjectId = 'subject-math-01';
    const topicId = 'topic-math-algebra-01';

    // Log test parameters
    console.log('Test parameters:', { userId, subjectId, topicId });

    // Step 2: Start a new conversation with the AI tutor
    console.log('\nStep 2: Starting a new conversation with the AI tutor...');
    console.log(`Subject: ${subjects.find((s) => s.id === subjectId).name}`);
    console.log(`Topic: ${mathTopics.find((t) => t.id === topicId).name}`);

    const conversation = await createNewConversation(
      userId,
      subjectId,
      topicId
    );
    console.log(`Conversation started with ID: ${conversation.id}`);

    // Step 3: Send a message to the AI tutor
    console.log('\nStep 3: Sending a message to the AI tutor...');
    const message1 =
      "I'm having trouble understanding how to solve quadratic equations. Can you help me?";
    console.log(`User message: "${message1}"`);

    const response1 = await generateTutorResponse(userId, message1, [], {
      conversationId: conversation.id,
      subjectId,
      topicId,
    });
    console.log('\nAI Tutor response:');
    console.log(response1.content);

    // Step 4: Continue the conversation with a follow-up question
    console.log('\nStep 4: Sending a follow-up question...');
    const message2 =
      'When should I use the quadratic formula instead of factoring?';
    console.log(`User message: "${message2}"`);

    const response2 = await generateTutorResponse(
      userId,
      message2,
      [
        { role: 'user', content: message1 },
        { role: 'assistant', content: response1.content },
      ],
      { conversationId: conversation.id, subjectId, topicId }
    );
    console.log('\nAI Tutor response:');
    console.log(response2.content);

    // Step 5: Ask for an example
    console.log('\nStep 5: Asking for an example...');
    const message3 =
      'Can you show me an example of solving x² - 5x + 6 = 0 using both methods?';
    console.log(`User message: "${message3}"`);

    const response3 = await generateTutorResponse(
      userId,
      message3,
      [
        { role: 'user', content: message1 },
        { role: 'assistant', content: response1.content },
        { role: 'user', content: message2 },
        { role: 'assistant', content: response2.content },
      ],
      { conversationId: conversation.id, subjectId, topicId }
    );
    console.log('\nAI Tutor response:');
    console.log(response3.content);

    // Step 6: Retrieve the conversation history
    console.log('\nStep 6: Retrieving the conversation history...');
    const conversationHistory = await getConversationHistory(
      userId,
      conversation.id
    );

    console.log(`Retrieved ${conversationHistory.messages.length} messages.`);
    console.log('\nConversation Summary:');
    console.log(`Title: ${conversationHistory.title}`);
    console.log(`Subject: ${conversationHistory.subjectId}`);
    console.log(`Topic: ${conversationHistory.topicId}`);
    console.log(`Created: ${conversationHistory.createdAt}`);
    console.log(`Updated: ${conversationHistory.updatedAt}`);

    console.log('\nMessages:');
    conversationHistory.messages.forEach((msg, index) => {
      console.log(`\n[${msg.role}] ${msg.timestamp}:`);
      console.log(msg.content);
    });

    // Step 7: Analyze the conversation
    console.log('\nStep 7: Analyzing the conversation...');
    const analysis = await analyzeConversation(conversation.id);

    console.log('Conversation Analysis:');
    console.log(`Main Topics: ${analysis.mainTopics.join(', ')}`);
    console.log(`Concepts Covered: ${analysis.conceptsCovered.join(', ')}`);
    console.log(`Difficulty Level: ${analysis.difficultyLevel}`);
    console.log(`Engagement Level: ${analysis.engagementLevel}`);

    console.log('\nRecommended Next Steps:');
    analysis.recommendedNextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });

    console.log('\nSuggested Resources:');
    analysis.suggestedResources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.title}`);
      console.log(`   Type: ${resource.type}`);
      if (resource.url) {
        console.log(`   URL: ${resource.url}`);
      }
    });

    console.log('\n✅ AI Tutor Conversation Test completed successfully!');
    return {
      conversation,
      messages: conversationHistory.messages,
      analysis,
    };
  } catch (error) {
    console.error('❌ Error during AI tutor conversation test:', error);
    throw error;
  }
}

// Execute the test
testAITutorConversation()
  .then((results) => {
    console.log('Test execution completed with results:', results);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
  });

export default testAITutorConversation;
