/**
 * Recommendation Service
 * 
 * This service provides functions for generating personalized content recommendations
 * based on user preferences, learning history, and content metadata.
 */

/**
 * Generate personalized resource recommendations for a user
 * 
 * @param {Array} resources - All available resources
 * @param {Object} userProfile - User profile with preferences and history
 * @param {Array} userInteractions - User's past interactions with resources
 * @returns {Array} - Sorted array of recommended resources
 */
export const getPersonalizedRecommendations = (resources, userProfile, userInteractions = []) => {
  if (!resources || resources.length === 0) {
    return [];
  }

  // Extract user preferences
  const { 
    subjects = [], 
    gradeLevel = '',
    interests = [],
    learningStyle = 'visual' // default learning style
  } = userProfile || {};

  // Calculate scores for each resource
  const scoredResources = resources.map(resource => {
    let score = 0;
    
    // Base score - all resources start with a small base score
    score += 1;
    
    // Subject match (high weight)
    if (subjects.includes(resource.subject)) {
      score += 5;
    }
    
    // Grade level match (high weight)
    if (resource.gradeLevel === gradeLevel) {
      score += 5;
    }
    
    // Tag matches with interests (medium weight)
    if (resource.tags && interests.length > 0) {
      const matchingTags = resource.tags.filter(tag => 
        interests.some(interest => interest.toLowerCase() === tag.toLowerCase())
      );
      score += matchingTags.length * 3;
    }
    
    // Format preference based on learning style (medium weight)
    if (learningStyle === 'visual' && ['Video', 'Interactive'].includes(resource.format)) {
      score += 3;
    } else if (learningStyle === 'auditory' && ['Audio', 'Video'].includes(resource.format)) {
      score += 3;
    } else if (learningStyle === 'reading' && ['PDF', 'Document'].includes(resource.format)) {
      score += 3;
    }
    
    // Featured resources get a small boost
    if (resource.featured) {
      score += 2;
    }
    
    // Adjust score based on past interactions
    const interaction = userInteractions.find(i => i.resourceId === resource.id);
    if (interaction) {
      // Boost score for resources with positive interactions
      if (interaction.rating > 3) {
        score += 2;
      }
      
      // Reduce score for resources already viewed (to promote variety)
      if (interaction.viewed) {
        score -= 1;
      }
      
      // Boost score for resources that were saved/bookmarked
      if (interaction.saved) {
        score += 2;
      }
      
      // Reduce score for resources that were explicitly disliked
      if (interaction.rating < 2) {
        score -= 3;
      }
    }
    
    return {
      ...resource,
      recommendationScore: score
    };
  });
  
  // Sort by score (descending)
  return scoredResources.sort((a, b) => b.recommendationScore - a.recommendationScore);
};

/**
 * Get related resources based on a specific resource
 * 
 * @param {Object} targetResource - The resource to find related items for
 * @param {Array} allResources - All available resources
 * @returns {Array} - Array of related resources sorted by relevance
 */
export const getRelatedResources = (targetResource, allResources) => {
  if (!targetResource || !allResources || allResources.length === 0) {
    return [];
  }
  
  // Filter out the target resource itself
  const otherResources = allResources.filter(r => r.id !== targetResource.id);
  
  // Calculate similarity scores
  const scoredResources = otherResources.map(resource => {
    let similarityScore = 0;
    
    // Same subject (high weight)
    if (resource.subject === targetResource.subject) {
      similarityScore += 5;
    }
    
    // Same grade level (medium weight)
    if (resource.gradeLevel === targetResource.gradeLevel) {
      similarityScore += 3;
    }
    
    // Same category (medium weight)
    if (resource.category === targetResource.category) {
      similarityScore += 3;
    }
    
    // Tag overlap (medium weight)
    if (resource.tags && targetResource.tags) {
      const sharedTags = resource.tags.filter(tag => 
        targetResource.tags.includes(tag)
      );
      similarityScore += sharedTags.length * 2;
    }
    
    return {
      ...resource,
      similarityScore
    };
  });
  
  // Sort by similarity score (descending) and take top results
  return scoredResources
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5); // Limit to 5 related resources
};

/**
 * Generate topic recommendations based on user's learning progress
 * 
 * @param {Array} topics - All available topics
 * @param {Object} userProgress - User's learning progress data
 * @returns {Array} - Recommended topics to study next
 */
export const getNextTopicsToStudy = (topics, userProgress) => {
  if (!topics || topics.length === 0 || !userProgress) {
    return [];
  }
  
  // Get topics the user has already completed
  const completedTopicIds = Object.keys(userProgress)
    .filter(topicId => userProgress[topicId].completed);
  
  // Get topics the user has started but not completed
  const inProgressTopicIds = Object.keys(userProgress)
    .filter(topicId => !userProgress[topicId].completed && userProgress[topicId].started);
  
  // Find topics that are related to completed topics but not yet started
  const recommendedTopics = topics.filter(topic => {
    // Skip topics that are already completed or in progress
    if (completedTopicIds.includes(topic.id) || inProgressTopicIds.includes(topic.id)) {
      return false;
    }
    
    // Check if this topic is related to any completed topics
    const isRelatedToCompleted = topic.relatedTopics && topic.relatedTopics.some(relatedTopic => {
      const relatedTopicObj = topics.find(t => t.name === relatedTopic);
      return relatedTopicObj && completedTopicIds.includes(relatedTopicObj.id);
    });
    
    return isRelatedToCompleted;
  });
  
  // Sort by difficulty (easier topics first)
  const difficultyOrder = {
    'beginner': 1,
    'easy': 2,
    'medium': 3,
    'advanced': 4,
    'expert': 5
  };
  
  return recommendedTopics.sort((a, b) => 
    difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
  );
};
