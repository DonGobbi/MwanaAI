/**
 * Student Progress Tracking Service
 * 
 * This service manages tracking, analyzing, and reporting student progress
 * across subjects, topics, and learning activities.
 */

import { db } from '../config/firebase';
import { 
  doc, collection, getDoc, getDocs, addDoc, updateDoc, 
  query, where, orderBy, limit, serverTimestamp, 
  arrayUnion, increment, deleteDoc
} from 'firebase/firestore';

// API configuration for AI-powered insights
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Track a learning activity for a student
 * @param {string} userId - The user ID
 * @param {object} activity - The learning activity to track
 * @returns {Promise<string>} - The activity ID
 */
export const trackLearningActivity = async (userId, activity) => {
  try {
    // Validate required fields
    if (!userId) throw new Error('User ID is required');
    if (!activity.type) throw new Error('Activity type is required');
    if (!activity.subjectId) throw new Error('Subject ID is required');
    
    // Prepare activity data
    const activityData = {
      userId,
      type: activity.type, // e.g., 'video_watched', 'quiz_completed', 'concept_learned'
      subjectId: activity.subjectId,
      topicId: activity.topicId || null,
      conceptId: activity.conceptId || null,
      resourceId: activity.resourceId || null,
      assessmentId: activity.assessmentId || null,
      score: activity.score || null,
      timeSpent: activity.timeSpent || null, // in seconds
      completed: activity.completed || true,
      metadata: activity.metadata || {},
      timestamp: serverTimestamp()
    };
    
    // Save activity to Firestore
    const activityRef = await addDoc(collection(db, 'learningActivities'), activityData);
    
    // Update user progress summary
    await updateProgressSummary(userId, activity);
    
    return activityRef.id;
  } catch (error) {
    console.error('Error tracking learning activity:', error);
    throw error;
  }
};

/**
 * Update progress summary for a user
 * @param {string} userId - The user ID
 * @param {object} activity - The learning activity
 * @returns {Promise<void>}
 */
const updateProgressSummary = async (userId, activity) => {
  try {
    // Get or create progress summary document
    const summaryRef = doc(db, 'progressSummaries', userId);
    const summaryDoc = await getDoc(summaryRef);
    
    if (!summaryDoc.exists()) {
      // Create new summary if it doesn't exist
      await updateDoc(summaryRef, {
        userId,
        lastUpdated: serverTimestamp(),
        subjectsStudied: [activity.subjectId],
        topicsStudied: activity.topicId ? [activity.topicId] : [],
        conceptsLearned: activity.conceptId ? [activity.conceptId] : [],
        totalActivities: 1,
        totalTimeSpent: activity.timeSpent || 0,
        activityBreakdown: {
          [activity.type]: 1
        },
        subjectBreakdown: {
          [activity.subjectId]: {
            activities: 1,
            timeSpent: activity.timeSpent || 0,
            lastStudied: serverTimestamp()
          }
        }
      });
    } else {
      // Update existing summary
      const updateData = {
        lastUpdated: serverTimestamp(),
        totalActivities: increment(1),
        [`activityBreakdown.${activity.type}`]: increment(1)
      };
      
      // Update time spent if provided
      if (activity.timeSpent) {
        updateData.totalTimeSpent = increment(activity.timeSpent);
      }
      
      // Update subject data
      if (activity.subjectId) {
        updateData[`subjectBreakdown.${activity.subjectId}.activities`] = increment(1);
        updateData[`subjectBreakdown.${activity.subjectId}.lastStudied`] = serverTimestamp();
        
        if (activity.timeSpent) {
          updateData[`subjectBreakdown.${activity.subjectId}.timeSpent`] = increment(activity.timeSpent);
        }
        
        // Add to subjects studied array if not already present
        if (!summaryDoc.data().subjectsStudied?.includes(activity.subjectId)) {
          updateData.subjectsStudied = arrayUnion(activity.subjectId);
        }
      }
      
      // Update topic data
      if (activity.topicId && !summaryDoc.data().topicsStudied?.includes(activity.topicId)) {
        updateData.topicsStudied = arrayUnion(activity.topicId);
      }
      
      // Update concept data
      if (activity.conceptId && !summaryDoc.data().conceptsLearned?.includes(activity.conceptId)) {
        updateData.conceptsLearned = arrayUnion(activity.conceptId);
      }
      
      // Apply updates
      await updateDoc(summaryRef, updateData);
    }
  } catch (error) {
    console.error('Error updating progress summary:', error);
    // Don't throw here to prevent blocking the main activity tracking
    // Just log the error and continue
  }
};

