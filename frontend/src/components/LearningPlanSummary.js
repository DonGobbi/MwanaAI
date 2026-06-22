import React from 'react';
import { Link } from 'react-router-dom';
import LearningPlanCard from './LearningPlanCard';

/**
 * A component that displays a summary of the personalized learning plan on the Dashboard.
 * Shows key information like weak topics, next steps, and estimated time to mastery.
 */
const LearningPlanSummary = ({ plan, subject }) => {
  if (!plan) return null;
  
  const { weakTopics, learningPath, estimatedTimeToMastery, nextSteps } = plan;
  
  // Get the first 3 weak topics
  const topWeakTopics = Array.isArray(weakTopics) ? weakTopics.slice(0, 3) : [];
  
  // Get the first learning path item
  const nextLearningStep = Array.isArray(learningPath) && learningPath.length > 0 ? learningPath[0] : null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Weak Topics Card */}
      <LearningPlanCard
        title="Areas to Focus On"
        icon={
          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        }
        linkTo="/ai-tutor"
        linkText="Get help with these topics"
        className="bg-yellow-50 border border-yellow-100"
      >
        {topWeakTopics.length > 0 ? (
          <ul className="space-y-2">
            {topWeakTopics.map((topic, index) => (
              <li key={index} className="flex items-center">
                <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                <span className="text-gray-700">{topic.name}</span>
                <span className="ml-auto text-sm text-yellow-600">{Math.round(topic.score)}% mastery</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-sm">No specific weak topics identified yet. Complete more assessments for personalized recommendations.</p>
        )}
      </LearningPlanCard>
      
      {/* Next Learning Step Card */}
      <LearningPlanCard
        title="Next Learning Step"
        icon={
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        }
        linkTo="/resources"
        linkText="View learning resources"
        className="bg-blue-50 border border-blue-100"
      >
        {nextLearningStep ? (
          <div>
            <h4 className="font-medium text-gray-800">{nextLearningStep.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{nextLearningStep.description}</p>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Estimated time: {nextLearningStep.duration}
            </div>
          </div>
        ) : (
          <p className="text-gray-600 text-sm">No learning steps available yet. Generate a personalized plan to see recommendations.</p>
        )}
      </LearningPlanCard>
      
      {/* Learning Journey Card */}
      <LearningPlanCard
        title="Your Learning Journey"
        icon={
          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        }
        className="bg-indigo-50 border border-indigo-100 md:col-span-2"
      >
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="flex-shrink-0 mb-3 md:mb-0 md:mr-4">
            <div className="w-auto px-3 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-600">{estimatedTimeToMastery || '4-6 weeks'}</span>
            </div>
          </div>
          <div>
            <p className="text-indigo-700 font-medium">Estimated time to reach the next level in {subject || 'this subject'}</p>
            <p className="text-indigo-600 text-sm mt-1">
              {nextSteps || 'Complete the recommended lessons and resources, then retake the assessment to track progress.'}
            </p>
          </div>
        </div>
      </LearningPlanCard>
      
      {/* View Full Plan Button */}
      <div className="md:col-span-2 mt-2 text-center">
        <Link 
          to="/learning-plan" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          View Your Full Learning Plan
        </Link>
      </div>
    </div>
  );
};

export default LearningPlanSummary;
