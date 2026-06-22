import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import LoadingOverlay from '../components/LoadingOverlay';
import firebaseService from '../services/firebaseService';
import aiService from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';

const Assessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [explanationLoading, setExplanationLoading] = useState({});
  const [aiExplanations, setAiExplanations] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [completedSubjects, setCompletedSubjects] = useState([]);
  const [hasCompletedAnyAssessment, setHasCompletedAnyAssessment] = useState(false);
  const [subjectAssessmentData, setSubjectAssessmentData] = useState({});

  // Check if user has already completed assessments and redirect if not authenticated
  // Test the Groq API connection when the component loads
  useEffect(() => {
    const testGroqApi = async () => {
      try {
        console.log('Testing Groq API connection...');
        const result = await aiService.testGroqApiConnection();
        console.log('Groq API test result:', result);
        if (result.success) {
          console.log('✅ Groq API connection successful!');
        } else {
          console.error('❌ Groq API connection failed:', result.message);
        }
      } catch (error) {
        console.error('Error testing Groq API:', error);
      }
    };
    
    // Run the API test
    testGroqApi();
  }, []);
  
  useEffect(() => {
    const checkAssessments = async () => {
      try {
        // Check if user is authenticated
        if (!currentUser) {
          navigate('/login');
          return;
        }
        
        // Get user's completed assessments from Firebase
        const userAssessments = await firebaseService.getUserAssessments();
        
        // If user has completed any assessments
        if (userAssessments && userAssessments.length > 0) {
          setHasCompletedAnyAssessment(true);
          
          // Track which subjects the user has already completed
          const subjects = userAssessments.map(assessment => assessment.subject);
          setCompletedSubjects(subjects);
          
          // Store assessment data by subject for quick access
          const assessmentBySubject = {};
          userAssessments.forEach(assessment => {
            assessmentBySubject[assessment.subject] = assessment;
          });
          setSubjectAssessmentData(assessmentBySubject);
        }
        
        // Check for subject in URL query parameters
        const params = new URLSearchParams(location.search);
        const subjectParam = params.get('subject');
        
        if (subjectParam) {
          // Find if this subject exists in our subjects list
          const validSubject = subjects.find(s => s.id === subjectParam);
          if (validSubject) {
            setSelectedSubject(subjectParam);
            setCurrentStep(1); // Skip subject selection and go straight to questions
          }
        }
      } catch (error) {
        console.error('Error checking assessments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAssessments();
  }, [currentUser, navigate, location.search]);

  // Sample subjects
  const subjects = [
    { id: 'math', name: 'Mathematics', icon: '➗' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'english', name: 'English', icon: '📝' },
    { id: 'history', name: 'History', icon: '🏛️' },
    { id: 'geography', name: 'Geography', icon: '🌍' },
    { id: 'computer', name: 'Computer Science', icon: '💻' },
  ];

  // Sample questions for each subject
  const questions = {
    math: [
      {
        id: 'math1',
        question: 'What is the result of 8 × 7?',
        options: ['54', '56', '64', '72'],
        correctAnswer: '56',
        explanation: 'To multiply 8 × 7, you can calculate 8 groups of 7 or 7 groups of 8. This equals 56.'
      },
      {
        id: 'math2',
        question: 'Solve for x: 2x + 5 = 15',
        options: ['x = 5', 'x = 7.5', 'x = 10', 'x = 5.5'],
        correctAnswer: 'x = 5',
        explanation: 'To solve for x, subtract 5 from both sides: 2x = 10. Then divide both sides by 2: x = 5.'
      },
      {
        id: 'math3',
        question: 'What is the area of a circle with radius 4 units?',
        options: ['16π square units', '8π square units', '4π square units', '12π square units'],
        correctAnswer: '16π square units',
        explanation: 'The area of a circle is calculated using the formula A = πr². With r = 4, we get A = π(4)² = 16π square units.'
      },
    ],
    science: [
      {
        id: 'science1',
        question: 'Which of the following is NOT a state of matter?',
        options: ['Solid', 'Liquid', 'Gas', 'Energy'],
        correctAnswer: 'Energy',
        explanation: 'The three common states of matter are solid, liquid, and gas. Plasma is sometimes considered a fourth state. Energy is a form of power, not a state of matter.'
      },
      {
        id: 'science2',
        question: 'What is the chemical symbol for gold?',
        options: ['Go', 'Gd', 'Au', 'Ag'],
        correctAnswer: 'Au',
        explanation: 'The chemical symbol for gold is Au, which comes from the Latin word "aurum".'
      },
      {
        id: 'science3',
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 'Mars',
        explanation: 'Mars is called the Red Planet because of the reddish appearance given by iron oxide (rust) on its surface.'
      },
    ],
    english: [
      {
        id: 'english1',
        question: 'Which of the following is a proper noun?',
        options: ['Car', 'London', 'Happy', 'Run'],
        correctAnswer: 'London',
        explanation: 'A proper noun is a specific name for a particular person, place, or thing and is always capitalized. London is the name of a specific city, making it a proper noun.'
      },
      {
        id: 'english2',
        question: 'What is the past tense of "go"?',
        options: ['Goed', 'Gone', 'Went', 'Going'],
        correctAnswer: 'Went',
        explanation: '"Went" is the irregular past tense form of the verb "go". "Gone" is the past participle form used with helping verbs like "have".'
      },
      {
        id: 'english3',
        question: 'Which punctuation mark ends an interrogative sentence?',
        options: ['Period', 'Exclamation mark', 'Question mark', 'Comma'],
        correctAnswer: 'Question mark',
        explanation: 'An interrogative sentence asks a question and always ends with a question mark (?).'
      },
    ],
    history: [
      {
        id: 'history1',
        question: 'In which year did World War II end?',
        options: ['1943', '1945', '1947', '1950'],
        correctAnswer: '1945'
      },
      {
        id: 'history2',
        question: 'Who was the first president of the United States?',
        options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'Abraham Lincoln'],
        correctAnswer: 'George Washington'
      },
      {
        id: 'history3',
        question: 'Which ancient civilization built the pyramids of Giza?',
        options: ['Roman', 'Greek', 'Egyptian', 'Mesopotamian'],
        correctAnswer: 'Egyptian'
      },
    ],
    geography: [
      {
        id: 'geography1',
        question: 'What is the largest ocean on Earth?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
        correctAnswer: 'Pacific Ocean'
      },
      {
        id: 'geography2',
        question: 'Which continent is the Sahara Desert located in?',
        options: ['Asia', 'Africa', 'South America', 'Australia'],
        correctAnswer: 'Africa'
      },
      {
        id: 'geography3',
        question: 'What is the capital city of Japan?',
        options: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'],
        correctAnswer: 'Tokyo'
      },
    ],
    computer: [
      {
        id: 'computer1',
        question: 'What does CPU stand for?',
        options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'],
        correctAnswer: 'Central Processing Unit'
      },
      {
        id: 'computer2',
        question: 'Which programming language is known as the "mother of all languages"?',
        options: ['Java', 'Python', 'C', 'JavaScript'],
        correctAnswer: 'C'
      },
      {
        id: 'computer3',
        question: 'What does HTML stand for?',
        options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Hybrid Text Machine Language'],
        correctAnswer: 'Hyper Text Markup Language'
      },
    ],
  };

  const handleSubjectSelect = (subjectId) => {
    setSelectedSubject(subjectId);
    setCurrentStep(1);
  };

  const handleAnswerSelect = async (questionId, answer) => {
    // Update the selected answer
    setAnswers({
      ...answers,
      [questionId]: answer
    });
    
    // Find the current question
    const currentQuestions = questions[selectedSubject] || [];
    const currentQuestion = currentQuestions.find(q => q.id === questionId);
    
    if (!currentQuestion) return;
    
    // Set loading state for this question's explanation
    setExplanationLoading(prev => ({
      ...prev,
      [questionId]: true
    }));
    
    try {
      console.log('Generating AI explanation for question:', currentQuestion.question);
      console.log('User answer:', answer);
      console.log('Correct answer:', currentQuestion.correctAnswer);
      
      // Generate AI explanation in real-time
      const aiExplanation = await aiService.generateExplanation(
        currentQuestion,
        answer,
        currentQuestion.correctAnswer
      );
      
      console.log('Received AI explanation:', aiExplanation);
      console.log('Is this the original explanation?', aiExplanation === currentQuestion.explanation);
      
      // Store the AI explanation
      setAiExplanations(prev => ({
        ...prev,
        [questionId]: aiExplanation
      }));
    } catch (error) {
      console.error('Error generating real-time explanation:', error);
      // Use the default explanation as fallback
      setAiExplanations(prev => ({
        ...prev,
        [questionId]: currentQuestion.explanation || 'No explanation available for this question.'
      }));
    } finally {
      // Clear loading state
      setExplanationLoading(prev => ({
        ...prev,
        [questionId]: false
      }));
    }
  };

  const handleNextQuestion = () => {
    const currentQuestions = questions[selectedSubject] || [];
    const questionIndex = currentStep - 1;
    
    // If this is the last question, show the summary page
    if (questionIndex >= currentQuestions.length - 1) {
      // Set current step to one past the questions length to trigger summary view
      setCurrentStep(currentQuestions.length + 1);
    } else {
      // Otherwise, go to the next question
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // Go back to subject selection
      setCurrentStep(0);
      setSelectedSubject(null);
    }
  };

  const handleSubmitAssessment = async () => {
    // Set loading state to true and show a visual indicator
    setIsLoading(true);
    document.body.style.overflow = 'hidden'; // Prevent scrolling while loading
    console.log('Submitting assessment, loading state:', true);
    
    try {
      // Filter answers to only include those for the current subject
      const currentQuestions = questions[selectedSubject] || [];
      const subjectAnswers = {};
      
      // Only include answers for questions in the current subject
      currentQuestions.forEach(question => {
        if (answers[question.id]) {
          subjectAnswers[question.id] = answers[question.id];
        }
      });
      
      // Calculate score and level
      const score = calculateMockScore();
      const level = determineMockLevel();
      const scorePercentage = Math.round(score * 100);
      
      // Generate feedback based on performance
      const getFeedbackDetails = () => {
        const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'this subject';
        
        if (score >= 0.9) {
          return {
            color: 'green',
            title: 'Excellent Performance!',
            message: `You've demonstrated advanced knowledge in ${subjectName}.`,
            recommendation: 'Explore advanced topics and practical applications.',
            nextSteps: 'Advanced learning path'
          };
        } else if (score >= 0.7) {
          return {
            color: 'blue',
            title: 'Good Performance!',
            message: `You have a solid understanding of ${subjectName} fundamentals.`,
            recommendation: 'Focus on the topics you missed to build a comprehensive knowledge base.',
            nextSteps: 'Intermediate learning path with targeted practice'
          };
        } else if (score >= 0.4) {
          return {
            color: 'yellow',
            title: 'Making Progress',
            message: `You have a basic understanding of ${subjectName}, with important concepts to master.`,
            recommendation: 'Review core concepts and practice with guided examples.',
            nextSteps: 'Foundational learning path'
          };
        } else {
          return {
            color: 'red',
            title: 'Building Knowledge',
            message: `It seems ${subjectName} might be new to you.`,
            recommendation: 'Start with the fundamentals and build your knowledge step by step.',
            nextSteps: 'Beginner-friendly introduction'
          };
        }
      };
      
      const feedback = getFeedbackDetails();
      
      // Prepare assessment data with feedback
      const assessmentData = {
        userId: currentUser.uid,
        subject: selectedSubject,
        subjectName: subjects.find(s => s.id === selectedSubject)?.name,
        answers: subjectAnswers,
        score: score,
        scorePercentage: scorePercentage,
        level: level,
        feedback: feedback,
        timestamp: new Date().toISOString(),
        dateCompleted: new Date().toISOString(),
        totalQuestions: currentQuestions.length,
        answeredQuestions: Object.keys(subjectAnswers).length,
        // Store the complete questions with all their details
        questions: currentQuestions.map(q => ({
          id: q.id,
          text: q.question,  // Note: using 'question' field from the original object
          question: q.question, // Store as both text and question for compatibility
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'No explanation available for this question.',
          userAnswer: subjectAnswers[q.id] || null
        }))
      };
      
      console.log('Generating AI explanations for questions...');
      
      // Generate AI explanations for each question
      const questionsWithAIExplanations = [];
      
      // Process questions one by one to get AI explanations
      for (const q of assessmentData.questions) {
        const userAnswer = subjectAnswers[q.id];
        if (userAnswer) {
          // Check if we already have an AI explanation from real-time generation
          if (aiExplanations[q.id]) {
            // Use the already generated AI explanation
            q.explanation = aiExplanations[q.id];
            q.isAIExplanation = true;
          } else {
            try {
              // Call the AI service to generate an explanation if we don't have one yet
              const aiExplanation = await aiService.generateExplanation(
                q, 
                userAnswer, 
                q.correctAnswer
              );
              
              // Update the explanation with AI-generated content
              q.explanation = aiExplanation;
              q.isAIExplanation = true;
            } catch (error) {
              console.error(`Error generating AI explanation for question ${q.id}:`, error);
              // Keep the original explanation as fallback
            }
          }
        }
        questionsWithAIExplanations.push(q);
      }
      
      // Update the assessment data with AI explanations
      assessmentData.questions = questionsWithAIExplanations;
      assessmentData.hasAIExplanations = true;
      
      console.log('Saving assessment data with AI explanations:', assessmentData);
      
      // Save assessment to Firebase
      await firebaseService.saveAssessment(assessmentData);
      
      // Add this subject to completed subjects list
      if (!completedSubjects.includes(selectedSubject)) {
        setCompletedSubjects([...completedSubjects, selectedSubject]);
      }
      setHasCompletedAnyAssessment(true);
      
      // Show success message and redirect after a short delay
      setTimeout(() => {
        // Navigate to dashboard with a success message including score
        navigate('/dashboard', { 
          state: { 
            message: `Assessment completed successfully! Your score: ${scorePercentage}%. Your personalized learning plan is ready.`,
            assessmentCompleted: true,
            score: scorePercentage,
            level: level,
            feedback: feedback.title,
            showPersonalizedPlan: true // Flag to show the personalized plan
          } 
        });
      }, 500); // Short delay to ensure Firebase operation completes
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('There was an error submitting your assessment. Please try again.');
    } finally {
      // Ensure loading state is properly reset
      console.log('Assessment submission complete, resetting loading state');
      // Add a small delay to ensure the loading state is visible to the user
      setTimeout(() => {
        setIsLoading(false);
        document.body.style.overflow = ''; // Re-enable scrolling
      }, 500);
    }
  };

  // Calculate a mock score based on answers
  const calculateMockScore = () => {
    if (Object.keys(answers).length === 0) return 0;
    
    const currentQuestions = questions[selectedSubject] || [];
    if (currentQuestions.length === 0) return 0;
    
    let correctCount = 0;
    
    currentQuestions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) {
        correctCount++;
      }
    });
    
    // Return a decimal between 0 and 1
    return correctCount / currentQuestions.length;
  };
  
  // Determine a mock level based on score
  const determineMockLevel = () => {
    const score = calculateMockScore();
    
    if (score >= 0.9) return 'Advanced';
    if (score >= 0.7) return 'Intermediate';
    if (score >= 0.4) return 'Basic';
    return 'Beginner';
  };
  
  // Skip assessment and go directly to dashboard
  const handleSkipAssessment = () => {
    navigate('/dashboard');
  };

  const renderSubjectSelection = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Knowledge Assessment</h1>
        <p className="text-gray-600 text-center mb-8">
          Select a subject to assess your knowledge level and get a personalized learning plan.
        </p>
        
        {hasCompletedAnyAssessment && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
            <p className="text-blue-700">
              <strong>You've already completed assessments for some subjects.</strong> You can retake them or try new ones.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {subjects.map((subject) => {
            const isCompleted = completedSubjects.includes(subject.id);
            return (
              <button
                key={subject.id}
                onClick={() => handleSubjectSelect(subject.id)}
                className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border ${isCompleted ? 'border-green-300' : 'border-gray-200'} flex flex-col items-center`}
              >
                <span className="text-4xl mb-3">{subject.icon}</span>
                <h3 className="text-xl font-semibold">{subject.name}</h3>
                <p className="text-gray-600 mt-2">Assess your {subject.name.toLowerCase()} knowledge</p>
                {isCompleted && (
                  <span className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Not ready to take the assessment?</p>
          <Button 
            onClick={handleSkipAssessment} 
            variant="outline"
            size="sm"
          >
            Skip Assessment & Go to Dashboard
          </Button>
        </div>
      </div>
    );
  };

  const renderQuestion = () => {
    const currentQuestions = questions[selectedSubject] || [];
    const questionIndex = currentStep - 1;
    
    // If no questions exist for this subject or we've reached the end, show summary
    if (!currentQuestions.length || questionIndex >= currentQuestions.length) {
      return renderSummary();
    }
    
    const currentQuestion = currentQuestions[questionIndex];
    const userAnswer = answers[currentQuestion.id];
    const isAnswered = !!userAnswer;
    const isCorrect = userAnswer === currentQuestion.correctAnswer;
    
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-700">
              {subjects.find(s => s.id === selectedSubject)?.name} Assessment
            </h3>
            <span className="text-sm text-gray-500">
              Question {questionIndex + 1} of {currentQuestions.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full" 
              style={{ width: `${((questionIndex + 1) / currentQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-6">{currentQuestion.question}</h2>
          
          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  id={`option-${index}`}
                  name={`question-${currentQuestion.id}`}
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <label 
                  htmlFor={`option-${index}`} 
                  className={`ml-3 block ${isAnswered && option === currentQuestion.correctAnswer ? 'text-green-600 font-medium' : isAnswered && option === userAnswer ? 'text-red-600' : 'text-gray-700'}`}
                >
                  {option}
                  {isAnswered && option === currentQuestion.correctAnswer && " ✓"}
                </label>
              </div>
            ))}
          </div>
          
          {/* Explanation Section - Show after answering */}
          {isAnswered && (
            <div className={`mt-6 p-4 rounded-md ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`text-lg font-medium mb-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? 'Correct! 🎉' : 'Not quite right 🤔'}
              </h3>
              <div className="text-gray-700">
                <p className="mb-2"><strong>Explanation:</strong></p>
                {explanationLoading[currentQuestion.id] ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                    <p>Generating AI explanation...</p>
                  </div>
                ) : (
                  <>
                    <p>{aiExplanations[currentQuestion.id] || currentQuestion.explanation}</p>
                    <div className="mt-2 p-1 rounded bg-gray-100 border border-gray-200">
                      <span className="font-bold">Source: </span>
                      {aiExplanations[currentQuestion.id] ? 
                        <span className="text-green-600 font-medium">AI-Generated ✓</span> : 
                        <span className="text-red-600 font-medium">Static (Original) ✗</span>
                      }
                    </div>
                  </>
                )}
                <div className="mt-3 text-xs text-gray-500 italic">
                  Powered by Groq AI
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-between">
            <Button 
              onClick={handlePreviousQuestion} 
              variant="secondary"
            >
              Back
            </Button>
            <Button 
              onClick={questionIndex + 1 === currentQuestions.length ? () => setCurrentStep(currentQuestions.length + 1) : handleNextQuestion} 
              variant="primary"
              disabled={!answers[currentQuestion.id]}
            >
              {questionIndex + 1 === currentQuestions.length ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const currentQuestions = questions[selectedSubject] || [];
    const answeredQuestions = Object.keys(answers).filter(key => 
      currentQuestions.some(q => q.id === key)
    ).length;
    
    // Calculate the score percentage
    const score = calculateMockScore();
    const scorePercentage = Math.round(score * 100);
    const level = determineMockLevel();
    
    // Generate personalized feedback based on score
    const getFeedbackDetails = () => {
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'this subject';
      
      if (score >= 0.9) {
        return {
          color: 'green',
          icon: '🏆',
          title: 'Excellent Performance!',
          message: `You've demonstrated advanced knowledge in ${subjectName}. You're ready for more challenging material!`,
          recommendation: 'We recommend exploring advanced topics and practical applications in this subject.',
          action: 'Submit to see your personalized advanced learning path.'
        };
      } else if (score >= 0.7) {
        return {
          color: 'blue',
          icon: '🌟',
          title: 'Good Performance!',
          message: `You have a solid understanding of ${subjectName} fundamentals with some areas to strengthen.`,
          recommendation: 'We recommend focusing on the topics you missed to build a comprehensive knowledge base.',
          action: 'Submit to see your personalized learning path with targeted practice areas.'
        };
      } else if (score >= 0.4) {
        return {
          color: 'yellow',
          icon: '📚',
          title: 'You\'re Making Progress',
          message: `You have a basic understanding of ${subjectName}, but there are important concepts to master.`,
          recommendation: 'We recommend reviewing core concepts and practicing with guided examples.',
          action: 'Submit to see your personalized learning path with foundational resources.'
        };
      } else {
        return {
          color: 'red',
          icon: '🔄',
          title: 'Let\'s Build Your Knowledge',
          message: `It seems ${subjectName} might be new to you. That's okay - everyone starts somewhere!`,
          recommendation: 'You might want to try another subject, or submit this assessment to get a beginner-friendly learning plan.',
          action: 'Submit to receive a beginner-friendly introduction to this subject, or go back to select another subject.'
        };
      }
    };
    
    const feedback = getFeedbackDetails();
    const colorClasses = {
      green: 'bg-green-50 border-green-100 text-green-800',
      blue: 'bg-blue-50 border-blue-100 text-blue-800',
      yellow: 'bg-yellow-50 border-yellow-100 text-yellow-800',
      red: 'bg-red-50 border-red-100 text-red-800'
    };
    
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-center">Assessment Summary</h2>
          
          <div className="mb-6 text-center">
            <p className="text-lg mb-2">
              You've answered {answeredQuestions} out of {currentQuestions.length} questions for {subjects.find(s => s.id === selectedSubject)?.name}.
            </p>
            
            <div className="mt-6">
              <div className="inline-block bg-blue-50 rounded-lg px-6 py-4 border border-blue-100">
                <h3 className="text-lg font-medium text-blue-800 mb-1">Your Score</h3>
                <div className="text-3xl font-bold text-blue-600">{scorePercentage}%</div>
                <p className="text-sm text-blue-700 mt-1">Level: {level}</p>
              </div>
            </div>
          </div>
          
          {/* Personalized Feedback Section */}
          <div className={`rounded-lg p-5 mb-6 border ${colorClasses[feedback.color]}`}>
            <div className="flex items-start">
              <div className="text-3xl mr-3">{feedback.icon}</div>
              <div>
                <h3 className="text-lg font-medium mb-2">{feedback.title}</h3>
                <p className="mb-3">{feedback.message}</p>
                <p className="font-medium">{feedback.recommendation}</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium mb-4">Ready to submit your assessment?</h3>
            <p className="text-gray-600 mb-6">
              {feedback.action}
            </p>
            
            <div className="flex justify-between">
              <Button 
                onClick={handlePreviousQuestion} 
                variant="secondary"
              >
                Review Answers
              </Button>
              <div className="flex space-x-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  disabled={isLoading}
                >
                  View Learning Plan
                </Button>
                <Button 
                  onClick={handleSubmitAssessment} 
                  variant="primary"
                  disabled={isLoading}
                  className="relative"
                >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : 'Submit Assessment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 py-12 px-4 min-h-screen">
      {/* Add the LoadingOverlay component for assessment submission */}
      <LoadingOverlay 
        isVisible={isLoading && currentStep > 0} 
        message="Submitting your assessment..." 
        subMessage="Please wait, this may take a moment" 
      />
      <div className="container mx-auto">
        {isLoading && currentStep === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading your assessment data...</p>
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-center mb-4">Knowledge Assessment</h1>
            <p className="text-lg text-gray-700 text-center mb-12">
              Let's understand your current knowledge level to create a personalized learning experience.
            </p>
            
            {currentStep === 0 ? 
              renderSubjectSelection() : 
              (questions[selectedSubject] && currentStep > questions[selectedSubject].length) ? 
                renderSummary() : 
                renderQuestion()
            }
          </>
        )}
      </div>
    </div>
  );
};

export default Assessment;
