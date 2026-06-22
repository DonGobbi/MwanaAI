import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { subjects, sampleUser, populateTestData } from '../utils/testData';
// Import AI services
import testKnowledgeGraph from '../tests/testKnowledgeGraph';
import testStudentProgress from '../tests/testStudentProgress';
import testAITutor from '../tests/testAITutor';
import testContentGeneration from '../tests/testContentGeneration';
import testAssessmentEngine from '../tests/testAssessmentEngine';

const AIDemo = () => {
  const { currentUser } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [testResults, setTestResults] = useState({
    knowledgeGraph: {},
    studentProgress: {},
    aiTutor: {},
    contentGeneration: {},
    assessmentEngine: {},
  });
  const [testStatus, setTestStatus] = useState({
    knowledgeGraph: 'idle',
    studentProgress: 'idle',
    aiTutor: 'idle',
    contentGeneration: 'idle',
    assessmentEngine: 'idle',
  });
  const [testOutput, setTestOutput] = useState({});

  // Handle errors in async operations
  const handleError = (err) => {
    console.error('Error in AIDemo component:', err);
    setError(err);
  };

  // Check if test data exists
  useEffect(() => {
    const checkTestData = async () => {
      try {
        console.log('Checking Firebase connection...');
        if (!currentUser) {
          console.log('User not authenticated. Using mock data.');
          return;
        }

        const subjectsQuery = query(collection(db, 'subjects'));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        if (subjectsSnapshot.empty) {
          console.log(
            'No test data found. You may need to populate the database.'
          );
        } else {
          console.log(
            `Found ${subjectsSnapshot.size} subjects in the database.`
          );
        }
      } catch (error) {
        console.error('Error checking test data:', error);
        if (error.code === 'permission-denied') {
          console.log(
            'Using mock data instead of Firebase due to permission issues.'
          );
        }
      }
    };
    checkTestData();
  }, [currentUser]);

  // Debug component rendering and state
  useEffect(() => {
    console.log('AIDemo component mounted/updated');
    return () => {
      console.log('AIDemo component effect cleanup');
    };
  }, [activeTab, testStatus, testResults, testOutput]);

  // Function to populate test data
  const handlePopulateTestData = async () => {
    setLoading(true);
    try {
      if (!currentUser) {
        setError(
          'Authentication required. Please log in to populate test data.'
        );
        alert('Please log in to populate test data.');
        setLoading(false);
        return;
      }
      await populateTestData(db);
      alert('Test data populated successfully!');
    } catch (error) {
      console.error('Error populating test data:', error);
      if (error.code === 'permission-denied') {
        alert('Firebase permission denied. Using mock data for demo purposes.');
      } else {
        alert(`Error populating test data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to run a specific test
  const runTest = async (testName, testFunction) => {
    setTestStatus((prev) => ({ ...prev, [testName]: 'running' }));

    const testConsole = {
      log: (...args) => {
        setTestOutput((prev) => ({
          ...prev,
          [testName]: [...(prev[testName] || []), `[LOG] ${args.join(' ')}`],
        }));
      },
      error: (...args) => {
        setTestOutput((prev) => ({
          ...prev,
          [testName]: [...(prev[testName] || []), `[ERROR] ${args.join(' ')}`],
        }));
      },
      warn: (...args) => {
        setTestOutput((prev) => ({
          ...prev,
          [testName]: [...(prev[testName] || []), `[WARN] ${args.join(' ')}`],
        }));
      },
    };

    try {
      if (!currentUser) {
        testConsole.warn(
          'User not authenticated. Running test with mock data.'
        );
      }
      const results = await testFunction(testConsole);
      setTestResults((prev) => ({ ...prev, [testName]: results }));
      setTestStatus((prev) => ({ ...prev, [testName]: 'completed' }));
    } catch (error) {
      console.error(`Test execution failed: ${error}`);
      testConsole.error(`Error during ${testName} test: ${error}`);
      if (error.code === 'permission-denied') {
        testConsole.warn(
          'Firebase permission denied. Using mock data for demo purposes.'
        );
      }
      setTestStatus((prev) => ({ ...prev, [testName]: 'error' }));
    }
  };

  // Render test output
  const renderTestOutput = (testName) => {
    const output = testOutput[testName] || [];
    return (
      <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-auto h-96">
        {' '}
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {' '}
            {line}{' '}
          </div>
        ))}{' '}
        {testStatus[testName] === 'running' && (
          <div className="animate-pulse"> Running test... </div>
        )}{' '}
      </div>
    );
  };

  // Render test results
  const renderTestResults = (testName) => {
    const results = testResults[testName];
    if (!results) return null;
    return (
      <div className="bg-white p-4 rounded-md shadow-md">
        <h3 className="text-lg font-semibold mb-2"> Test Results </h3>{' '}
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
          {' '}
          {JSON.stringify(results, null, 2)}{' '}
        </pre>{' '}
      </div>
    );
  };

  // If there's an error, show error UI
  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50 m-4">
        <h2 className="text-xl font-bold mb-2"> Something went wrong: </h2>{' '}
        <pre className="text-sm overflow-auto"> {error.message} </pre>{' '}
        <button
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          onClick={() => window.location.reload()}
        >
          Try again{' '}
        </button>{' '}
      </div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4"> MwanaAI AI Features </h2>{' '}
            <p className="mb-4">
              This demo showcases the core AI features of the MwanaAI
              educational platform.Each feature can be tested individually by
              clicking on the corresponding tab.{' '}
            </p>{' '}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-700">
                  {' '}
                  AI Knowledge Graph{' '}
                </h3>{' '}
                <p className="text-sm text-gray-600 mb-2">
                  Generates and visualizes connections between educational
                  concepts.{' '}
                </p>{' '}
                <div className="flex justify-end">
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setActiveTab('knowledgeGraph')}
                  >
                    Test Feature→{' '}
                  </button>{' '}
                </div>{' '}
              </div>{' '}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-700">
                  {' '}
                  Student Progress Tracking{' '}
                </h3>{' '}
                <p className="text-sm text-gray-600 mb-2">
                  Tracks learning activities and provides AI - powered insights.{' '}
                </p>{' '}
                <div className="flex justify-end">
                  <button
                    className="text-sm text-green-600 hover:underline"
                    onClick={() => setActiveTab('studentProgress')}
                  >
                    Test Feature→{' '}
                  </button>{' '}
                </div>{' '}
              </div>{' '}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-700">
                  {' '}
                  AI Tutor{' '}
                </h3>{' '}
                <p className="text-sm text-gray-600 mb-2">
                  Interactive AI tutor that answers questions and explains
                  concepts.{' '}
                </p>{' '}
                <div className="flex justify-end">
                  <button
                    className="text-sm text-purple-600 hover:underline"
                    onClick={() => setActiveTab('aiTutor')}
                  >
                    Test Feature→{' '}
                  </button>{' '}
                </div>{' '}
              </div>{' '}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-700">
                  {' '}
                  Content Generation{' '}
                </h3>{' '}
                <p className="text-sm text-gray-600 mb-2">
                  Generates educational content like notes, quizzes, and
                  flashcards.{' '}
                </p>{' '}
                <div className="flex justify-end">
                  <button
                    className="text-sm text-yellow-600 hover:underline"
                    onClick={() => setActiveTab('contentGeneration')}
                  >
                    Test Feature→{' '}
                  </button>{' '}
                </div>{' '}
              </div>{' '}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold text-red-700">
                  {' '}
                  Assessment Engine{' '}
                </h3>{' '}
                <p className="text-sm text-gray-600 mb-2">
                  Creates assessments and provides detailed feedback on
                  responses.{' '}
                </p>{' '}
                <div className="flex justify-end">
                  <button
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => setActiveTab('assessmentEngine')}
                  >
                    Test Feature→{' '}
                  </button>{' '}
                </div>{' '}
              </div>{' '}
              <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-2"> Test Data </h3>{' '}
                <p className="mb-4">
                  Before running tests, ensure that test data is populated in
                  the database.{' '}
                </p>{' '}
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                  onClick={handlePopulateTestData}
                  disabled={loading}
                >
                  {loading ? 'Populating...' : 'Populate Test Data'}{' '}
                </button>{' '}
              </div>{' '}
            </div>{' '}
          </div>
        );
      case 'knowledgeGraph':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4"> AI Knowledge Graph </h2>{' '}
            <p className="mb-4">
              The AI Knowledge Graph service generates, processes, stores, and
              retrieves knowledge graphs of educational concepts.{' '}
            </p>{' '}
            <div className="mb-6">
              <button
                className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 ${
                  testStatus.knowledgeGraph === 'running'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() => runTest('knowledgeGraph', testKnowledgeGraph)}
                disabled={testStatus.knowledgeGraph === 'running'}
              >
                {testStatus.knowledgeGraph === 'running'
                  ? 'Running Test...'
                  : 'Run Knowledge Graph Test'}{' '}
              </button>{' '}
              <span className="ml-4">
                Status:
                <span
                  className={`ml-2 font-semibold ${
                    testStatus.knowledgeGraph === 'completed'
                      ? 'text-green-600'
                      : testStatus.knowledgeGraph === 'error'
                      ? 'text-red-600'
                      : testStatus.knowledgeGraph === 'running'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {' '}
                  {testStatus.knowledgeGraph === 'idle'
                    ? 'Not Started'
                    : testStatus.knowledgeGraph === 'running'
                    ? 'Running'
                    : testStatus.knowledgeGraph === 'completed'
                    ? 'Completed'
                    : 'Error'}{' '}
                </span>{' '}
              </span>{' '}
            </div>{' '}
            {(testStatus.knowledgeGraph === 'running' ||
              testStatus.knowledgeGraph === 'completed' ||
              testStatus.knowledgeGraph === 'error') && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2"> Test Output </h3>{' '}
                {renderTestOutput('knowledgeGraph')}{' '}
              </div>
            )}{' '}
            {testStatus.knowledgeGraph === 'completed' &&
              renderTestResults('knowledgeGraph')}{' '}
          </div>
        );
      case 'studentProgress':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {' '}
              Student Progress Tracking{' '}
            </h2>{' '}
            <p className="mb-4">
              The Student Progress Tracking service monitors and analyzes
              student learning activities.{' '}
            </p>{' '}
            <div className="mb-6">
              <button
                className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 ${
                  testStatus.studentProgress === 'running'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() => runTest('studentProgress', testStudentProgress)}
                disabled={testStatus.studentProgress === 'running'}
              >
                {testStatus.studentProgress === 'running'
                  ? 'Running Test...'
                  : 'Run Student Progress Test'}{' '}
              </button>{' '}
              <span className="ml-4">
                Status:
                <span
                  className={`ml-2 font-semibold ${
                    testStatus.studentProgress === 'completed'
                      ? 'text-green-600'
                      : testStatus.studentProgress === 'error'
                      ? 'text-red-600'
                      : testStatus.studentProgress === 'running'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {' '}
                  {testStatus.studentProgress === 'idle'
                    ? 'Not Started'
                    : testStatus.studentProgress === 'running'
                    ? 'Running'
                    : testStatus.studentProgress === 'completed'
                    ? 'Completed'
                    : 'Error'}{' '}
                </span>{' '}
              </span>{' '}
            </div>{' '}
            {(testStatus.studentProgress === 'running' ||
              testStatus.studentProgress === 'completed' ||
              testStatus.studentProgress === 'error') && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2"> Test Output </h3>{' '}
                {renderTestOutput('studentProgress')}{' '}
              </div>
            )}{' '}
            {testStatus.studentProgress === 'completed' &&
              renderTestResults('studentProgress')}{' '}
          </div>
        );
      case 'aiTutor':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4"> AI Tutor </h2>{' '}
            <p className="mb-4">
              The AI Tutor service provides interactive conversations with
              students.{' '}
            </p>{' '}
            <div className="mb-6">
              <button
                className={`bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 ${
                  testStatus.aiTutor === 'running'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() => runTest('aiTutor', testAITutor)}
                disabled={testStatus.aiTutor === 'running'}
              >
                {testStatus.aiTutor === 'running'
                  ? 'Running Test...'
                  : 'Run AI Tutor Test'}{' '}
              </button>{' '}
              <span className="ml-4">
                Status:
                <span
                  className={`ml-2 font-semibold ${
                    testStatus.aiTutor === 'completed'
                      ? 'text-green-600'
                      : testStatus.aiTutor === 'error'
                      ? 'text-red-600'
                      : testStatus.aiTutor === 'running'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {' '}
                  {testStatus.aiTutor === 'idle'
                    ? 'Not Started'
                    : testStatus.aiTutor === 'running'
                    ? 'Running'
                    : testStatus.aiTutor === 'completed'
                    ? 'Completed'
                    : 'Error'}{' '}
                </span>{' '}
              </span>{' '}
            </div>{' '}
            {(testStatus.aiTutor === 'running' ||
              testStatus.aiTutor === 'completed' ||
              testStatus.aiTutor === 'error') && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2"> Test Output </h3>{' '}
                {renderTestOutput('aiTutor')}{' '}
              </div>
            )}{' '}
            {testStatus.aiTutor === 'completed' && renderTestResults('aiTutor')}{' '}
          </div>
        );
      case 'contentGeneration':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4"> Content Generation </h2>{' '}
            <p className="mb-4">
              The Content Generation service creates educational materials like
              study notes, quizzes, and flashcards.{' '}
            </p>{' '}
            <div className="mb-6">
              <button
                className={`bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50 ${
                  testStatus.contentGeneration === 'running'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() =>
                  runTest('contentGeneration', testContentGeneration)
                }
                disabled={testStatus.contentGeneration === 'running'}
              >
                {testStatus.contentGeneration === 'running'
                  ? 'Running Test...'
                  : 'Run Content Generation Test'}{' '}
              </button>{' '}
              <span className="ml-4">
                Status:
                <span
                  className={`ml-2 font-semibold ${
                    testStatus.contentGeneration === 'completed'
                      ? 'text-green-600'
                      : testStatus.contentGeneration === 'error'
                      ? 'text-red-600'
                      : testStatus.contentGeneration === 'running'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {' '}
                  {testStatus.contentGeneration === 'idle'
                    ? 'Not Started'
                    : testStatus.contentGeneration === 'running'
                    ? 'Running'
                    : testStatus.contentGeneration === 'completed'
                    ? 'Completed'
                    : 'Error'}{' '}
                </span>{' '}
              </span>{' '}
            </div>{' '}
            {(testStatus.contentGeneration === 'running' ||
              testStatus.contentGeneration === 'completed' ||
              testStatus.contentGeneration === 'error') && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2"> Test Output </h3>{' '}
                {renderTestOutput('contentGeneration')}{' '}
              </div>
            )}{' '}
            {testStatus.contentGeneration === 'completed' &&
              renderTestResults('contentGeneration')}{' '}
          </div>
        );
      case 'assessmentEngine':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4"> Assessment Engine </h2>{' '}
            <p className="mb-4">
              The Assessment Engine service generates assessments and provides
              detailed feedback.{' '}
            </p>{' '}
            <div className="mb-6">
              <button
                className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 ${
                  testStatus.assessmentEngine === 'running'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() =>
                  runTest('assessmentEngine', testAssessmentEngine)
                }
                disabled={testStatus.assessmentEngine === 'running'}
              >
                {testStatus.assessmentEngine === 'running'
                  ? 'Running Test...'
                  : 'Run Assessment Engine Test'}{' '}
              </button>{' '}
              <span className="ml-4">
                Status:
                <span
                  className={`ml-2 font-semibold ${
                    testStatus.assessmentEngine === 'completed'
                      ? 'text-green-600'
                      : testStatus.assessmentEngine === 'error'
                      ? 'text-red-600'
                      : testStatus.assessmentEngine === 'running'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  {' '}
                  {testStatus.assessmentEngine === 'idle'
                    ? 'Not Started'
                    : testStatus.assessmentEngine === 'running'
                    ? 'Running'
                    : testStatus.assessmentEngine === 'completed'
                    ? 'Completed'
                    : 'Error'}{' '}
                </span>{' '}
              </span>{' '}
            </div>{' '}
            {(testStatus.assessmentEngine === 'running' ||
              testStatus.assessmentEngine === 'completed' ||
              testStatus.assessmentEngine === 'error') && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2"> Test Output </h3>{' '}
                {renderTestOutput('assessmentEngine')}{' '}
              </div>
            )}{' '}
            {testStatus.assessmentEngine === 'completed' &&
              renderTestResults('assessmentEngine')}{' '}
          </div>
        );
      default:
        return <div> Select a tab to view content. </div>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6"> AI Features Demo </h1>{' '}
      {!currentUser && (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6"
          role="alert"
        >
          <p className="font-bold"> Authentication Required </p>{' '}
          <p>
            {' '}
            Please log in to fully access all Firebase features.Some features
            may use mock data when not authenticated.{' '}
          </p>{' '}
        </div>
      )}{' '}
      <div className="mb-6">
        <button
          className={`px-4 py-2 ${
            activeTab === 'overview' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          } rounded-t-lg mr-2`}
          onClick={() => setActiveTab('overview')}
        >
          Overview{' '}
        </button>{' '}
        <button
          className={`px-4 py-2 ${
            activeTab === 'knowledgeGraph'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200'
          } rounded-t-lg mr-2`}
          onClick={() => setActiveTab('knowledgeGraph')}
        >
          Knowledge Graph{' '}
        </button>{' '}
        <button
          className={`px-4 py-2 ${
            activeTab === 'studentProgress'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200'
          } rounded-t-lg mr-2`}
          onClick={() => setActiveTab('studentProgress')}
        >
          Student Progress{' '}
        </button>{' '}
        <button
          className={`px-4 py-2 ${
            activeTab === 'aiTutor' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          } rounded-t-lg mr-2`}
          onClick={() => setActiveTab('aiTutor')}
        >
          AI Tutor{' '}
        </button>{' '}
        <button
          className={`px-4 py-2 ${
            activeTab === 'contentGeneration'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200'
          } rounded-t-lg mr-2`}
          onClick={() => setActiveTab('contentGeneration')}
        >
          Content Generation{' '}
        </button>{' '}
        <button
          className={`px-4 py-2 ${
            activeTab === 'assessmentEngine'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200'
          } rounded-t-lg mr-2`}
          onClick={() => setActiveTab('assessmentEngine')}
        >
          Assessment Engine{' '}
        </button>{' '}
      </div>{' '}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {' '}
        {renderTabContent()}{' '}
      </div>{' '}
    </div>
  );
};

export default AIDemo;
