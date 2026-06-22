import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import aiService from '../services/aiService';
import LoadingOverlay from './LoadingOverlay';

const PersonalizedPlan = ({ assessmentData, subject, level, plan }) => {
  const [loading, setLoading] = useState(true);
  const [aiPlan, setAiPlan] = useState(null);
  const [error, setError] = useState(null);
  
  // If plan is directly provided, use it immediately
  useEffect(() => {
    if (plan) {
      setAiPlan(plan);
      setLoading(false);
    }
  }, [plan]);
  
  // Generate AI-powered learning plan when component mounts or assessment data changes
  // Only if plan is not directly provided
  useEffect(() => {
    const generateAiPlan = async () => {
      try {
        setLoading(true);
        // Call the AI service to generate a personalized learning plan
        const plan = await aiService.generateLearningPlan(assessmentData);
        setAiPlan(plan);
      } catch (err) {
        console.error('Error generating AI learning plan:', err);
        setError('Unable to generate personalized plan. Using default recommendations.');
      } finally {
        setLoading(false);
      }
    };
    
    if (assessmentData && !plan) {
      generateAiPlan();
    }
  }, [assessmentData, plan]);
  
  // Generate learning path based on assessment results
  const generateLearningPath = () => {
    const paths = {
      'mathematics': {
        'Beginner': [
          { title: 'Number Basics', description: 'Learn about integers, decimals, and basic operations', duration: '2 weeks' },
          { title: 'Introduction to Algebra', description: 'Understanding variables and simple equations', duration: '3 weeks' },
          { title: 'Geometry Fundamentals', description: 'Basic shapes and measurements', duration: '2 weeks' }
        ],
        'Basic': [
          { title: 'Intermediate Algebra', description: 'Working with expressions and equations', duration: '3 weeks' },
          { title: 'Geometry & Measurement', description: 'Advanced shapes and spatial reasoning', duration: '2 weeks' },
          { title: 'Introduction to Statistics', description: 'Data analysis and probability', duration: '2 weeks' }
        ],
        'Intermediate': [
          { title: 'Advanced Algebra', description: 'Complex equations and functions', duration: '3 weeks' },
          { title: 'Trigonometry', description: 'Understanding angles and triangular relationships', duration: '3 weeks' },
          { title: 'Statistics & Probability', description: 'Advanced data analysis and prediction models', duration: '2 weeks' }
        ],
        'Advanced': [
          { title: 'Pre-Calculus', description: 'Preparation for calculus concepts', duration: '3 weeks' },
          { title: 'Calculus Fundamentals', description: 'Limits, derivatives, and integrals', duration: '4 weeks' },
          { title: 'Advanced Statistics', description: 'Statistical inference and hypothesis testing', duration: '3 weeks' }
        ]
      },
      'science': {
        'Beginner': [
          { title: 'Introduction to Scientific Method', description: 'Understanding how science works', duration: '2 weeks' },
          { title: 'Basic Biology', description: 'Cells, organisms, and ecosystems', duration: '3 weeks' },
          { title: 'Introduction to Chemistry', description: 'Matter, elements, and reactions', duration: '2 weeks' }
        ],
        'Basic': [
          { title: 'Human Biology', description: 'Body systems and functions', duration: '3 weeks' },
          { title: 'Chemistry in Daily Life', description: 'Chemical reactions around us', duration: '2 weeks' },
          { title: 'Introduction to Physics', description: 'Forces, motion, and energy', duration: '3 weeks' }
        ],
        'Intermediate': [
          { title: 'Genetics & Evolution', description: 'DNA, inheritance, and species development', duration: '3 weeks' },
          { title: 'Chemical Bonding & Reactions', description: 'How elements combine and interact', duration: '3 weeks' },
          { title: 'Physics of Energy & Waves', description: 'Light, sound, and energy transfer', duration: '3 weeks' }
        ],
        'Advanced': [
          { title: 'Molecular Biology', description: 'Advanced cell functions and biotechnology', duration: '3 weeks' },
          { title: 'Organic Chemistry', description: 'Carbon compounds and biochemistry', duration: '4 weeks' },
          { title: 'Advanced Physics', description: 'Electricity, magnetism, and modern physics', duration: '4 weeks' }
        ]
      },
      'history': {
        'Beginner': [
          { title: 'World History Overview', description: 'Major civilizations and time periods', duration: '3 weeks' },
          { title: 'Ancient Civilizations', description: 'Egypt, Greece, Rome, and more', duration: '3 weeks' },
          { title: 'Middle Ages', description: 'Medieval period and feudal systems', duration: '2 weeks' }
        ],
        'Basic': [
          { title: 'Renaissance & Exploration', description: 'Cultural rebirth and global discovery', duration: '3 weeks' },
          { title: 'Industrial Revolution', description: 'Technological and social changes', duration: '2 weeks' },
          { title: 'Modern History Foundations', description: 'Nation-building and global conflicts', duration: '3 weeks' }
        ],
        'Intermediate': [
          { title: 'World Wars & Global Conflicts', description: 'Major 20th century conflicts and impacts', duration: '3 weeks' },
          { title: 'Decolonization & Independence', description: 'End of empires and new nations', duration: '3 weeks' },
          { title: 'Contemporary Global Issues', description: 'Modern challenges and international relations', duration: '2 weeks' }
        ],
        'Advanced': [
          { title: 'Historical Analysis Methods', description: 'Approaches to studying and interpreting history', duration: '2 weeks' },
          { title: 'Specialized Historical Topics', description: 'In-depth study of specific regions or periods', duration: '4 weeks' },
          { title: 'Historiography', description: 'How history has been written and interpreted', duration: '3 weeks' }
        ]
      }
    };
    
    return paths[subject]?.[level] || paths['mathematics']['Beginner'];
  };
  
  // Generate recommended resources based on assessment results
  const generateRecommendedResources = () => {
    const resources = {
      'mathematics': {
        'Beginner': [
          { title: 'Basic Math Concepts', type: 'Video Series', link: '#', description: 'Fundamental mathematics explained simply' },
          { title: 'Introduction to Numbers', type: 'Interactive Tutorial', link: '#', description: 'Learn number operations through interactive exercises' },
          { title: 'Math Fundamentals', type: 'Practice Exercises', link: '#', description: 'Build your skills with guided practice problems' }
        ],
        'Basic': [
          { title: 'Algebra Essentials', type: 'Video Series', link: '#', description: 'Clear explanations of algebraic concepts' },
          { title: 'Geometry in Real Life', type: 'Interactive Tutorial', link: '#', description: 'Apply geometric principles to everyday situations' },
          { title: 'Math Problem Solving', type: 'Practice Exercises', link: '#', description: 'Develop your problem-solving strategies' }
        ],
        'Intermediate': [
          { title: 'Advanced Algebra Concepts', type: 'Video Series', link: '#', description: 'In-depth exploration of algebraic principles' },
          { title: 'Trigonometry Applications', type: 'Interactive Tutorial', link: '#', description: 'Practical applications of trigonometric functions' },
          { title: 'Statistical Analysis', type: 'Practice Exercises', link: '#', description: 'Analyze and interpret statistical data' }
        ],
        'Advanced': [
          { title: 'Calculus Foundations', type: 'Video Series', link: '#', description: 'Build a strong foundation in calculus' },
          { title: 'Advanced Mathematical Modeling', type: 'Interactive Tutorial', link: '#', description: 'Model complex systems using mathematics' },
          { title: 'Complex Problem Solving', type: 'Practice Exercises', link: '#', description: 'Tackle challenging mathematical problems' }
        ]
      },
      'science': {
        'Beginner': [
          { title: 'Science Basics', type: 'Video Series', link: '#', description: 'Introduction to scientific principles' },
          { title: 'Scientific Thinking', type: 'Interactive Tutorial', link: '#', description: 'Develop your scientific reasoning skills' },
          { title: 'Simple Science Experiments', type: 'Practice Exercises', link: '#', description: 'Hands-on activities to explore scientific concepts' }
        ],
        'Basic': [
          { title: 'Human Body Systems', type: 'Video Series', link: '#', description: 'Explore how the human body works' },
          { title: 'Chemistry in Action', type: 'Interactive Tutorial', link: '#', description: 'See chemical principles in everyday life' },
          { title: 'Physics Fundamentals', type: 'Practice Exercises', link: '#', description: 'Build your understanding of physical laws' }
        ],
        'Intermediate': [
          { title: 'Genetics and Heredity', type: 'Video Series', link: '#', description: 'Understand how traits are passed down' },
          { title: 'Chemical Reactions Explained', type: 'Interactive Tutorial', link: '#', description: 'Visualize and understand chemical processes' },
          { title: 'Energy and Forces', type: 'Practice Exercises', link: '#', description: 'Apply physics concepts to real-world problems' }
        ],
        'Advanced': [
          { title: 'Molecular Biology Techniques', type: 'Video Series', link: '#', description: 'Advanced methods in biological research' },
          { title: 'Organic Chemistry Principles', type: 'Interactive Tutorial', link: '#', description: 'Explore carbon-based compounds and reactions' },
          { title: 'Advanced Physics Concepts', type: 'Practice Exercises', link: '#', description: 'Tackle complex physics problems' }
        ]
      },
      'history': {
        'Beginner': [
          { title: 'World History Overview', type: 'Video Series', link: '#', description: 'Journey through major historical periods' },
          { title: 'Ancient Civilizations Tour', type: 'Interactive Tutorial', link: '#', description: 'Explore the ancient world virtually' },
          { title: 'Historical Timeline Activities', type: 'Practice Exercises', link: '#', description: 'Place historical events in context' }
        ],
        'Basic': [
          { title: 'Renaissance Art and Culture', type: 'Video Series', link: '#', description: 'Discover the rebirth of art and learning' },
          { title: 'Industrial Revolution Impact', type: 'Interactive Tutorial', link: '#', description: 'See how industry changed society' },
          { title: 'Nation Formation Case Studies', type: 'Practice Exercises', link: '#', description: 'Analyze how modern nations developed' }
        ],
        'Intermediate': [
          { title: 'World Wars Documentary Series', type: 'Video Series', link: '#', description: 'In-depth analysis of global conflicts' },
          { title: 'Decolonization Movement', type: 'Interactive Tutorial', link: '#', description: 'Understand the end of colonial empires' },
          { title: 'Modern History Analysis', type: 'Practice Exercises', link: '#', description: 'Evaluate contemporary historical events' }
        ],
        'Advanced': [
          { title: 'Historical Research Methods', type: 'Video Series', link: '#', description: 'Learn how historians investigate the past' },
          { title: 'Specialized Historical Case Studies', type: 'Interactive Tutorial', link: '#', description: 'Deep dives into specific historical topics' },
          { title: 'Historiographical Debates', type: 'Practice Exercises', link: '#', description: 'Engage with different interpretations of history' }
        ]
      }
    };
    
    return resources[subject]?.[level] || resources['mathematics']['Beginner'];
  };

  // Use AI-generated plan if available, otherwise fall back to mock data
  const learningPath = aiPlan?.learningPath || [];
  const recommendedResources = aiPlan?.recommendedResources || generateRecommendedResources();
  const subjectName = assessmentData?.subjectName || subject || 'this subject';
  const scorePercentage = assessmentData?.scorePercentage || 0;
  
  // Ensure weakTopics and strengths are properly formatted arrays with valid data
  const weakTopics = Array.isArray(aiPlan?.weakTopics) ? 
    aiPlan.weakTopics.map(topic => ({
      name: topic.name || topic.topic || 'Topic',
      score: typeof topic.score === 'number' ? topic.score : typeof topic.mastery === 'number' ? topic.mastery : 0
    })) : [];
    
  const strengths = Array.isArray(aiPlan?.strengths) ? 
    aiPlan.strengths.map(topic => ({
      name: topic.name || topic.topic || 'Topic',
      score: typeof topic.score === 'number' ? topic.score : typeof topic.mastery === 'number' ? topic.mastery : 0
    })) : [];
    
  const nextSteps = aiPlan?.nextSteps || 'Complete the recommended lessons and resources, then retake the assessment to track progress.';
  
  // Convert estimatedTimeToMastery to a string like "4-6 weeks" if it's a number
  const rawEstimatedTime = aiPlan?.estimatedTimeToMastery;
  const estimatedTimeToMastery = typeof rawEstimatedTime === 'number' ? 
    `${rawEstimatedTime}` : 
    typeof rawEstimatedTime === 'string' ? 
      rawEstimatedTime : 
      '4-6 weeks'; // Default value

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-blue-600 font-medium">Generating your personalized learning plan...</p>
          </div>
        </div>
      )}
      
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Personalized Learning Plan</h2>
        <p className="text-gray-600 mt-2">
          Based on your assessment score of <span className="font-semibold">{scorePercentage}%</span> in {subjectName}, 
          we've created a customized learning path to help you progress.
        </p>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
      
      {/* Areas to Focus On - Only shown if AI plan is available */}
      {weakTopics.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Areas to Focus On</h3>
          <ul className="list-disc pl-5 space-y-1">
            {weakTopics.map((topic, index) => (
              <li key={index} className="text-yellow-700">
                {topic.name} <span className="text-yellow-600 text-sm">({Math.round(topic.score)}% mastery)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Strengths - Only shown if AI plan is available */}
      {strengths.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Your Strengths</h3>
          <ul className="list-disc pl-5 space-y-1">
            {strengths.map((topic, index) => (
              <li key={index} className="text-green-700">
                {topic.name} <span className="text-green-600 text-sm">({Math.round(topic.score)}% mastery)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Learning Path Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Learning Path</h3>
        <div className="space-y-6">
          {Array.isArray(learningPath) && learningPath.map((item, index) => (
            <div key={index} className="flex">
              <div className="mr-4 flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                  {index + 1}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-800">{item.title || item.name || `Learning Step ${index + 1}`}</h4>
                <p className="text-gray-600 mt-1">{item.description || 'Complete this step to progress in your learning journey'}</p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Estimated time: {item.duration || item.timeEstimate || '1-2 weeks'}
                </div>
              </div>
            </div>
          ))}
          {(!Array.isArray(learningPath) || learningPath.length === 0) && (
            <p className="text-gray-500 italic">No learning path available. Please complete an assessment to generate recommendations.</p>
          )}
        </div>
      </div>

      {/* Estimated Time to Mastery */}
      <div className="mb-8 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
        <h3 className="text-lg font-semibold text-indigo-800 mb-2">Your Learning Journey</h3>
        <div className="flex items-center">
          <div className="w-auto px-3 h-16 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
            <span className="text-xl font-bold text-indigo-600">{estimatedTimeToMastery}</span>
          </div>
          <div>
            <p className="text-indigo-700">Estimated time to reach the next level</p>
            <p className="text-indigo-600 text-sm mt-1">Consistent practice will help you progress faster!</p>
          </div>
        </div>
      </div>
      
      {/* Recommended Resources */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Recommended Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(recommendedResources) && recommendedResources.map((resource, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-medium text-gray-800">{resource.title || resource.name || `Resource ${index + 1}`}</h4>
              <p className="text-sm text-gray-500 mt-1">{resource.type || resource.category || 'Learning Resource'}</p>
              <p className="text-xs text-gray-500 mt-1 mb-2">{resource.description || ''}</p>
              <Link 
                to={resource.link || resource.url || '/resources'} 
                className="text-blue-600 text-sm mt-2 inline-block hover:underline"
              >
                Access resource
              </Link>
            </div>
          ))}
          {(!Array.isArray(recommendedResources) || recommendedResources.length === 0) && (
            <div className="col-span-full text-center py-4">
              <p className="text-gray-500 italic">No specific resources available yet. Complete an assessment to get personalized recommendations.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Next Steps */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-xl font-semibold text-blue-800 mb-3">Next Steps</h3>
        <p className="text-blue-700 mb-4">
          {nextSteps}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Return to Dashboard
          </Link>
          <Link to="/ai-tutor" className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            Ask AI Tutor
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedPlan;
