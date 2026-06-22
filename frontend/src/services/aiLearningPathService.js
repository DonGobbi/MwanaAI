/**
 * AI Learning Path Service
 * 
 * This service handles the creation and management of personalized learning paths
 * based on student progress, learning style, and educational goals.
 */

import { db } from '../config/firebase';
import { doc, collection, getDoc, getDocs, setDoc, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

/**
 * Generate a personalized learning path for a student
 * @param {string} userId - The user ID
 * @param {string} subjectId - The subject ID
 * @param {object} learningPreferences - User's learning preferences
 * @param {object} assessmentResults - Results from previous assessments
 * @returns {Promise<object>} - The generated learning path
 */
export const generateLearningPath = async (userId, subjectId, learningPreferences = {}, assessmentResults = {}) => {
  try {
    // 1. Get user's current progress and learning history
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // 2. Get subject curriculum structure
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
    const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};
    
    // 3. Get topics for this subject
    const topicsQuery = query(
      collection(db, 'topics'),
      where('subjectId', '==', subjectId),
      orderBy('sequenceOrder', 'asc')
    );
    const topicsSnapshot = await getDocs(topicsQuery);
    const topics = topicsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 4. Get resources for this subject
    const resourcesQuery = query(
      collection(db, 'resources'),
      where('subjectData.id', '==', subjectId)
    );
    const resourcesSnapshot = await getDocs(resourcesQuery);
    const resources = resourcesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 5. Generate personalized learning path using AI algorithm
    const learningPath = generatePersonalizedPath(
      userData,
      subjectData,
      topics,
      resources,
      learningPreferences,
      assessmentResults
    );
    
    // 6. Save the generated learning path
    await setDoc(doc(db, 'learningPaths', `${userId}_${subjectId}`), {
      userId,
      subjectId,
      path: learningPath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completionPercentage: 0,
      active: true
    });
    
    return learningPath;
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw error;
  }
};

/**
 * Update a student's progress in their learning path
 * @param {string} userId - The user ID
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - The topic ID that was completed
 * @param {object} progressData - Data about the progress made
 * @returns {Promise<object>} - The updated learning path
 */
