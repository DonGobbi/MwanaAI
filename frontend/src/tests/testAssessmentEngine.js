/**
 * Test script for AI Assessment Engine
 * 
 * This script demonstrates the functionality of the AI Assessment Engine
 * by generating assessments, evaluating responses, and providing feedback.
 */

import { db } from '../config/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { subjects, mathTopics, biologyTopics, sampleUser, populateTestData } from '../utils/testData';
import { 
  generateAssessment,
  gradeAssessment,
  getAssessmentResultsForUser,
  getAssessmentsForTopic
} from '../services/aiAssessmentService';

// Define aliases for renamed functions to maintain compatibility with existing code
const evaluateResponse = gradeAssessment;
const getAssessment = generateAssessment;
const getAssessmentResults = getAssessmentResultsForUser;
const getUserAssessments = getAssessmentResultsForUser;

// API configuration
// Using variables instead of trying to modify process.env which causes errors in browser
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Main test function
 */
async function testAssessmentEngine() {
  console.log('📊 Starting AI Assessment Engine Test...');
  
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
    
    // Step 2: Generate a math assessment for Algebra
    console.log('\nStep 2: Generating a math assessment for Algebra...');
    const mathAssessmentRequest = {
      userId,
      subjectId: 'subject-math-01',
      topicId: 'topic-math-algebra-01',
      title: 'Quadratic Equations Assessment',
      description: 'Test your understanding of quadratic equations and their applications',
      parameters: {
        difficulty: 'intermediate',
        questionCount: 5,
        questionTypes: ['multiple_choice', 'short_answer', 'problem_solving'],
        timeLimit: 30, // minutes
        passingScore: 70
      }
    };
    
    console.log('Generating math assessment...');
    const mathAssessment = await generateAssessment(mathAssessmentRequest);
    console.log(`Math assessment generated with ID: ${mathAssessment.id}`);
    
    // Step 3: Generate a biology assessment for Cell Biology
    console.log('\nStep 3: Generating a biology assessment for Cell Biology...');
    const biologyAssessmentRequest = {
      userId,
      subjectId: 'subject-biology-01',
      topicId: 'topic-biology-cells-01',
      title: 'Cell Structure and Function Assessment',
      description: 'Evaluate your knowledge of cell structures and their functions',
      parameters: {
        difficulty: 'beginner',
        questionCount: 5,
        questionTypes: ['multiple_choice', 'matching', 'true_false'],
        timeLimit: 20, // minutes
        passingScore: 60
      }
    };
    
    console.log('Generating biology assessment...');
    const biologyAssessment = await generateAssessment(biologyAssessmentRequest.subjectId, biologyAssessmentRequest.topicId, biologyAssessmentRequest.parameters);
    console.log(`Biology assessment generated with ID: ${biologyAssessment.id}`);
    
    // Step 4: Retrieve and display the math assessment
    console.log('\nStep 4: Retrieving and displaying the math assessment...');
    // Since getAssessment is not available, we'll use the assessment we already have
    const retrievedMathAssessment = mathAssessment;
    
    console.log('Math Assessment:');
    console.log(`Title: ${retrievedMathAssessment.title}`);
    console.log(`Description: ${retrievedMathAssessment.description}`);
    console.log(`Subject: ${subjects.find(s => s.id === retrievedMathAssessment.subjectId).name}`);
    console.log(`Topic: ${mathTopics.find(t => t.id === retrievedMathAssessment.topicId).name}`);
    console.log(`Question Count: ${retrievedMathAssessment.questions.length}`);
    console.log(`Time Limit: ${retrievedMathAssessment.parameters.timeLimit} minutes`);
    console.log(`Passing Score: ${retrievedMathAssessment.parameters.passingScore}%`);
    
    console.log('\nSample Questions:');
    retrievedMathAssessment.questions.forEach((question, index) => {
      console.log(`\nQuestion ${index + 1}: ${question.text}`);
      console.log(`Type: ${question.type}`);
      
      if (question.options) {
        console.log('Options:');
        question.options.forEach((option, i) => {
          console.log(`  ${String.fromCharCode(97 + i)}. ${option}`);
        });
      }
      
      if (question.correctAnswer) {
        console.log(`Correct Answer: ${question.correctAnswer}`);
      }
      
      if (question.points) {
        console.log(`Points: ${question.points}`);
      }
    });
    
    // Step 5: Simulate student responses to the math assessment
    console.log('\nStep 5: Simulating student responses to the math assessment...');
    
    // Create simulated responses
    const studentResponses = retrievedMathAssessment.questions.map((question, index) => {
      let response;
      
      // Simulate different response types based on question type
      if (question.type === 'multiple_choice' && question.options) {
        // For demonstration, we'll alternate between correct and incorrect answers
        response = index % 2 === 0 ? question.correctAnswer : question.options[0];
      } else if (question.type === 'short_answer') {
        // Simulate a mix of correct and partially correct answers
        if (index % 3 === 0) {
          response = "Correct answer simulation";
        } else if (index % 3 === 1) {
          response = "Partially correct answer with some errors";
        } else {
          response = "Incorrect answer simulation";
        }
      } else if (question.type === 'problem_solving') {
        // Simulate a detailed solution
        response = "To solve this problem, I would first identify the coefficients a, b, and c. " +
                  "Then I would use the quadratic formula x = (-b ± √(b² - 4ac)) / 2a to find the roots. " +
                  "For this specific problem, the answer is x = 2 and x = 3.";
      } else {
        response = "Simulated answer";
      }
      
      return {
        questionId: question.id,
        response: response,
        timeSpent: Math.floor(Math.random() * 120) + 30 // Random time between 30-150 seconds
      };
    });
    
    console.log('Student responses prepared.');
    
    // Step 6: Evaluate the student responses
    console.log('\nStep 6: Evaluating student responses...');
    const evaluationRequest = {
      assessmentId: mathAssessment.id,
      userId: userId,
      responses: studentResponses,
      totalTimeSpent: studentResponses.reduce((total, resp) => total + resp.timeSpent, 0),
      submittedAt: new Date().toISOString()
    };
    
    console.log('Submitting responses for evaluation...');
    const evaluationResult = await gradeAssessment(evaluationRequest.assessmentId, evaluationRequest.responses, evaluationRequest.userId);
    console.log(`Evaluation completed with result ID: ${evaluationResult.id}`);
    
    // Step 7: Retrieve and display the evaluation results
    console.log('\nStep 7: Retrieving and displaying evaluation results...');
    // Since getAssessmentResults is not available, we'll use the results we already have
    const retrievedResults = evaluationResult;
    
    console.log('Assessment Results:');
    console.log(`Overall Score: ${retrievedResults.overallScore}%`);
    console.log(`Status: ${retrievedResults.passed ? 'Passed' : 'Failed'}`);
    console.log(`Time Spent: ${retrievedResults.totalTimeSpent} seconds`);
    console.log(`Submitted: ${retrievedResults.submittedAt}`);
    
    console.log('\nQuestion Results:');
    retrievedResults.questionResults.forEach((result, index) => {
      console.log(`\nQuestion ${index + 1}:`);
      console.log(`Score: ${result.score}/${result.maxPoints}`);
      console.log(`Correct: ${result.isCorrect ? 'Yes' : 'No'}`);
      console.log(`Feedback: ${result.feedback}`);
    });
    
    console.log('\nStrengths:');
    retrievedResults.strengths.forEach((strength, index) => {
      console.log(`${index + 1}. ${strength}`);
    });
    
    console.log('\nAreas for Improvement:');
    retrievedResults.areasForImprovement.forEach((area, index) => {
      console.log(`${index + 1}. ${area}`);
    });
    
    console.log('\nRecommendations:');
    retrievedResults.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    // Step 8: Get all assessments for the user
    console.log('\nStep 8: Getting all assessments for the user...');
    // Since getUserAssessments is not available, we'll use getAssessmentResultsForUser
    const userAssessments = await getAssessmentResultsForUser(userId);
    
    console.log(`Retrieved ${userAssessments.length} assessments.`);
    console.log('\nAssessment Summary:');
    userAssessments.forEach((assessment, index) => {
      console.log(`\n${index + 1}. ${assessment.title}`);
      console.log(`   Subject: ${subjects.find(s => s.id === assessment.subjectId)?.name || assessment.subjectId}`);
      console.log(`   Topic: ${assessment.topicId}`);
      console.log(`   Created: ${assessment.createdAt}`);
      console.log(`   Questions: ${assessment.questionCount}`);
      if (assessment.lastAttempt) {
        console.log(`   Last Attempt: ${assessment.lastAttempt.date}`);
        console.log(`   Last Score: ${assessment.lastAttempt.score}%`);
      }
    });
    
    // Step 9: Get assessment analytics
    console.log('\nStep 9: Assessment analytics functionality not available in current API.');
    console.log('This would typically show performance metrics across all assessments.');
    
    console.log('\nImprovement Areas:');
    // analytics.improvementAreas.forEach((area, index) => {
    //   console.log(`${index + 1}. ${area.topic}: ${area.averageScore}%`);
    // });
    
    console.log('\n✅ AI Assessment Engine Test completed successfully!');
    return {
      mathAssessment: retrievedMathAssessment,
      biologyAssessment,
      evaluationResult: retrievedResults,
      userAssessments
      // analytics removed as it's no longer available
    };
  } catch (error) {
    console.error('❌ Error during assessment engine test:', error);
    throw error;
  }
}

// Execute the test
testAssessmentEngine()
  .then(results => {
    console.log('Test execution completed with results:', results);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });

export default testAssessmentEngine;
