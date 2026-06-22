import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import AssessmentDetailsModal from '../components/AssessmentDetailsModal';
import PersonalizedPlan from '../components/PersonalizedPlan';
import PersonalizedPlanButton from '../components/PersonalizedPlanButton';
import LearningPlanSummary from '../components/LearningPlanSummary';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [hasCompletedAssessment, setHasCompletedAssessment] = useState(true); // Default to true to avoid flashing notification
  const [isCheckingAssessment, setIsCheckingAssessment] = useState(true);
  const [userAssessments, setUserAssessments] = useState([]);
  const [completedSubjects, setCompletedSubjects] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [assessmentQuestions, setAssessmentQuestions] = useState({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [showPersonalizedPlan, setShowPersonalizedPlan] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const personalizedPlanRef = React.useRef(null);
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoadingProfile(true);
        const profile = await firebaseService.getUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchUserProfile();
  }, [currentUser]);

  // Check if user has completed any assessments and fetch assessment data
  useEffect(() => {
    const checkAssessmentStatus = async () => {
      if (!currentUser) return;
      
      try {
        setIsCheckingAssessment(true);
        
        // Check if user has completed any assessment
        const hasCompleted = await firebaseService.hasCompletedAssessment();
        setHasCompletedAssessment(hasCompleted);
        
        // Fetch user's assessment data
        const assessments = await firebaseService.getUserAssessments();
        setUserAssessments(assessments || []);
        
        // Create a map of completed subjects with their data
        const subjectsMap = {};
        if (assessments && assessments.length > 0) {
          // Sort assessments by date (newest first)
          const sortedAssessments = [...assessments].sort((a, b) => {
            return new Date(b.dateCompleted) - new Date(a.dateCompleted);
          });
          
          // Set the latest assessment for personalized plan
          setLatestAssessment(sortedAssessments[0]);
          
          assessments.forEach(assessment => {
            subjectsMap[assessment.subject] = assessment;
          });
        }
        setCompletedSubjects(subjectsMap);
      } catch (error) {
        console.error('Error checking assessment status:', error);
      } finally {
        setIsCheckingAssessment(false);
      }
    };
    
    checkAssessmentStatus();
  }, [currentUser]);
  
  // Clear any success messages after 5 seconds and handle personalized plan display
  useEffect(() => {
    if (location.state?.message) {
      // Check if we should show and scroll to the personalized plan
      if (location.state?.showPersonalizedPlan) {
        setShowPersonalizedPlan(true);
        // Set active tab to overview where the plan is displayed
        setActiveTab('overview');
        
        // Scroll to the personalized plan after a short delay to ensure it's rendered
        setTimeout(() => {
          if (personalizedPlanRef.current) {
            personalizedPlanRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      }
      
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);
  
  // Default user data (will be replaced with real data when loaded)
  const defaultUserData = {
    displayName: 'Student',
    email: '',
    role: 'student',
    grade: '',
    joinedDate: '',
    profileImage: '/profile.jpg',
    profilePlaceholder: 'https://via.placeholder.com/150x150/0369a1/FFFFFF?text=ST'
  };
  
  // Assessment subjects
  const assessmentSubjects = [
    { id: 'math', name: 'Mathematics', icon: '➗', description: 'Test your knowledge in algebra, geometry, and arithmetic', difficulty: 'Medium', questions: 10, estimatedTime: '15 min' },
    { id: 'science', name: 'Science', icon: '🔬', description: 'Evaluate your understanding of biology, chemistry, and physics', difficulty: 'Hard', questions: 15, estimatedTime: '20 min' },
    { id: 'english', name: 'English', icon: '📝', description: 'Assess your grammar, vocabulary, and reading comprehension', difficulty: 'Easy', questions: 12, estimatedTime: '15 min' },
    { id: 'history', name: 'History', icon: '🏛️', description: 'Test your knowledge of key historical events and figures', difficulty: 'Medium', questions: 10, estimatedTime: '15 min' },
    { id: 'geography', name: 'Geography', icon: '🌍', description: 'Evaluate your understanding of world geography and climate', difficulty: 'Medium', questions: 12, estimatedTime: '15 min' },
    { id: 'computer', name: 'Computer Science', icon: '💻', description: 'Test your knowledge of programming and computer concepts', difficulty: 'Hard', questions: 10, estimatedTime: '20 min' },
  ];
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  // Handle opening assessment details modal
  const handleViewDetails = async (assessment) => {
    try {
      // First show the modal with loading state
      setSelectedAssessment(assessment);
      setIsLoadingQuestions(true);
      setShowDetailsModal(true);
      
      // Make sure we have a valid assessment ID
      const assessmentId = assessment.id || `${currentUser.uid}_${assessment.subject}`;
      
      // Always fetch the latest assessment data from Firestore
      const freshAssessmentData = await firebaseService.getAssessmentById(assessmentId);
      
      // Use the fresh data if available, otherwise use the passed assessment
      const currentAssessment = freshAssessmentData || assessment;
      setSelectedAssessment(currentAssessment);
      
      console.log('Current assessment data:', currentAssessment);
      
      // Check if this assessment has stored questions (from newer assessments)
      if (currentAssessment.questions && currentAssessment.questions.length > 0) {
        console.log('Using stored questions from assessment');
        
        // Use the questions stored directly in the assessment
        const questionsWithAnswers = currentAssessment.questions.map(question => {
          // Make sure we have the question text from either field
          const questionText = question.text || question.question || `Question ${question.id}`;
          
          return {
            ...question,
            text: questionText,  // Ensure we have the text field
            question: questionText,  // Ensure we have the question field
            userAnswer: currentAssessment.answers?.[question.id] || null,
            options: question.options || ['Option A', 'Option B', 'Option C', 'Option D'],
            explanation: question.explanation || 'No explanation available for this question.'
          };
        });
        
        console.log('Questions with answers:', questionsWithAnswers);
        
        // Store these questions in state
        setAssessmentQuestions(prevQuestions => ({
          ...prevQuestions,
          [currentAssessment.subject]: questionsWithAnswers
        }));
      } else {
        // Fallback for older assessments that don't have stored questions
        console.log('No stored questions found, using fallback method');
        
        // Get the question IDs from the user's answers
        const assessmentQuestionIds = Object.keys(currentAssessment.answers || {});
        
        // Fetch all questions for this subject
        const subjectQuestions = await firebaseService.getAssessmentQuestions(currentAssessment.subject);
        
        // Create a map of question IDs to their full details
        const questionMap = {};
        subjectQuestions.forEach(question => {
          questionMap[question.id] = question;
        });
        
        // Create an array of questions that were in this assessment
        // with the user's answers added
        const questionsWithAnswers = assessmentQuestionIds.map(questionId => {
          const question = questionMap[questionId] || {
            // If we can't find the question, create a placeholder
            id: questionId,
            text: `Question ${questionId}`,
            question: `Question ${questionId}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: currentAssessment.answers?.[questionId] || '',
            explanation: question.explanation || 'Explanation not available for this question.'
          };
          
          return {
            ...question,
            userAnswer: currentAssessment.answers?.[questionId] || null
          };
        });
        
        console.log('Fallback questions with answers:', questionsWithAnswers);
        
        // Store these questions in state
        setAssessmentQuestions(prevQuestions => ({
          ...prevQuestions,
          [currentAssessment.subject]: questionsWithAnswers
        }));
      }
    } catch (error) {
      console.error('Error fetching assessment questions:', error);
      // Show error message to user
      alert('Error loading assessment details. Please try again.');
      setShowDetailsModal(false);
    } finally {
      setIsLoadingQuestions(false);
    }
  };
  
  // Handle closing assessment details modal
  const handleCloseModal = () => {
    setShowDetailsModal(false);
  };
  
  const courseProgress = [
    {
      id: 1,
      title: 'Mathematics - Form 3',
      progress: 68,
      lastAccessed: '2 days ago',
      nextLesson: 'Quadratic Equations',
      image: '/course-math.jpg',
      placeholder: 'https://via.placeholder.com/80x80/0369a1/FFFFFF?text=Math'
    },
    {
      id: 2,
      title: 'Biology - Form 3',
      progress: 42,
      lastAccessed: 'Yesterday',
      nextLesson: 'Cell Division',
      image: '/course-biology.jpg',
      placeholder: 'https://via.placeholder.com/80x80/059669/FFFFFF?text=Bio'
    },
    {
      id: 3,
      title: 'English Language - Form 3',
      progress: 85,
      lastAccessed: 'Today',
      nextLesson: 'Essay Writing',
      image: '/course-english.jpg',
      placeholder: 'https://via.placeholder.com/80x80/7c3aed/FFFFFF?text=Eng'
    }
  ];
  
  const upcomingAssignments = [
    {
      id: 1,
      title: 'Mathematics Quiz',
      course: 'Mathematics - Form 3',
      dueDate: 'Tomorrow',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Essay Submission',
      course: 'English Language - Form 3',
      dueDate: '3 days',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Lab Report',
      course: 'Biology - Form 3',
      dueDate: '5 days',
      status: 'pending'
    }
  ];
  
  const recentActivities = [
    {
      id: 1,
      activity: 'Completed lesson',
      details: 'Algebraic Expressions',
      course: 'Mathematics - Form 3',
      time: '2 hours ago'
    },
    {
      id: 2,
      activity: 'Asked AI tutor',
      details: 'How do cells reproduce?',
      course: 'Biology - Form 3',
      time: 'Yesterday'
    },
    {
      id: 3,
      activity: 'Submitted assignment',
      details: 'Grammar Exercise',
      course: 'English Language - Form 3',
      time: '3 days ago'
    },
    {
      id: 4,
      activity: 'Watched video',
      details: 'Introduction to Photosynthesis',
      course: 'Biology - Form 3',
      time: '4 days ago'
    }
  ];
  
  const recommendedCourses = [
    {
      id: 1,
      title: 'Physics - Form 3',
      description: 'Learn about forces, motion, and energy',
      image: '/course-physics.jpg',
      placeholder: 'https://via.placeholder.com/100x60/d97706/FFFFFF?text=Physics'
    },
    {
      id: 2,
      title: 'Chemistry - Form 3',
      description: 'Explore elements, compounds and reactions',
      image: '/course-chemistry.jpg',
      placeholder: 'https://via.placeholder.com/100x60/be123c/FFFFFF?text=Chemistry'
    }
  ];
  
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Success Message */}
      {location.state?.message && (
        <div className={`border-l-4 p-4 ${location.state.assessmentCompleted ? 
          (location.state.score >= 90 ? 'bg-green-50 border-green-500' : 
           location.state.score >= 70 ? 'bg-blue-50 border-blue-500' : 
           location.state.score >= 40 ? 'bg-yellow-50 border-yellow-500' : 
           'bg-red-50 border-red-500') : 
          'bg-green-50 border-green-500'}`}>
          <div className="container-custom">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {location.state.assessmentCompleted ? (
                  <span className="text-xl">
                    {location.state.score >= 90 ? '🏆' : 
                     location.state.score >= 70 ? '🌟' : 
                     location.state.score >= 40 ? '📚' : '🔄'}
                  </span>
                ) : (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-grow">
                {location.state.assessmentCompleted && location.state.feedback ? (
                  <>
                    <p className="text-base font-medium mb-1">{location.state.feedback}</p>
                    <p className="text-sm">{location.state.message}</p>
                  </>
                ) : (
                  <p className="text-sm">{location.state.message}</p>
                )}
                
                {/* Show score details if assessment was just completed */}
                {location.state.assessmentCompleted && location.state.score !== undefined && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="bg-white rounded-md px-3 py-1 border flex items-center">
                      <span className="text-xs font-medium text-gray-500 mr-2">Score:</span>
                      <span className="text-sm font-bold">{location.state.score}%</span>
                    </div>
                    {location.state.level && (
                      <div className="bg-white rounded-md px-3 py-1 border flex items-center">
                        <span className="text-xs font-medium text-gray-500 mr-2">Level:</span>
                        <span className="text-sm font-bold">{location.state.level}</span>
                      </div>
                    )}
                    <Link to="/assessment" className="bg-white rounded-md px-3 py-1 border border-blue-200 flex items-center hover:bg-blue-50">
                      <span className="text-xs font-medium text-blue-600">Try Another Subject</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Assessment Notification */}
      {!isCheckingAssessment && !hasCompletedAssessment && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="container-custom py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Complete your knowledge assessment</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>Taking the assessment will help us understand your knowledge level and create a personalized learning plan for you.</p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <Link
                  to="/assessment"
                  className="inline-flex rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Take Assessment
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <img
                src={userProfile?.photoURL || defaultUserData.profileImage}
                alt={userProfile?.displayName || defaultUserData.displayName}
                className="w-12 h-12 rounded-full mr-4"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = defaultUserData.profilePlaceholder;
                }}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Welcome back, {userProfile?.displayName || defaultUserData.displayName}!
                </h1>
                <p className="text-gray-600">
                  {userProfile?.grade || defaultUserData.grade} 
                  {userProfile?.grade && userProfile?.role ? '•' : ''} 
                  {userProfile?.role || defaultUserData.role}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Button>
            </div>
          </div>
          
          {/* Dashboard Tabs */}
          <div className="flex overflow-x-auto mt-4 border-b border-gray-200">
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('courses')}
            >
              My Courses
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'assignments'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('assignments')}
            >
              Assignments
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'ai-tutor'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('ai-tutor')}
            >
              AI Tutor
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'assessments'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('assessments')}
            >
              Assessments
            </button>
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div className="container-custom py-6">
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            {/* Assessment Introduction */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-800">Knowledge Assessments</h2>
                  <p className="mt-1 text-gray-600">Test your knowledge in various subjects to get personalized learning recommendations and track your progress over time.</p>
                  <div className="mt-3">
                    <Link to="/assessment" className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700">
                      Learn more about assessments
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Available Assessments */}
            <Card>
              <Card.Header>
                <h2 className="text-lg font-bold">Available Assessments</h2>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {assessmentSubjects.map(subject => {
                    const isCompleted = completedSubjects[subject.id];
                    const assessmentData = completedSubjects[subject.id];
                    
                    return (
                      <div key={subject.id} className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 ${isCompleted ? 'border-green-300' : 'border-gray-200'}`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <span className="text-2xl mr-2">{subject.icon}</span>
                              <h3 className="text-lg font-medium text-gray-900">{subject.name}</h3>
                            </div>
                            <div className="flex items-center">
                              {isCompleted && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mr-2">
                                  Completed
                                </span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                subject.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                subject.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {subject.difficulty}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{subject.description}</p>
                          {isCompleted ? (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Your score</span>
                                <span className="font-bold text-base text-green-600">{assessmentData.scorePercentage}%</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      assessmentData.scorePercentage >= 90 ? 'bg-green-500' :
                                      assessmentData.scorePercentage >= 70 ? 'bg-blue-500' :
                                      assessmentData.scorePercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} 
                                    style={{ width: `${assessmentData.scorePercentage}%` }}
                                  ></div>
                                </div>
                                <span className="ml-2 font-bold text-sm">{assessmentData.scorePercentage}%</span>
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                <span className="font-medium">{assessmentData.level}</span> knowledge level
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                              <span>{subject.questions} questions</span>
                              <span>~{subject.estimatedTime}</span>
                            </div>
                          )}
                          <div className="flex space-x-2 mt-4">
                            <Link 
                              to={`/assessment?subject=${subject.id}`} 
                              className={`flex-1 text-center py-2 px-4 rounded-md transition-colors duration-200 ${
                                isCompleted 
                                  ? 'bg-green-50 border border-green-500 text-green-700 hover:bg-green-100' 
                                  : 'border border-primary-600 text-primary-600 hover:bg-primary-50'
                              }`}
                            >
                              {isCompleted ? 'Retake Assessment' : 'Start Assessment'}
                            </Link>
                            {isCompleted && (
                              <button 
                                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                onClick={() => handleViewDetails(assessmentData)}
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card.Body>
            </Card>
            
            {/* Assessment History */}
            <Card>
              <Card.Header className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Your Assessment History</h2>
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  View all
                </button>
              </Card.Header>
              <Card.Body className="p-0">
                {userAssessments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userAssessments.map((assessment) => {
                          // Find the subject name from the subject ID
                          const subjectInfo = assessmentSubjects.find(s => s.id === assessment.subject) || {};
                          const subjectName = subjectInfo.name || assessment.subjectName || assessment.subject;
                          const scorePercentage = assessment.scorePercentage || Math.round(assessment.score * 100);
                          
                          return (
                            <tr key={assessment.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subjectName}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-16 bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        scorePercentage >= 90 ? 'bg-green-500' :
                                        scorePercentage >= 70 ? 'bg-blue-500' :
                                        scorePercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`} 
                                      style={{ width: `${scorePercentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="ml-2 font-bold text-sm">{scorePercentage}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  assessment.level === 'Advanced' ? 'bg-green-100 text-green-800' :
                                  assessment.level === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
                                  assessment.level === 'Basic' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {assessment.level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(assessment.completedAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <Link 
                                    to={`/assessment?subject=${assessment.subject}`} 
                                    className="text-primary-600 hover:text-primary-900"
                                  >
                                    Retake
                                  </Link>
                                  <button 
                                    className="text-primary-600 hover:text-primary-900"
                                    onClick={() => handleViewDetails(assessment)}
                                  >
                                    View Details
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">You haven't taken any assessments yet.</p>
                    <Link to="/assessment" className="mt-2 inline-block text-primary-600 hover:text-primary-700">
                      Take your first assessment
                    </Link>
                  </div>
                )}
              </Card.Body>
            </Card>
            
            {/* AI Integration */}
            <Card>
              <Card.Header>
                <h2 className="text-lg font-bold">AI-Powered Learning</h2>
              </Card.Header>
              <Card.Body>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Personalized Learning Recommendations</h3>
                    <p className="mt-1 text-gray-600">Based on your assessment results, our AI tutor can create a personalized learning plan to help you improve in areas where you need more practice.</p>
                    <div className="mt-4">
                      <Link to="/ai-tutor" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        Connect with AI Tutor
                      </Link>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        )}
        
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personalized Learning Plan - Only show if user has completed an assessment */}
            {latestAssessment && (
              <div className="lg:col-span-3 mb-2" ref={personalizedPlanRef}>
                <Card>
                  <Card.Header className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Personalized Learning Plan</h2>
                    <PersonalizedPlanButton 
                      assessment={latestAssessment} 
                      className="flex-shrink-0"
                      onPlanGenerated={(plan) => {
                        setAiPlan(plan);
                        setShowPersonalizedPlan(true);
                      }}
                    />
                  </Card.Header>
                  <Card.Body>
                    <div className="p-4">
                      {showPersonalizedPlan && aiPlan ? (
                        <LearningPlanSummary plan={aiPlan} subject={latestAssessment.subject} />
                      ) : (
                        <div className="text-center py-6">
                          <div className="mb-4">
                            <svg className="w-12 h-12 mx-auto text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Get AI-powered learning recommendations</h3>
                          <p className="text-gray-600 mb-4">
                            Based on your {latestAssessment.subject} assessment ({latestAssessment.score}%), our AI can generate a personalized learning plan to help you improve.
                          </p>
                          <p className="text-sm text-gray-500">
                            Click the "Generate Personalized Learning Plan" button above to get started.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </div>
            )}
            
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Course Progress */}
              <Card>
                <Card.Header className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">Course Progress</h2>
                  <Link to="/courses" className="text-sm text-primary-600 hover:text-primary-700">
                    View all courses
                  </Link>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="divide-y divide-gray-200">
                    {courseProgress.map(course => (
                      <div key={course.id} className="p-4 flex items-center">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="w-16 h-16 rounded object-cover mr-4"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = course.placeholder;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{course.title}</h3>
                          <p className="text-xs text-gray-500">Last accessed: {course.lastAccessed}</p>
                          <div className="mt-2 flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{ width: `${course.progress}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-xs font-medium text-gray-500">{course.progress}%</span>
                          </div>
                        </div>
                        <Button to={`/courses/${course.id}`} variant="outline" size="sm" className="ml-4 whitespace-nowrap">
                          Continue
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
              
              {/* Recent Activity */}
              <Card>
                <Card.Header className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">Recent Activity</h2>
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    View all
                  </button>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="divide-y divide-gray-200">
                    {recentActivities.map(activity => (
                      <div key={activity.id} className="p-4">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.activity}: <span className="font-normal">{activity.details}</span></p>
                            <p className="text-xs text-gray-500">{activity.course}</p>
                          </div>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              {/* Upcoming Assignments */}
              <Card>
                <Card.Header className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">Upcoming Assignments</h2>
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    View all
                  </button>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="divide-y divide-gray-200">
                    {upcomingAssignments.map(assignment => (
                      <div key={assignment.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                            <p className="text-xs text-gray-500">{assignment.course}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            assignment.dueDate === 'Tomorrow' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            Due: {assignment.dueDate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
                <Card.Footer>
                  <Button variant="outline" fullWidth size="sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Assignment
                  </Button>
                </Card.Footer>
              </Card>
              
              {/* Recommended Courses */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-bold">Recommended For You</h2>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="divide-y divide-gray-200">
                    {recommendedCourses.map(course => (
                      <div key={course.id} className="p-4 flex">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="w-20 h-12 object-cover rounded mr-3"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = course.placeholder;
                          }}
                        />
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{course.title}</h3>
                          <p className="text-xs text-gray-500">{course.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
                <Card.Footer>
                  <Button to="/courses" variant="outline" fullWidth size="sm">
                    Browse All Courses
                  </Button>
                </Card.Footer>
              </Card>
              
              {/* Assessment Card */}
              <Card>
                <Card.Header className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">Knowledge Assessment</h2>
                  <button 
                    onClick={() => setActiveTab('assessments')} 
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View all
                  </button>
                </Card.Header>
                <Card.Body>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Test your knowledge and get personalized learning recommendations.</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {assessmentSubjects.slice(0, 4).map(subject => {
                        const isCompleted = completedSubjects[subject.id];
                        const assessmentData = completedSubjects[subject.id];
                        
                        return (
                          <div key={subject.id} className="relative">
                            <Link 
                              to={`/assessment?subject=${subject.id}`}
                              className={`flex items-center p-2 border rounded-md hover:bg-gray-50 ${isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                            >
                              <span className="text-xl mr-2">{subject.icon}</span>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{subject.name}</span>
                                {isCompleted && (
                                  <span className="text-xs font-bold text-green-600">
                                    {assessmentData.scorePercentage}% - {assessmentData.level}
                                  </span>
                                )}
                              </div>
                              {isCompleted && (
                                <span className="absolute top-1 right-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                                  Completed
                                </span>
                              )}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                    
                    <Link 
                      to="/assessment" 
                      className="block w-full text-center py-2 px-4 bg-primary-600 rounded-md text-white hover:bg-primary-700 transition-colors duration-200"
                    >
                      View All Assessments
                    </Link>
                  </div>
                </Card.Body>
              </Card>
              
              {/* Quick Links */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-bold">Quick Links</h2>
                </Card.Header>
                <Card.Body className="p-0">
                  <nav className="divide-y divide-gray-200">
                    <Link to="/assessment" className="block p-4 text-sm text-gray-700 hover:bg-gray-50 bg-blue-50" onClick={() => setActiveTab('assessments')}>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Practice Assessments
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          New
                        </span>
                      </span>
                    </Link>
                    <Link to="/profile" className="block p-4 text-sm text-gray-700 hover:bg-gray-50">
                      My Profile
                    </Link>
                    <Link to="/calendar" className="block p-4 text-sm text-gray-700 hover:bg-gray-50">
                      Calendar
                    </Link>
                    <Link to="/messages" className="block p-4 text-sm text-gray-700 hover:bg-gray-50">
                      Messages
                    </Link>
                    <Link to="/help" className="block p-4 text-sm text-gray-700 hover:bg-gray-50">
                      Help Center
                    </Link>
                  </nav>
                </Card.Body>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab !== 'overview' && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Coming Soon</h3>
            <p className="mt-1 text-gray-500">
              The {activeTab === 'courses' ? 'Courses' : 
                activeTab === 'assignments' ? 'Assignments' : 
                activeTab === 'ai-tutor' ? 'AI Tutor' : 'Analytics'} 
              tab is currently under development.
            </p>
            <div className="mt-6">
              <Button onClick={() => setActiveTab('overview')} variant="outline">
                Return to Overview
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Assessment Details Modal */}
      {showDetailsModal && selectedAssessment && (
        <div className="fixed inset-0 z-50">
          {isLoadingQuestions ? (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-xl flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="text-gray-700">Loading assessment details...</p>
              </div>
            </div>
          ) : (
            <AssessmentDetailsModal
              assessment={selectedAssessment}
              questions={assessmentQuestions[selectedAssessment.subject] || []}
              onClose={handleCloseModal}
              isLoading={isLoadingQuestions}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