/**
 * Get learning activities for a user
 * @param {string} userId - The user ID
 * @param {object} filters - Optional filters
 * @returns {Promise<array>} - The learning activities
 */
export const getLearningActivities = async (userId, filters = {}) => {
  try {
    // Start with base query
    let activitiesQuery = query(
      collection(db, 'learningActivities'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    // Apply filters if provided
    if (filters.subjectId) {
      activitiesQuery = query(
        activitiesQuery,
        where('subjectId', '==', filters.subjectId)
      );
    }
    
    if (filters.topicId) {
      activitiesQuery = query(
        activitiesQuery,
        where('topicId', '==', filters.topicId)
      );
    }
    
    if (filters.type) {
      activitiesQuery = query(
        activitiesQuery,
        where('type', '==', filters.type)
      );
    }
    
    if (filters.limit) {
      activitiesQuery = query(
        activitiesQuery,
        limit(filters.limit)
      );
    }
    
    // Execute query
    const activitiesSnapshot = await getDocs(activitiesQuery);
    
    // Process results
    return activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp ? new Date(doc.data().timestamp.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting learning activities:', error);
    throw error;
  }
};

/**
 * Get progress summary for a user
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - The progress summary
 */
export const getProgressSummary = async (userId) => {
  try {
    const summaryDoc = await getDoc(doc(db, 'progressSummaries', userId));
    
    if (!summaryDoc.exists()) {
      // Return empty summary if none exists
      return {
        userId,
        subjectsStudied: [],
        topicsStudied: [],
        conceptsLearned: [],
        totalActivities: 0,
        totalTimeSpent: 0,
        activityBreakdown: {},
        subjectBreakdown: {}
      };
    }
    
    // Process timestamp fields
    const data = summaryDoc.data();
    return {
      ...data,
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated.toMillis()) : new Date(),
      subjectBreakdown: Object.entries(data.subjectBreakdown || {}).reduce((acc, [key, value]) => {
        acc[key] = {
          ...value,
          lastStudied: value.lastStudied ? new Date(value.lastStudied.toMillis()) : new Date()
        };
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting progress summary:', error);
    throw error;
  }
};

/**
 * Get subject progress for a user
 * @param {string} userId - The user ID
 * @param {string} subjectId - The subject ID
 * @returns {Promise<object>} - The subject progress
 */
export const getSubjectProgress = async (userId, subjectId) => {
  try {
    // Get subject details
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
    
    if (!subjectDoc.exists()) {
      throw new Error('Subject not found');
    }
    
    // Get topics for this subject
    const topicsQuery = query(
      collection(db, 'topics'),
      where('subjectId', '==', subjectId)
    );
    
    const topicsSnapshot = await getDocs(topicsQuery);
    const topics = topicsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get user's learning activities for this subject
    const activitiesQuery = query(
      collection(db, 'learningActivities'),
      where('userId', '==', userId),
      where('subjectId', '==', subjectId)
    );
    
    const activitiesSnapshot = await getDocs(activitiesQuery);
    const activities = activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate topic completion
    const topicProgress = topics.map(topic => {
      const topicActivities = activities.filter(activity => activity.topicId === topic.id);
      const conceptsLearned = [...new Set(topicActivities
        .filter(activity => activity.conceptId)
        .map(activity => activity.conceptId))];
      
      // Calculate completion percentage
      // This is a simplified calculation - in a real app, you'd have a more sophisticated algorithm
      const totalConcepts = topic.conceptCount || 10; // Fallback if conceptCount is not set
      const completionPercentage = Math.min(
        Math.round((conceptsLearned.length / totalConcepts) * 100),
        100
      );
      
      return {
        topicId: topic.id,
        name: topic.name,
        completionPercentage,
        conceptsLearned: conceptsLearned.length,
        totalConcepts,
        activities: topicActivities.length,
        lastStudied: topicActivities.length > 0 
          ? new Date(Math.max(...topicActivities.map(a => a.timestamp?.toMillis() || 0)))
          : null
      };
    });
    
    // Calculate overall subject completion
    const totalTopics = topics.length;
    const completedTopics = topicProgress.filter(t => t.completionPercentage >= 80).length;
    const overallCompletionPercentage = totalTopics > 0
      ? Math.round((completedTopics / totalTopics) * 100)
      : 0;
    
    return {
      subjectId,
      name: subjectDoc.data().name,
      overallCompletionPercentage,
      topicProgress,
      totalActivities: activities.length,
      totalTimeSpent: activities.reduce((sum, activity) => sum + (activity.timeSpent || 0), 0),
      lastStudied: activities.length > 0
        ? new Date(Math.max(...activities.map(a => a.timestamp?.toMillis() || 0)))
        : null
    };
  } catch (error) {
    console.error('Error getting subject progress:', error);
    throw error;
  }
};

/**
 * Get learning streak information for a user
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - The learning streak info
 */
export const getLearningStreak = async (userId) => {
  try {
    // Get streak document
    const streakDoc = await getDoc(doc(db, 'learningStreaks', userId));
    
    if (!streakDoc.exists()) {
      // Initialize streak if it doesn't exist
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        streakHistory: []
      };
    }
    
    return {
      ...streakDoc.data(),
      lastActivityDate: streakDoc.data().lastActivityDate 
        ? new Date(streakDoc.data().lastActivityDate.toMillis()) 
        : null
    };
  } catch (error) {
    console.error('Error getting learning streak:', error);
    throw error;
  }
};

/**
 * Update learning streak for a user
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - The updated streak info
 */
export const updateLearningStreak = async (userId) => {
  try {
    const streakRef = doc(db, 'learningStreaks', userId);
    const streakDoc = await getDoc(streakRef);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    if (!streakDoc.exists()) {
      // Initialize streak
      const newStreak = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: serverTimestamp(),
        streakHistory: [{
          date: today.toISOString().split('T')[0],
          hasActivity: true
        }]
      };
      
      await updateDoc(streakRef, newStreak);
      return newStreak;
    }
    
    // Get existing streak data
    const data = streakDoc.data();
    const lastActivityDate = data.lastActivityDate?.toDate();
    
    if (!lastActivityDate) {
      // Handle case with no previous activity date
      const updatedStreak = {
        currentStreak: 1,
        longestStreak: Math.max(1, data.longestStreak || 0),
        lastActivityDate: serverTimestamp(),
        streakHistory: [{
          date: today.toISOString().split('T')[0],
          hasActivity: true
        }]
      };
      
      await updateDoc(streakRef, updatedStreak);
      return {
        ...data,
        ...updatedStreak
      };
    }
    
    // Normalize last activity date to start of day
    const lastDate = new Date(lastActivityDate);
    lastDate.setHours(0, 0, 0, 0);
    
    // Calculate days difference
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let updatedStreak;
    
    if (diffDays === 0) {
      // Same day, no streak change
      updatedStreak = {
        lastActivityDate: serverTimestamp()
      };
    } else if (diffDays === 1) {
      // Next day, increment streak
      const newCurrentStreak = data.currentStreak + 1;
      updatedStreak = {
        currentStreak: newCurrentStreak,
        longestStreak: Math.max(newCurrentStreak, data.longestStreak || 0),
        lastActivityDate: serverTimestamp(),
        streakHistory: arrayUnion({
          date: today.toISOString().split('T')[0],
          hasActivity: true
        })
      };
    } else {
      // Streak broken
      updatedStreak = {
        currentStreak: 1,
        lastActivityDate: serverTimestamp(),
        streakHistory: arrayUnion({
          date: today.toISOString().split('T')[0],
          hasActivity: true
        })
      };
    }
    
    await updateDoc(streakRef, updatedStreak);
    
    return {
      ...data,
      ...updatedStreak,
      lastActivityDate: new Date()
    };
  } catch (error) {
    console.error('Error updating learning streak:', error);
    throw error;
  }
};

/**
 * Get AI-powered learning insights for a user
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - Learning insights
 */
export const getLearningInsights = async (userId) => {
  try {
    // Get user's learning activities
    const activities = await getLearningActivities(userId, { limit: 100 });
    
    // Get progress summary
    const summary = await getProgressSummary(userId);
    
    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Prepare data for AI analysis
    const analysisData = {
      activities: activities.map(a => ({
        type: a.type,
        subjectId: a.subjectId,
        topicId: a.topicId,
        conceptId: a.conceptId,
        score: a.score,
        timeSpent: a.timeSpent,
        timestamp: a.timestamp
      })),
      summary: {
        subjectsStudied: summary.subjectsStudied,
        topicsStudied: summary.topicsStudied.length,
        conceptsLearned: summary.conceptsLearned.length,
        totalActivities: summary.totalActivities,
        totalTimeSpent: summary.totalTimeSpent,
        activityBreakdown: summary.activityBreakdown
      },
      user: {
        grade: userData.grade,
        learningStyle: userData.learningStyle,
        interests: userData.interests,
        goals: userData.goals
      }
    };
    
    // Call AI API for insights
    const insights = await getAIInsights(analysisData);
    
    return insights;
  } catch (error) {
    console.error('Error getting learning insights:', error);
    return getMockInsights();
  }
};

/**
 * Get AI-powered insights from the API
 * @param {object} analysisData - Data for AI analysis
 * @returns {Promise<object>} - AI insights
 */
const getAIInsights = async (analysisData) => {
  try {
    // For development/testing, return mock insights if no API key
    if (!API_KEY) {
      console.warn('No API key found, using mock insights');
      return getMockInsights();
    }
    
    // Prepare prompt for AI
    const prompt = {
      messages: [
        {
          role: "system",
          content: `You are an AI educational analyst for MwanaAI, an educational platform. 
          Analyze the student's learning data and provide personalized insights.
          Focus on strengths, areas for improvement, learning patterns, and recommendations.
          Format your response as JSON with the following structure:
          {
            "strengths": [list of strengths with explanations],
            "areasForImprovement": [list of areas that need work],
            "learningPatterns": [observed patterns in learning behavior],
            "recommendations": [specific actionable recommendations],
            "timeManagement": {analysis of time spent learning},
            "subjectSpecificInsights": {insights for each subject}
          }`
        },
        {
          role: "user",
          content: `Please analyze this student's learning data and provide insights: ${JSON.stringify(analysisData)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // Call AI API
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
        max_tokens: prompt.max_tokens
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      // If no JSON found, return the raw content
      return {
        raw: content,
        error: "Could not parse JSON from response"
      };
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return getMockInsights();
    }
  } catch (error) {
    console.error('Error getting AI insights:', error);
    return getMockInsights();
  }
};

/**
 * Get mock insights for development/testing
 * @returns {object} - Mock insights
 */
const getMockInsights = () => {
  return {
    strengths: [
      "Strong performance in mathematics, particularly in algebra topics",
      "Consistent engagement with science subjects",
      "Good completion rate for assigned quizzes and assessments"
    ],
    areasForImprovement: [
      "History topics show lower engagement and completion rates",
      "Language arts assignments often take longer than average to complete",
      "Irregular study patterns with gaps between learning sessions"
    ],
    learningPatterns: [
      "Most active learning occurs in the evenings (7-9pm)",
      "Tends to focus deeply on one subject at a time rather than alternating",
      "Performs better on visual learning materials compared to text-only resources"
    ],
    recommendations: [
      "Schedule regular short study sessions for history to build consistency",
      "Try audio-based learning resources for language arts topics",
      "Consider morning study sessions for difficult topics when focus is higher",
      "Review algebra concepts before moving to advanced calculus topics"
    ],
    timeManagement: {
      mostEfficientSubject: "Mathematics",
      leastEfficientSubject: "Language Arts",
      recommendedSessionLength: "25-30 minutes with 5-minute breaks",
      optimalStudyTime: "Morning (8-10am) based on performance patterns"
    },
    subjectSpecificInsights: {
      mathematics: {
        strengths: ["Algebra", "Geometry"],
        weaknesses: ["Statistics"],
        recommendations: ["Focus on probability concepts", "Practice more word problems"]
      },
      science: {
        strengths: ["Biology", "Earth Science"],
        weaknesses: ["Physics concepts"],
        recommendations: ["Review force and motion fundamentals", "Try more interactive experiments"]
      },
      history: {
        strengths: ["Modern history"],
        weaknesses: ["Ancient civilizations"],
        recommendations: ["Use timeline visualization tools", "Connect concepts to modern examples"]
      }
    }
  };
};

/**
 * Get recommended next steps for a user
 * @param {string} userId - The user ID
 * @returns {Promise<array>} - Recommended next steps
 */
export const getRecommendedNextSteps = async (userId) => {
  try {
    // Get user's learning activities
    const activities = await getLearningActivities(userId, { limit: 50 });
    
    // Get progress summary
    const summary = await getProgressSummary(userId);
    
    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    // Identify subjects and topics the user has been studying
    const recentSubjects = [...new Set(activities
      .slice(0, 10)
      .map(activity => activity.subjectId)
      .filter(Boolean))];
    
    const recentTopics = [...new Set(activities
      .slice(0, 10)
      .map(activity => activity.topicId)
      .filter(Boolean))];
    
    // Get recommendations based on recent activity
    const recommendations = [];
    
    // 1. Continue where left off
    if (activities.length > 0) {
      const mostRecent = activities[0];
      
      if (mostRecent.subjectId) {
        const subjectDoc = await getDoc(doc(db, 'subjects', mostRecent.subjectId));
        
        if (subjectDoc.exists()) {
          recommendations.push({
            type: 'continue',
            title: `Continue ${subjectDoc.data().name}`,
            description: 'Pick up where you left off',
            subjectId: mostRecent.subjectId,
            topicId: mostRecent.topicId,
            priority: 'high'
          });
        }
      }
    }
    
    // 2. Suggested topics to explore next
    for (const subjectId of recentSubjects) {
      // Get topics for this subject
      const topicsQuery = query(
        collection(db, 'topics'),
        where('subjectId', '==', subjectId)
      );
      
      const topicsSnapshot = await getDocs(topicsQuery);
      const topics = topicsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Find topics the user hasn't studied yet
      const studiedTopicIds = new Set(summary.topicsStudied || []);
      const newTopics = topics.filter(topic => !studiedTopicIds.has(topic.id));
      
      if (newTopics.length > 0) {
        // Get subject name
        const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
        
        if (subjectDoc.exists()) {
          const subjectName = subjectDoc.data().name;
          
          // Add recommendation for a new topic
          recommendations.push({
            type: 'new_topic',
            title: `Explore ${newTopics[0].name}`,
            description: `New topic in ${subjectName}`,
            subjectId,
            topicId: newTopics[0].id,
            priority: 'medium'
          });
        }
      }
    }
    
    // 3. Review recommendations for topics with low scores
    const lowScoreActivities = activities.filter(
      activity => activity.score !== null && activity.score < 70
    );
    
    if (lowScoreActivities.length > 0) {
      const lowScoreTopics = [...new Set(lowScoreActivities
        .map(activity => activity.topicId)
        .filter(Boolean))];
      
      for (const topicId of lowScoreTopics.slice(0, 2)) {
        const topicDoc = await getDoc(doc(db, 'topics', topicId));
        
        if (topicDoc.exists()) {
          recommendations.push({
            type: 'review',
            title: `Review ${topicDoc.data().name}`,
            description: 'Strengthen your understanding of this topic',
            subjectId: topicDoc.data().subjectId,
            topicId,
            priority: 'high'
          });
        }
      }
    }
    
    // 4. Practice recommendations
    const practiceNeededTopics = recentTopics.filter(topicId => {
      const topicActivities = activities.filter(a => a.topicId === topicId);
      const assessmentActivities = topicActivities.filter(a => 
        a.type === 'quiz_completed' || a.type === 'assessment_completed'
      );
      
      // If there are few or no assessments for this topic, suggest practice
      return assessmentActivities.length < 2;
    });
    
    for (const topicId of practiceNeededTopics.slice(0, 2)) {
      const topicDoc = await getDoc(doc(db, 'topics', topicId));
      
      if (topicDoc.exists()) {
        recommendations.push({
          type: 'practice',
          title: `Practice ${topicDoc.data().name}`,
          description: 'Take a quiz to test your knowledge',
          subjectId: topicDoc.data().subjectId,
          topicId,
          priority: 'medium'
        });
      }
    }
    
    // 5. New subject recommendation if user has been focused on limited subjects
    if (summary.subjectsStudied?.length < 3) {
      // Get popular subjects
      const subjectsQuery = query(
        collection(db, 'subjects'),
        orderBy('popularity', 'desc'),
        limit(5)
      );
      
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const popularSubjects = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Find a subject the user hasn't studied
      const newSubject = popularSubjects.find(
        subject => !summary.subjectsStudied?.includes(subject.id)
      );
      
      if (newSubject) {
        recommendations.push({
          type: 'new_subject',
          title: `Discover ${newSubject.name}`,
          description: 'Explore a new subject',
          subjectId: newSubject.id,
          priority: 'low'
        });
      }
    }
    
    return recommendations;
  } catch (error) {
    console.error('Error getting recommended next steps:', error);
    
    // Return basic recommendations if there's an error
    return [
      {
        type: 'general',
        title: 'Explore available subjects',
        description: 'Browse our catalog of subjects and topics',
        priority: 'medium'
      },
      {
        type: 'general',
        title: 'Take a placement quiz',
        description: 'Find out which topics match your current knowledge level',
        priority: 'high'
      },
      {
        type: 'general',
        title: 'Set learning goals',
        description: 'Define what you want to achieve in your learning journey',
        priority: 'medium'
      }
    ];
  }
};
