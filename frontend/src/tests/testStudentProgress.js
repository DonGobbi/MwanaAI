/**
 * Test script for Student Progress Tracking
 * 
 * This script demonstrates the functionality of the Student Progress Tracking service
 * by simulating a student's learning journey and tracking their progress.
 */

import { db } from '../config/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { subjects, mathTopics, biologyTopics, sampleUser, populateTestData } from '../utils/testData';
import { 
  trackLearningActivity, 
  getLearningActivities, 
  getProgressSummary,
  getSubjectProgress,
  updateLearningStreak,
  getLearningStreak,
  getLearningInsights,
  getRecommendedNextSteps
} from '../services/studentProgressService';

// API configuration
// Using variables instead of trying to modify process.env which causes errors in browser
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Main test function
 */
async function testStudentProgressTracking() {
  console.log('📊 Starting Student Progress Tracking Test...');
  
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
    
    // Step 2: Track learning activities for a student
    console.log('\nStep 2: Tracking learning activities...');
    
    // Activity 1: Watching a video on Algebra
    console.log('Tracking activity: Watching a video on Algebra');
    const activity1 = {
      type: 'video_watched',
      subjectId: 'subject-math-01',
      topicId: 'topic-math-algebra-01',
      resourceId: 'resource-algebra-video-01',
      timeSpent: 1200, // 20 minutes in seconds
      completed: true,
      metadata: {
        videoTitle: 'Introduction to Algebraic Expressions',
        videoLength: 1200
      }
    };
    
    const activity1Id = await trackLearningActivity(userId, activity1);
    console.log(`Activity tracked with ID: ${activity1Id}`);
    
    // Activity 2: Completing a quiz on Algebra
    console.log('Tracking activity: Completing a quiz on Algebra');
    const activity2 = {
      type: 'quiz_completed',
      subjectId: 'subject-math-01',
      topicId: 'topic-math-algebra-01',
      assessmentId: 'quiz-algebra-01',
      score: 85,
      timeSpent: 900, // 15 minutes in seconds
      completed: true,
      metadata: {
        quizTitle: 'Algebraic Expressions Quiz',
        questionCount: 10,
        correctAnswers: 8.5
      }
    };
    
    const activity2Id = await trackLearningActivity(userId, activity2);
    console.log(`Activity tracked with ID: ${activity2Id}`);
    
    // Activity 3: Learning a concept in Biology
    console.log('Tracking activity: Learning about Cell Structure in Biology');
    const activity3 = {
      type: 'concept_learned',
      subjectId: 'subject-biology-01',
      topicId: 'topic-biology-cells-01',
      conceptId: 'concept-cell-structure-01',
      timeSpent: 1500, // 25 minutes in seconds
      completed: true,
      metadata: {
        conceptName: 'Cell Structure',
        difficulty: 'intermediate'
      }
    };
    
    const activity3Id = await trackLearningActivity(userId, activity3);
    console.log(`Activity tracked with ID: ${activity3Id}`);
    
    // Step 3: Retrieve learning activities
    console.log('\nStep 3: Retrieving learning activities...');
    const activities = await getLearningActivities(userId);
    
    console.log(`Retrieved ${activities.length} learning activities.`);
    activities.forEach((activity, index) => {
      console.log(`\nActivity ${index + 1}:`);
      console.log(`Type: ${activity.type}`);
      console.log(`Subject: ${activity.subjectId}`);
      console.log(`Topic: ${activity.topicId || 'N/A'}`);
      console.log(`Time Spent: ${activity.timeSpent} seconds`);
      console.log(`Timestamp: ${activity.timestamp}`);
    });
    
    // Step 4: Get progress summary
    console.log('\nStep 4: Getting progress summary...');
    const summary = await getProgressSummary(userId);
    
    console.log('Progress Summary:');
    console.log(`Total Activities: ${summary.totalActivities}`);
    console.log(`Total Time Spent: ${summary.totalTimeSpent} seconds`);
    console.log(`Subjects Studied: ${summary.subjectsStudied.length}`);
    console.log(`Topics Studied: ${summary.topicsStudied.length}`);
    console.log(`Concepts Learned: ${summary.conceptsLearned.length}`);
    
    console.log('\nActivity Breakdown:');
    Object.entries(summary.activityBreakdown || {}).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
    console.log('\nSubject Breakdown:');
    Object.entries(summary.subjectBreakdown || {}).forEach(([subjectId, data]) => {
      const subject = subjects.find(s => s.id === subjectId);
      console.log(`${subject ? subject.name : subjectId}:`);
      console.log(`  Activities: ${data.activities}`);
      console.log(`  Time Spent: ${data.timeSpent} seconds`);
      console.log(`  Last Studied: ${data.lastStudied}`);
    });
    
    // Step 5: Get subject progress
    console.log('\nStep 5: Getting subject progress for Mathematics...');
    const mathProgress = await getSubjectProgress(userId, 'subject-math-01');
    
    console.log('Mathematics Progress:');
    console.log(`Overall Completion: ${mathProgress.overallCompletionPercentage}%`);
    console.log(`Total Activities: ${mathProgress.totalActivities}`);
    console.log(`Total Time Spent: ${mathProgress.totalTimeSpent} seconds`);
    console.log(`Last Studied: ${mathProgress.lastStudied}`);
    
    console.log('\nTopic Progress:');
    mathProgress.topicProgress.forEach(topic => {
      console.log(`${topic.name}:`);
      console.log(`  Completion: ${topic.completionPercentage}%`);
      console.log(`  Concepts Learned: ${topic.conceptsLearned}/${topic.totalConcepts}`);
      console.log(`  Activities: ${topic.activities}`);
      console.log(`  Last Studied: ${topic.lastStudied}`);
    });
    
    // Step 6: Update learning streak
    console.log('\nStep 6: Updating learning streak...');
    const streak = await updateLearningStreak(userId);
    
    console.log('Learning Streak:');
    console.log(`Current Streak: ${streak.currentStreak} days`);
    console.log(`Longest Streak: ${streak.longestStreak} days`);
    console.log(`Last Activity Date: ${streak.lastActivityDate}`);
    
    // Step 7: Get learning insights
    console.log('\nStep 7: Getting AI-powered learning insights...');
    const insights = await getLearningInsights(userId);
    
    console.log('Learning Insights:');
    console.log('\nStrengths:');
    insights.strengths.forEach((strength, index) => {
      console.log(`${index + 1}. ${strength}`);
    });
    
    console.log('\nAreas for Improvement:');
    insights.areasForImprovement.forEach((area, index) => {
      console.log(`${index + 1}. ${area}`);
    });
    
    console.log('\nRecommendations:');
    insights.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    // Step 8: Get recommended next steps
    console.log('\nStep 8: Getting recommended next steps...');
    const recommendations = await getRecommendedNextSteps(userId);
    
    console.log('Recommended Next Steps:');
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.title}`);
      console.log(`   ${rec.description}`);
      console.log(`   Type: ${rec.type}`);
      console.log(`   Priority: ${rec.priority}`);
      if (rec.subjectId) {
        console.log(`   Subject: ${rec.subjectId}`);
      }
      if (rec.topicId) {
        console.log(`   Topic: ${rec.topicId}`);
      }
    });
    
    console.log('\n✅ Student Progress Tracking Test completed successfully!');
    return {
      activities,
      summary,
      mathProgress,
      streak,
      insights,
      recommendations
    };
  } catch (error) {
    console.error('❌ Error during student progress tracking test:', error);
    throw error;
  }
}

// Execute the test
testStudentProgressTracking()
  .then(results => {
    console.log('Test execution completed with results:', results);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });

export default testStudentProgressTracking;
