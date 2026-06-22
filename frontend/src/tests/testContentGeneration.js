/**
 * Test script for AI Content Generation
 * 
 * This script demonstrates the functionality of the AI Content Generation service
 * by generating different types of educational content.
 */

import { db } from '../config/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { subjects, mathTopics, biologyTopics, sampleUser, populateTestData } from '../utils/testData';
import { 
  generateLearningMaterial,
  getGeneratedContent,
  getContentBySubjectAndTopic
} from '../services/aiContentGenerationService';

// Define aliases for renamed functions to maintain compatibility with existing code
const generateContent = generateLearningMaterial;
const getUserGeneratedContent = getGeneratedContent;
const getContentBySubject = getContentBySubjectAndTopic;

// API configuration
// Using variables instead of trying to modify process.env which causes errors in browser
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Main test function
 */
async function testContentGeneration() {
  console.log('📝 Starting AI Content Generation Test...');
  
  try {
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
    
    const userId = sampleUser.id;
    
    // Step 2: Generate study notes for Algebra
    console.log('\nStep 2: Generating study notes for Algebra...');
    const notesRequest = {
      userId,
      subjectId: 'subject-math-01',
      topicId: 'topic-math-algebra-01',
      contentType: 'notes',
      title: 'Quadratic Equations Explained',
      parameters: {
        difficulty: 'intermediate',
        focus: 'conceptual understanding',
        includeExamples: true,
        includeVisuals: true
      }
    };
    
    console.log('Generating notes...');
    const notes = await generateLearningMaterial(
      notesRequest.userId,
      notesRequest.subjectId,
      notesRequest.topicId,
      notesRequest.contentType,
      notesRequest.parameters
    );
    console.log(`Notes generated with ID: ${notes.id}`);
    
    // Step 3: Generate a quiz for Biology
    console.log('\nStep 3: Generating a quiz for Cell Biology...');
    const quizRequest = {
      userId,
      subjectId: 'subject-biology-01',
      topicId: 'topic-biology-cells-01',
      contentType: 'quiz',
      title: 'Cell Structure and Function Quiz',
      parameters: {
        difficulty: 'intermediate',
        questionCount: 5,
        questionTypes: ['multiple_choice', 'true_false'],
        includeExplanations: true
      }
    };
    
    console.log('Generating quiz...');
    const quiz = await generateLearningMaterial(
      quizRequest.userId,
      quizRequest.subjectId,
      quizRequest.topicId,
      quizRequest.contentType,
      quizRequest.parameters
    );
    console.log(`Quiz generated with ID: ${quiz.id}`);
    
    // Step 4: Generate flashcards for History
    console.log('\nStep 4: Generating flashcards for Ancient Civilizations...');
    const flashcardsRequest = {
      userId,
      subjectId: 'subject-history-01',
      topicId: 'topic-history-ancient-01',
      contentType: 'flashcards',
      title: 'Ancient Egypt Key Concepts',
      parameters: {
        difficulty: 'beginner',
        cardCount: 10,
        includeImages: false,
        focusAreas: ['key figures', 'important events', 'cultural achievements']
      }
    };
    
    console.log('Generating flashcards...');
    const flashcards = await generateLearningMaterial(
      flashcardsRequest.userId,
      flashcardsRequest.subjectId,
      flashcardsRequest.topicId,
      flashcardsRequest.contentType,
      flashcardsRequest.parameters
    );
    console.log(`Flashcards generated with ID: ${flashcards.id}`);
    
    // Step 5: Generate a summary for Calculus
    console.log('\nStep 5: Generating a summary for Calculus...');
    const summaryRequest = {
      userId,
      subjectId: 'subject-math-01',
      topicId: 'topic-math-calculus-01',
      contentType: 'summary',
      title: 'Derivatives Simplified',
      parameters: {
        difficulty: 'advanced',
        length: 'medium',
        includeKeyPoints: true,
        includeFormulas: true
      }
    };
    
    console.log('Generating summary...');
    const summary = await generateLearningMaterial(
      summaryRequest.userId,
      summaryRequest.subjectId,
      summaryRequest.topicId,
      summaryRequest.contentType,
      summaryRequest.parameters
    );
    console.log(`Summary generated with ID: ${summary.id}`);
    
    // Step 6: Retrieve and display generated content
    console.log('\nStep 6: Retrieving and displaying generated content...');
    
    // Get notes
    console.log('\nRetrieving notes...');
    const retrievedNotes = await getGeneratedContent(userId, notes.id);
    
    console.log('Notes:');
    console.log(`Title: ${retrievedNotes.title}`);
    console.log(`Subject: ${subjects.find(s => s.id === retrievedNotes.subjectId).name}`);
    console.log(`Topic: ${mathTopics.find(t => t.id === retrievedNotes.topicId).name}`);
    console.log(`Type: ${retrievedNotes.contentType}`);
    console.log(`Created: ${retrievedNotes.createdAt}`);
    
    console.log('\nContent Preview (first 500 characters):');
    console.log(retrievedNotes.content.substring(0, 500) + '...');
    
    // Get quiz
    console.log('\nRetrieving quiz...');
    const retrievedQuiz = await getGeneratedContent(userId, quiz.id);
    
    console.log('Quiz:');
    console.log(`Title: ${retrievedQuiz.title}`);
    console.log(`Subject: ${subjects.find(s => s.id === retrievedQuiz.subjectId).name}`);
    console.log(`Topic: ${biologyTopics.find(t => t.id === retrievedQuiz.topicId).name}`);
    console.log(`Type: ${retrievedQuiz.contentType}`);
    
    try {
      const quizContent = JSON.parse(retrievedQuiz.content);
      console.log(`\nNumber of Questions: ${quizContent.length}`);
      console.log('\nSample Question:');
      console.log(`Q: ${quizContent[0].question}`);
      console.log(`Options: ${quizContent[0].options.join(', ')}`);
      console.log(`Answer: ${quizContent[0].correctAnswer}`);
    } catch (error) {
      console.log('\nQuiz Content Preview:');
      console.log(retrievedQuiz.content.substring(0, 500) + '...');
    }
    
    // Step 7: Get all content for a user
    console.log('\nStep 7: Getting all content for the user...');
    const userContent = await getGeneratedContent(userId);
    
    console.log(`Retrieved ${userContent.length} content items.`);
    console.log('\nContent Summary:');
    userContent.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   Type: ${item.contentType}`);
      console.log(`   Subject: ${subjects.find(s => s.id === item.subjectId)?.name || item.subjectId}`);
      console.log(`   Created: ${item.createdAt}`);
    });
    
    // Step 8: Get content by subject and topic
    console.log('\nStep 8: Getting content for Mathematics Algebra...');
    const mathContent = await getContentBySubjectAndTopic('subject-math-01', 'topic-math-algebra-01');
    
    console.log(`Retrieved ${mathContent.length} math content items.`);
    console.log('\nMath Content:');
    mathContent.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   Type: ${item.contentType}`);
      console.log(`   Topic: ${mathTopics.find(t => t.id === item.topicId)?.name || item.topicId}`);
      console.log(`   Created: ${item.createdAt}`);
    });
    
    console.log('\n✅ AI Content Generation Test completed successfully!');
    return {
      notes: retrievedNotes,
      quiz: retrievedQuiz,
      flashcards,
      summary,
      userContent,
      mathContent
    };
  } catch (error) {
    console.error('❌ Error during content generation test:', error);
    throw error;
  }
}

// Execute the test
testContentGeneration()
  .then(results => {
    console.log('Test execution completed with results:', results);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });

export default testContentGeneration;