export const updateLearningPathProgress = async (userId, subjectId, topicId, progressData) => {
  try {
    // 1. Get the current learning path
    const pathDoc = await getDoc(doc(db, 'learningPaths', `${userId}_${subjectId}`));
    
    if (!pathDoc.exists()) {
      throw new Error('Learning path not found');
    }
    
    const pathData = pathDoc.data();
    const updatedPath = { ...pathData.path };
    
    // 2. Update the progress for the specific topic
    updatedPath.topics = updatedPath.topics.map(topic => {
      if (topic.id === topicId) {
        return {
          ...topic,
          completed: true,
          completedAt: new Date().toISOString(),
          score: progressData.score || 0,
          timeSpent: progressData.timeSpent || 0
        };
      }
      return topic;
    });
    
    // 3. Recalculate completion percentage
    const completedTopics = updatedPath.topics.filter(topic => topic.completed).length;
    const totalTopics = updatedPath.topics.length;
    const completionPercentage = Math.round((completedTopics / totalTopics) * 100);
    
    // 4. Update the learning path document
    await setDoc(doc(db, 'learningPaths', `${userId}_${subjectId}`), {
      ...pathData,
      path: updatedPath,
      completionPercentage,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // 5. If completion percentage reaches certain thresholds, adapt the path
    if (completionPercentage % 25 === 0) {
      // Adapt the learning path based on progress
      await adaptLearningPath(userId, subjectId);
    }
    
    return updatedPath;
  } catch (error) {
    console.error('Error updating learning path progress:', error);
    throw error;
  }
};

/**
 * Adapt a learning path based on student's progress and performance
 * @param {string} userId - The user ID
 * @param {string} subjectId - The subject ID
 * @returns {Promise<object>} - The adapted learning path
 */
export const adaptLearningPath = async (userId, subjectId) => {
  try {
    // 1. Get the current learning path
    const pathDoc = await getDoc(doc(db, 'learningPaths', `${userId}_${subjectId}`));
    
    if (!pathDoc.exists()) {
      throw new Error('Learning path not found');
    }
    
    const pathData = pathDoc.data();
    
    // 2. Get user's recent assessment results
    const assessmentsQuery = query(
      collection(db, 'assessmentResults'),
      where('userId', '==', userId),
      where('subjectId', '==', subjectId),
      orderBy('completedAt', 'desc'),
      limit(5)
    );
    const assessmentsSnapshot = await getDocs(assessmentsQuery);
    const recentAssessments = assessmentsSnapshot.docs.map(doc => doc.data());
    
    // 3. Analyze performance and identify strengths/weaknesses
    const performanceAnalysis = analyzePerformance(recentAssessments, pathData.path);
    
    // 4. Adapt the learning path based on performance analysis
    const adaptedPath = adaptPathBasedOnPerformance(pathData.path, performanceAnalysis);
    
    // 5. Update the learning path document
    await setDoc(doc(db, 'learningPaths', `${userId}_${subjectId}`), {
      ...pathData,
      path: adaptedPath,
      updatedAt: serverTimestamp(),
      adaptationHistory: [
        ...(pathData.adaptationHistory || []),
        {
          timestamp: new Date().toISOString(),
          reason: 'Performance-based adaptation',
          analysis: performanceAnalysis
        }
      ]
    }, { merge: true });
    
    return adaptedPath;
  } catch (error) {
    console.error('Error adapting learning path:', error);
    throw error;
  }
};

/**
 * Get a student's current learning path
 * @param {string} userId - The user ID
 * @param {string} subjectId - The subject ID
 * @returns {Promise<object>} - The current learning path
 */
export const getCurrentLearningPath = async (userId, subjectId) => {
  try {
    const pathDoc = await getDoc(doc(db, 'learningPaths', `${userId}_${subjectId}`));
    
    if (!pathDoc.exists()) {
      return null;
    }
    
    return pathDoc.data();
  } catch (error) {
    console.error('Error getting current learning path:', error);
    throw error;
  }
};

// Private helper functions

/**
 * Generate a personalized learning path using AI algorithm
 * @param {object} userData - User data
 * @param {object} subjectData - Subject data
 * @param {array} topics - Available topics
 * @param {array} resources - Available resources
 * @param {object} learningPreferences - User's learning preferences
 * @param {object} assessmentResults - Results from previous assessments
 * @returns {object} - The personalized learning path
 */
const generatePersonalizedPath = (
  userData,
  subjectData,
  topics,
  resources,
  learningPreferences,
  assessmentResults
) => {
  // 1. Determine user's current knowledge level
  const knowledgeLevel = determineKnowledgeLevel(userData, assessmentResults);
  
  // 2. Identify learning style preferences
  const learningStyle = learningPreferences.style || 'visual';
  
  // 3. Select appropriate topics based on knowledge level
  const selectedTopics = selectTopicsForLevel(topics, knowledgeLevel);
  
  // 4. Match resources to topics based on learning style
  const topicsWithResources = matchResourcesToTopics(selectedTopics, resources, learningStyle);
  
  // 5. Structure the learning path with milestones and checkpoints
  const structuredPath = structurePathWithMilestones(topicsWithResources, knowledgeLevel);
  
  return {
    subjectId: subjectData.id,
    subjectName: subjectData.name,
    knowledgeLevel,
    learningStyle,
    topics: structuredPath,
    estimatedCompletionTime: calculateEstimatedTime(structuredPath),
    createdAt: new Date().toISOString()
  };
};

/**
 * Determine user's knowledge level based on history and assessments
 * @param {object} userData - User data
 * @param {object} assessmentResults - Assessment results
 * @returns {string} - Knowledge level (beginner, intermediate, advanced)
 */
const determineKnowledgeLevel = (userData, assessmentResults) => {
  // If we have assessment results, use them to determine level
  if (assessmentResults && assessmentResults.overallScore) {
    const score = assessmentResults.overallScore;
    if (score < 40) return 'beginner';
    if (score < 75) return 'intermediate';
    return 'advanced';
  }
  
  // Otherwise use user's self-reported level or default to beginner
  return userData.knowledgeLevel || 'beginner';
};

/**
 * Select topics appropriate for the user's knowledge level
 * @param {array} topics - All available topics
 * @param {string} knowledgeLevel - User's knowledge level
 * @returns {array} - Selected topics
 */
const selectTopicsForLevel = (topics, knowledgeLevel) => {
  // Filter topics based on difficulty level
  let filteredTopics = topics;
  
  if (knowledgeLevel === 'beginner') {
    filteredTopics = topics.filter(topic => 
      topic.difficulty === 'beginner' || topic.isFoundational === true
    );
  } else if (knowledgeLevel === 'intermediate') {
    filteredTopics = topics.filter(topic => 
      topic.difficulty !== 'advanced' || topic.isEssential === true
    );
  }
  
  // Ensure topics are in the correct sequence
  return filteredTopics.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
};

/**
 * Match resources to topics based on learning style
 * @param {array} topics - Selected topics
 * @param {array} resources - Available resources
 * @param {string} learningStyle - User's learning style
 * @returns {array} - Topics with matched resources
 */
const matchResourcesToTopics = (topics, resources, learningStyle) => {
  return topics.map(topic => {
    // Find resources for this topic
    const topicResources = resources.filter(resource => 
      resource.topicIds && resource.topicIds.includes(topic.id)
    );
    
    // Prioritize resources that match the learning style
    const prioritizedResources = topicResources.sort((a, b) => {
      const aMatchesStyle = a.learningStyles && a.learningStyles.includes(learningStyle);
      const bMatchesStyle = b.learningStyles && b.learningStyles.includes(learningStyle);
      
      if (aMatchesStyle && !bMatchesStyle) return -1;
      if (!aMatchesStyle && bMatchesStyle) return 1;
      return 0;
    });
    
    return {
      ...topic,
      resources: prioritizedResources.slice(0, 5), // Limit to top 5 resources
      completed: false
    };
  });
};

/**
 * Structure the learning path with milestones and checkpoints
 * @param {array} topics - Topics with resources
 * @param {string} knowledgeLevel - User's knowledge level
 * @returns {array} - Structured learning path
 */
const structurePathWithMilestones = (topics, knowledgeLevel) => {
  // Group topics into milestones (e.g., every 3-5 topics)
  const milestoneSize = knowledgeLevel === 'beginner' ? 3 : 
                        knowledgeLevel === 'intermediate' ? 4 : 5;
  
  let currentMilestone = 1;
  
  return topics.map((topic, index) => {
    // Add milestone and checkpoint information
    const isMilestone = (index + 1) % milestoneSize === 0;
    const isCheckpoint = isMilestone || index === topics.length - 1;
    
    const enrichedTopic = {
      ...topic,
      milestone: isMilestone ? currentMilestone : null,
      isCheckpoint,
      assessmentRequired: isCheckpoint
    };
    
    if (isMilestone) {
      currentMilestone++;
    }
    
    return enrichedTopic;
  });
};

/**
 * Calculate estimated completion time for the learning path
 * @param {array} structuredPath - The structured learning path
 * @returns {number} - Estimated time in minutes
 */
const calculateEstimatedTime = (structuredPath) => {
  // Base time per topic
  const baseTimePerTopic = 30; // minutes
  
  // Sum up estimated time for all topics
  return structuredPath.reduce((total, topic) => {
    // Add base time for the topic
    let topicTime = baseTimePerTopic;
    
    // Add time for resources
    if (topic.resources) {
      topicTime += topic.resources.reduce((resourceTotal, resource) => {
        // Estimate based on resource type
        switch (resource.format) {
          case 'video':
            return resourceTotal + (resource.duration || 10);
          case 'article':
            return resourceTotal + (resource.readingTime || 15);
          case 'quiz':
            return resourceTotal + (resource.questionCount || 5) * 2;
          default:
            return resourceTotal + 10;
        }
      }, 0);
    }
    
    // Add time for assessment if required
    if (topic.assessmentRequired) {
      topicTime += 20;
    }
    
    return total + topicTime;
  }, 0);
};

/**
 * Analyze user performance to identify strengths and weaknesses
 * @param {array} assessments - Recent assessment results
 * @param {object} currentPath - Current learning path
 * @returns {object} - Performance analysis
 */
const analyzePerformance = (assessments, currentPath) => {
  // Extract topics from assessments
  const assessedTopics = assessments.reduce((topics, assessment) => {
    if (assessment.topicResults) {
      assessment.topicResults.forEach(result => {
        if (!topics[result.topicId]) {
          topics[result.topicId] = [];
        }
        topics[result.topicId].push(result.score);
      });
    }
    return topics;
  }, {});
  
  // Calculate average scores for each topic
  const topicAverages = Object.keys(assessedTopics).reduce((averages, topicId) => {
    const scores = assessedTopics[topicId];
    averages[topicId] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return averages;
  }, {});
  
  // Identify strengths (topics with high scores)
  const strengths = Object.keys(topicAverages)
    .filter(topicId => topicAverages[topicId] >= 80)
    .map(topicId => ({ topicId, score: topicAverages[topicId] }));
  
  // Identify weaknesses (topics with low scores)
  const weaknesses = Object.keys(topicAverages)
    .filter(topicId => topicAverages[topicId] < 60)
    .map(topicId => ({ topicId, score: topicAverages[topicId] }));
  
  // Calculate overall performance
  const allScores = Object.values(topicAverages);
  const overallAverage = allScores.length > 0 
    ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
    : null;
  
  return {
    strengths,
    weaknesses,
    overallAverage,
    assessedTopicCount: Object.keys(assessedTopics).length,
    totalTopicCount: currentPath.topics.length
  };
};

/**
 * Adapt learning path based on performance analysis
 * @param {object} currentPath - Current learning path
 * @param {object} performanceAnalysis - Performance analysis
 * @returns {object} - Adapted learning path
 */
const adaptPathBasedOnPerformance = (currentPath, performanceAnalysis) => {
  const adaptedPath = { ...currentPath };
  const { strengths, weaknesses } = performanceAnalysis;
  
  // 1. For topics in strengths, reduce resources and time
  strengths.forEach(({ topicId }) => {
    const topicIndex = adaptedPath.topics.findIndex(topic => topic.id === topicId);
    if (topicIndex >= 0) {
      // Reduce resources to essentials only
      adaptedPath.topics[topicIndex].resources = 
        adaptedPath.topics[topicIndex].resources.filter(r => r.isEssential);
      
      // Mark as accelerated
      adaptedPath.topics[topicIndex].accelerated = true;
    }
  });
  
  // 2. For topics in weaknesses, add more resources and practice
  weaknesses.forEach(({ topicId }) => {
    const topicIndex = adaptedPath.topics.findIndex(topic => topic.id === topicId);
    if (topicIndex >= 0) {
      // Add remedial flag
      adaptedPath.topics[topicIndex].needsRemediation = true;
      
      // Add practice exercises
      adaptedPath.topics[topicIndex].additionalPractice = true;
    }
  });
  
  // 3. Reorder remaining topics if needed based on dependencies
  // This is a simplified version - a real implementation would be more complex
  const completedTopicIds = adaptedPath.topics
    .filter(topic => topic.completed)
    .map(topic => topic.id);
  
  // Ensure topics with dependencies on weak areas come later
  adaptedPath.topics = adaptedPath.topics.sort((a, b) => {
    // If topic A depends on a weak topic and is not completed, it should come later
    const aHasDependencyOnWeak = a.dependencies && 
      a.dependencies.some(depId => weaknesses.some(w => w.topicId === depId));
    
    const bHasDependencyOnWeak = b.dependencies && 
      b.dependencies.some(depId => weaknesses.some(w => w.topicId === depId));
    
    if (!a.completed && aHasDependencyOnWeak && (!bHasDependencyOnWeak || b.completed)) {
      return 1;
    }
    
    if (!b.completed && bHasDependencyOnWeak && (!aHasDependencyOnWeak || a.completed)) {
      return -1;
    }
    
    // Otherwise maintain original sequence
    return a.sequenceOrder - b.sequenceOrder;
  });
  
  return adaptedPath;
};
