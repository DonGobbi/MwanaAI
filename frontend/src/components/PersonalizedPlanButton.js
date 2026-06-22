import React, { useState } from 'react';
import aiService from '../services/aiService';
import PersonalizedPlan from './PersonalizedPlan';

/**
 * A button component that generates and displays a personalized learning plan
 * based on the user's latest assessment results.
 * 
 * @param {Object} assessment - The assessment data to base the learning plan on
 * @param {string} className - CSS class name for styling
 * @param {Function} onPlanGenerated - Optional callback function that receives the generated plan
 * @param {string} buttonText - Optional custom text for the button
 */
const PersonalizedPlanButton = ({ 
  assessment, 
  className, 
  onPlanGenerated,
  buttonText = 'Generate Personalized Learning Plan'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [learningPlan, setLearningPlan] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  const [error, setError] = useState(null);

  const generatePlan = async () => {
    if (!assessment) {
      setError('No assessment data available. Please complete an assessment first.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      console.log('Generating personalized learning plan for:', assessment.subject);
      
      // Prepare assessment data for AI service
      const assessmentData = {
        subject: assessment.subject,
        level: assessment.level || 'Intermediate',
        score: assessment.score,
        questions: assessment.questions || [],
        userAnswers: assessment.userAnswers || {}
      };
      
      console.log('Assessment data prepared:', assessmentData);
      
      // Call AI service to generate learning plan
      const plan = await aiService.generateLearningPlan(assessmentData);
      console.log('Learning plan generated:', plan);
      
      setLearningPlan(plan);
      setShowPlan(true);
      
      // Call the callback function if provided
      if (typeof onPlanGenerated === 'function') {
        onPlanGenerated(plan);
      }
    } catch (error) {
      console.error('Error generating personalized learning plan:', error);
      setError('Failed to generate personalized learning plan. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  const closePlan = () => {
    setShowPlan(false);
  };

  return (
    <div className={className}>
      {!showPlan ? (
        <div className="text-center">
          <button
            onClick={generatePlan}
            disabled={isGenerating}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Generating Plan...
              </>
            ) : (
              buttonText
            )}
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Your Personalized Learning Plan</h3>
            <button
              onClick={closePlan}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <PersonalizedPlan plan={learningPlan} />
        </div>
      )}
    </div>
  );
};

export default PersonalizedPlanButton;
