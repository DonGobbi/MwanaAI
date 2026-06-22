import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import TagManager from './TagManager';

const TopicForm = ({ topicId = null }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [relatedTopics, setRelatedTopics] = useState([]);
  const [selectedRelatedTopic, setSelectedRelatedTopic] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    gradeLevel: '',
    difficulty: 'medium',
    learningObjectives: '',
    relatedTopics: []
  });

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const gradeLevelOptions = [
    { value: 'Form 1', label: 'Form 1' },
    { value: 'Form 2', label: 'Form 2' },
    { value: 'Form 3', label: 'Form 3' },
    { value: 'Form 4', label: 'Form 4' }
  ];

  useEffect(() => {
    // Fetch subjects for dropdown
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/subjects');
        if (!response.ok) {
          throw new Error('Failed to fetch subjects');
        }
        const data = await response.json();
        setSubjects(data.data);
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };

    // Fetch all topics for related topics dropdown
    const fetchTopics = async () => {
      try {
        const response = await fetch('/api/topics');
        if (!response.ok) {
          throw new Error('Failed to fetch topics');
        }
        const data = await response.json();
        setAllTopics(data.data);
      } catch (err) {
        console.error('Error fetching topics:', err);
      }
    };

    // If editing, fetch topic data
    const fetchTopicData = async () => {
      if (!topicId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/topics/${topicId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch topic');
        }
        
        const data = await response.json();
        setFormData({
          name: data.data.name || '',
          description: data.data.description || '',
          subject: data.data.subject || '',
          gradeLevel: data.data.gradeLevel || '',
          difficulty: data.data.difficulty || 'medium',
          learningObjectives: data.data.learningObjectives || '',
          relatedTopics: data.data.relatedTopics || []
        });
        
        setRelatedTopics(data.data.relatedTopics || []);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
    fetchTopics();
    fetchTopicData();
  }, [topicId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddRelatedTopic = () => {
    if (selectedRelatedTopic && !relatedTopics.includes(selectedRelatedTopic)) {
      const updatedRelatedTopics = [...relatedTopics, selectedRelatedTopic];
      setRelatedTopics(updatedRelatedTopics);
      setFormData({
        ...formData,
        relatedTopics: updatedRelatedTopics
      });
      setSelectedRelatedTopic('');
    }
  };

  const handleRemoveRelatedTopic = (topicToRemove) => {
    const updatedRelatedTopics = relatedTopics.filter(topic => topic !== topicToRemove);
    setRelatedTopics(updatedRelatedTopics);
    setFormData({
      ...formData,
      relatedTopics: updatedRelatedTopics
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = topicId 
        ? `/api/topics/${topicId}` 
        : '/api/topics';
      
      const method = topicId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save topic');
      }

      // Navigate back to content management
      navigate('/content-management');
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && topicId) {
    return (
      <div className="flex justify-center my-8">
        <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        {topicId ? 'Edit Topic' : 'Add New Topic'}
      </h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Topic Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="e.g. Quadratic Equations, Cell Division"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Provide a brief description of this topic..."
            ></textarea>
          </div>

          {/* Subject and Grade Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject *
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
                Grade Level *
              </label>
              <select
                id="gradeLevel"
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select grade level</option>
                {gradeLevelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
              Difficulty Level
            </label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {difficultyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Learning Objectives */}
          <div>
            <label htmlFor="learningObjectives" className="block text-sm font-medium text-gray-700">
              Learning Objectives
            </label>
            <textarea
              id="learningObjectives"
              name="learningObjectives"
              rows={4}
              value={formData.learningObjectives}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="List the key learning objectives for this topic..."
            ></textarea>
            <p className="mt-1 text-sm text-gray-500">
              Enter each learning objective on a new line.
            </p>
          </div>

          {/* Related Topics */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Topics
            </label>
            <div className="mb-3">
              <select
                value={selectedRelatedTopic}
                onChange={(e) => setSelectedRelatedTopic(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 mb-2"
              >
                <option value="">Select a related topic</option>
                {allTopics
                  .filter(topic => topic.id !== topicId && !relatedTopics.includes(topic.name))
                  .map(topic => (
                    <option key={topic.id} value={topic.name}>
                      {topic.name} ({topic.subject})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddRelatedTopic}
                disabled={!selectedRelatedTopic}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Selected Topic
              </button>
            </div>
            
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Related Topics:</p>
              <TagManager 
                tags={relatedTopics} 
                onChange={(updatedTopics) => {
                  setRelatedTopics(updatedTopics);
                  setFormData({
                    ...formData,
                    relatedTopics: updatedTopics
                  });
                }}
                placeholder="Add a topic manually"
                colorScheme="warning"
              />
              <p className="mt-1 text-xs text-gray-500">
                Related topics help students understand the connections between different subjects.
              </p>
            </div>
          </div>

          {/* Submit and Cancel buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate('/content-management')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Topic'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TopicForm;
