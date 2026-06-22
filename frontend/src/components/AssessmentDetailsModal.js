import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import { Link } from 'react-router-dom';

const AssessmentDetailsModal = ({
  assessment,
  questions,
  onClose,
  isLoading,
}) => {
  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingExplanations, setLoadingExplanations] = useState({});
  const [learningPlan, setLearningPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showLearningPlan, setShowLearningPlan] = useState(false);

  // Function to generate personalized learning plan
  const generatePersonalizedPlan = async () => {
    if (!assessment || !questions || questions.length === 0) {
      console.error(
        'Cannot generate learning plan: missing assessment or questions data'
      );
      return;
    }
    try {
      setIsGeneratingPlan(true);
      console.log(
        'Generating personalized learning plan for:',
        assessment.subject
      );

      // Prepare assessment data for AI service
      const assessmentData = {
        subject: assessment.subject,
        level: assessment.level || 'Intermediate',
        score: assessment.score,
        questions: questions,
        userAnswers: questions.reduce((answers, q) => {
          answers[q.id] = q.userAnswer;
          return answers;
        }, {}),
      };
      console.log('Assessment data prepared:', assessmentData);

      // Call AI service to generate learning plan
      const plan = await aiService.generateLearningPlan(assessmentData);
      console.log('Learning plan generated:', plan);
      setLearningPlan(plan);
      setShowLearningPlan(true);
    } catch (error) {
      console.error('Error generating personalized learning plan:', error);
      alert(
        'Failed to generate personalized learning plan. Please try again later.'
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (!assessment) return null;

  // Get the questions for this assessment
  const subjectQuestions =
    questions && questions.length > 0 ? questions : assessment.questions || [];

  // Helper function to get option letter
  const getOptionLetter = (index) => String.fromCharCode(65 + index);

  // Generate AI explanation for a question
  const generateExplanation = async (question) => {
    try {
      console.log('Generating explanation for question:', question);
      setLoadingExplanations((prev) => ({ ...prev, [question.id]: true }));

      const userAnswer =
        question.userAnswer || assessment.answers?.[question.id];
      const correctAnswer = question.correctAnswer;
      console.log('Question data:', {
        questionText: question.question || question.text,
        userAnswer,
        correctAnswer,
      });

      console.log('Calling AI service for explanation...');
      const explanation = await aiService.generateExplanation(
        question,
        userAnswer,
        correctAnswer
      );
      console.log('Received AI explanation:', explanation);
      setAiExplanations((prev) => ({ ...prev, [question.id]: explanation }));
    } catch (error) {
      console.error('Error generating explanation:', error);
      setAiExplanations((prev) => ({
        ...prev,
        [question.id]: 'Failed to generate AI explanation. Please try again.',
      }));
    } finally {
      setLoadingExplanations((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Helper to get color class for topic score
  const getScoreColorClass = (score) => {
    if (score >= 80) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-1 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-screen overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-2 sm:px-6 py-2 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              Assessment Details
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {assessment.subjectName || assessment.subject} • Completed on{' '}
              {formatDate(assessment.dateCompleted || assessment.timestamp)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="bg-gray-100 rounded-lg px-2 sm:px-3 py-1">
              <span className="text-xs sm:text-sm text-gray-600">Score: </span>
              <span className="font-bold text-base sm:text-lg">
                {assessment.scorePercentage ||
                  Math.round(assessment.score * 100)}
                %
              </span>
            </div>
            <div
              className={`rounded-lg px-2 sm:px-3 py-1 ${
                assessment.level === 'Advanced'
                  ? 'bg-green-100 text-green-800'
                  : assessment.level === 'Intermediate'
                  ? 'bg-blue-100 text-blue-800'
                  : assessment.level === 'Basic'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              <span className="text-xs sm:text-sm font-medium">
                {assessment.level}
              </span>
            </div>
            <button
              onClick={onClose}
              className="ml-auto sm:ml-0 text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
          <h3 className="text-sm sm:text-lg font-bold mb-3 sm:mb-6">
            Assessment Questions and Answers
          </h3>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading assessment details...</p>
            </div>
          ) : subjectQuestions.length > 0 ? (
            <div className="space-y-6 sm:space-y-10">
              {subjectQuestions.map((question, index) => {
                const userAnswer =
                  question.userAnswer ||
                  (assessment.answers && assessment.answers[question.id]);
                const isCorrect = userAnswer === question.correctAnswer;
                const questionText =
                  question.text ||
                  question.question ||
                  `Question ${question.id}`;
                return (
                  <div
                    key={question.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 px-2 py-2 sm:px-4 sm:py-3 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-800">
                          Question {index + 1}
                        </h3>
                        {userAnswer && (
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              isCorrect
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 sm:p-4">
                      <p className="text-gray-800 mb-2 sm:mb-4 font-medium text-xs sm:text-sm">
                        {questionText}
                      </p>
                      <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-4">
                        {question.options &&
                          question.options.map((option, optIndex) => {
                            const optionLetter = getOptionLetter(optIndex);
                            const isUserAnswer = userAnswer === option;
                            const isCorrectAnswer =
                              question.correctAnswer === option;
                            let optionClass =
                              'border rounded-md p-3 flex items-center text-xs sm:text-sm';
                            if (isUserAnswer && isCorrectAnswer) {
                              optionClass += ' bg-green-50 border-green-300';
                            } else if (isUserAnswer && !isCorrectAnswer) {
                              optionClass += ' bg-red-50 border-red-300';
                            } else if (isCorrectAnswer) {
                              optionClass += ' bg-green-50 border-green-300';
                            }
                            return (
                              <div key={optIndex} className={optionClass}>
                                <div className="flex-1">
                                  <p className="text-sm">
                                    <span className="font-medium mr-2">
                                      {optionLetter}.{' '}
                                    </span>
                                    {option}
                                  </p>
                                </div>
                                {isUserAnswer && (
                                  <div className="flex-shrink-0 ml-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                      Your Answer
                                    </span>
                                  </div>
                                )}
                                {isCorrectAnswer && (
                                  <div className="flex-shrink-0 ml-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                      Correct Answer
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                      {/* Explanation */}
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-2 sm:p-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">
                          Explanation
                        </h4>
                        {loadingExplanations[question.id] ? (
                          <div className="flex items-center space-x-2 py-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                            <p className="text-sm text-blue-700">
                              Generating AI explanation...
                            </p>
                          </div>
                        ) : aiExplanations[question.id] ? (
                          <div>
                            <p className="text-sm text-blue-700">
                              {aiExplanations[question.id]}
                            </p>
                            <div className="mt-2 text-xs text-blue-500 flex items-center">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                              </svg>
                              Generated by AI
                            </div>
                          </div>
                        ) : question.explanation &&
                          question.explanation !==
                            'No explanation available for this question.' ? (
                          <div>
                            <p className="text-xs sm:text-sm text-blue-700">
                              {question.explanation}
                            </p>
                            <div className="mt-2 text-xs text-gray-500">
                              Standard explanation
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs sm:text-sm text-blue-700">
                              {aiExplanations[question.id] ||
                                question.explanation ||
                                'No explanation available for this question.'}
                            </p>
                            <button
                              onClick={() => generateExplanation(question)}
                              className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                              Generate AI Explanation
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No questions available for this assessment.
              </p>
            </div>
          )}
        </div>

        {/* Personalized Learning Plan Section */}
        <div className="border-t border-gray-200 pt-2 sm:pt-6 mt-4 sm:mt-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold">
              Personalized Learning Plan
            </h3>
            {!showLearningPlan && !isGeneratingPlan && (
              <button
                onClick={generatePersonalizedPlan}
                disabled={isGeneratingPlan}
                className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPlan ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-1 mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      ></path>
                    </svg>
                    Generate Plan
                  </>
                )}
              </button>
            )}
          </div>

          {isGeneratingPlan ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500 mb-4"></div>
              <p className="text-gray-600">
                Generating your personalized learning plan...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This may take a few moments
              </p>
            </div>
          ) : showLearningPlan && learningPlan ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Weak Topics */}
              {learningPlan.weakTopics &&
                learningPlan.weakTopics.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-2">
                      Areas to Improve
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {learningPlan.weakTopics.map((topic, index) => (
                        <div
                          key={index}
                          className="border border-red-100 bg-red-50 rounded-md p-1 sm:p-3"
                        >
                          <div className="flex items-center space-x-2 mb-1.5 sm:mb-2">
                            <div
                              className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full ${getScoreColorClass(
                                topic.score
                              )}`}
                            ></div>
                            <p className="text-xs sm:text-sm font-medium">
                              {topic.name}
                            </p>
                            <span className="text-xs text-gray-500">
                              {Math.round(topic.score)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Learning Path */}
              {learningPlan.learningPath &&
                learningPlan.learningPath.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-md font-medium text-gray-800 mb-1 sm:mb-2">
                      Recommended Learning Path
                    </h4>
                    <div className="mt-2 sm:mt-6 space-y-2 sm:space-y-6">
                      {learningPlan.learningPath.map((module, index) => (
                        <div
                          key={index}
                          className="border border-blue-100 bg-blue-50 rounded-md p-1 sm:p-3"
                        >
                          <p className="font-medium text-blue-800 text-sm sm:text-base">
                            {module.title}
                          </p>
                          <p className="text-xs sm:text-sm text-blue-700 mt-0.5 sm:mt-1">
                            {module.description}
                          </p>
                          {module.link && (
                            <a
                              href={module.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 sm:mt-2 inline-block"
                            >
                              Access module
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Recommended Resources */}
              {learningPlan.recommendedResources &&
                learningPlan.recommendedResources.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-md font-medium text-gray-800 mb-1 sm:mb-2">
                      Recommended Resources
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {learningPlan.recommendedResources.map(
                        (resource, index) => (
                          <div
                            key={index}
                            className="border border-green-100 bg-green-50 rounded-md p-1 sm:p-3"
                          >
                            <p className="font-medium text-green-800 text-sm sm:text-base">
                              {resource.title}
                            </p>
                            <p className="text-xs sm:text-sm text-green-700 mt-0.5 sm:mt-1">
                              {resource.description}
                            </p>
                            {resource.link && (
                              <a
                                href={resource.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:underline mt-1 sm:mt-2 inline-block"
                              >
                                Access resource
                              </a>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Time to Mastery */}
              {learningPlan.estimatedTimeToMastery && (
                <div className="border border-purple-100 bg-purple-50 rounded-md p-2 sm:p-4">
                  <h4 className="text-sm sm:text-md font-medium text-purple-800 mb-0.5 sm:mb-1">
                    Estimated Time to Mastery
                  </h4>
                  <p className="text-xs sm:text-sm text-purple-700">
                    {learningPlan.estimatedTimeToMastery}
                  </p>
                </div>
              )}

              {/* Next Steps */}
              {learningPlan.nextSteps && (
                <div>
                  <h4 className="text-sm sm:text-md font-medium text-gray-800 mb-1 sm:mb-2">
                    Next Steps
                  </h4>
                  <div className="space-y-1 sm:space-y-2">
                    {Array.isArray(learningPlan.nextSteps) ? (
                      learningPlan.nextSteps.map((step, index) => (
                        <div key={index} className="flex items-start">
                          <span className="text-primary-600 mr-2">
                            {index + 1}.{' '}
                          </span>
                          <p className="text-xs sm:text-sm text-gray-700">
                            {step}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start">
                        <p className="text-xs sm:text-sm text-gray-700">
                          {learningPlan.nextSteps}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* View All Resources Button */}
              <div className="flex justify-center mt-2 sm:mt-4">
                <Link
                  to="/resources"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  View All Learning Resources
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 sm:py-8 border border-gray-200 rounded-md bg-gray-50">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No learning plan generated yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate a personalized learning plan based on your assessment
                results.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-2 sm:px-6 py-2 sm:py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentDetailsModal;
