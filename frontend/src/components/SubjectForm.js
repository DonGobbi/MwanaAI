import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

const SubjectForm = ({ subjectId = null }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGrades, setSelectedGrades] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconUrl: '',
    gradeLevels: [],
    color: '#3B82F6' // Default color - blue
  });

  const gradeOptions = [
    { value: 'Form 1', label: 'Form 1' },
    { value: 'Form 2', label: 'Form 2' },
    { value: 'Form 3', label: 'Form 3' },
    { value: 'Form 4', label: 'Form 4' }
  ];

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Yellow' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6B7280', label: 'Gray' }
  ];

  useEffect(() => {
    // If editing, fetch subject data
    const fetchSubjectData = async () => {
      if (!subjectId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/subjects/${subjectId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch subject');
        }
        
        const data = await response.json();
        setFormData({
          name: data.data.name || '',
          description: data.data.description || '',
          iconUrl: data.data.iconUrl || '',
          gradeLevels: data.data.gradeLevels || [],
          color: data.data.color || '#3B82F6'
        });
        
        setSelectedGrades(data.data.gradeLevels || []);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectData();
  }, [subjectId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleGradeChange = (grade) => {
    const updatedGrades = selectedGrades.includes(grade)
      ? selectedGrades.filter(g => g !== grade)
      : [...selectedGrades, grade];
    
    setSelectedGrades(updatedGrades);
    setFormData({
      ...formData,
      gradeLevels: updatedGrades
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = subjectId 
        ? `/api/subjects/${subjectId}` 
        : '/api/subjects';
      
      const method = subjectId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save subject');
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

  if (isLoading && subjectId) {
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
        {subjectId ? 'Edit Subject' : 'Add New Subject'}
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
              Subject Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="e.g. Mathematics, Biology, Physics"
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
              placeholder="Provide a brief description of this subject..."
            ></textarea>
          </div>

          {/* Icon URL */}
          <div>
            <label htmlFor="iconUrl" className="block text-sm font-medium text-gray-700">
              Icon URL
            </label>
            <input
              type="url"
              id="iconUrl"
              name="iconUrl"
              value={formData.iconUrl}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="https://example.com/icon.svg"
            />
            <p className="mt-1 text-sm text-gray-500">
              URL to an icon representing this subject. SVG format recommended.
            </p>
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700">
              Subject Color
            </label>
            <div className="mt-1 flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full border border-gray-300" 
                style={{ backgroundColor: formData.color }}
              ></div>
              <select
                id="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                {colorOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade Levels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade Levels
            </label>
            <div className="grid grid-cols-2 gap-2">
              {gradeOptions.map(grade => (
                <div key={grade.value} className="flex items-center">
                  <input
                    id={`grade-${grade.value}`}
                    name="gradeLevels"
                    type="checkbox"
                    checked={selectedGrades.includes(grade.value)}
                    onChange={() => handleGradeChange(grade.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`grade-${grade.value}`} className="ml-2 block text-sm text-gray-700">
                    {grade.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Select all grade levels where this subject is taught. Leave empty if applicable to all grades.
            </p>
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
                'Save Subject'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubjectForm;
