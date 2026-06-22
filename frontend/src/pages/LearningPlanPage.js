import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PersonalizedPlan from '../components/PersonalizedPlan';
import PersonalizedPlanButton from '../components/PersonalizedPlanButton';
import Card from '../components/Card';
import { getLatestAssessment } from '../services/assessmentService';
import { getUserProfile } from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * A dedicated page for viewing the full personalized learning plan
 */
const LearningPlanPage = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch user profile
        const userProfile = await getUserProfile();
        setUser(userProfile);
        
        // Fetch latest assessment
        const assessment = await getLatestAssessment();
        setLatestAssessment(assessment);
      } catch (error) {
        console.error('Error fetching data for learning plan page:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle when AI plan is generated
  const handlePlanGenerated = (plan) => {
    setAiPlan(plan);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!latestAssessment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Personalized Learning Plan</h1>
          </Card.Header>
          <Card.Body>
            <div className="text-center py-12">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">No Assessment Found</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You need to complete at least one assessment before we can generate a personalized learning plan for you.
              </p>
              <button
                onClick={() => navigate('/assessments')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                Take an Assessment
              </button>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <Card.Header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Personalized Learning Plan</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Based on your {latestAssessment.subject} assessment ({latestAssessment.score}%)
            </div>
            <PersonalizedPlanButton 
              assessment={latestAssessment}
              onPlanGenerated={handlePlanGenerated}
              buttonText="Regenerate Plan"
              className="flex-shrink-0"
            />
          </div>
        </Card.Header>
        <Card.Body>
          <div className="p-4">
            {aiPlan ? (
              <PersonalizedPlan plan={aiPlan} />
            ) : (
              <div className="text-center py-12">
                <div className="mb-6">
                  <svg className="w-16 h-16 mx-auto text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-gray-900 mb-2">Generate Your Learning Plan</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Click the button below to generate a personalized learning plan based on your assessment results.
                </p>
                <PersonalizedPlanButton 
                  assessment={latestAssessment}
                  onPlanGenerated={handlePlanGenerated}
                  buttonText="Generate Learning Plan"
                  className="mx-auto"
                />
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default LearningPlanPage;
