import React, { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';

// Sample subjects for educational platform
const sampleSubjects = [
  { name: 'Mathematics', description: 'Study of numbers, quantities, and shapes', icon: 'calculator' },
  { name: 'English', description: 'Language arts and literature', icon: 'book' },
  { name: 'Biology', description: 'Study of living organisms', icon: 'microscope' },
  { name: 'Chemistry', description: 'Study of matter and its properties', icon: 'flask' },
  { name: 'Physics', description: 'Study of matter, energy, and their interactions', icon: 'atom' },
  { name: 'History', description: 'Study of past events', icon: 'clock' },
  { name: 'Geography', description: 'Study of places and environments', icon: 'globe' },
  { name: 'Computer Science', description: 'Study of computers and computational systems', icon: 'computer' },
  { name: 'Art', description: 'Visual and performing arts', icon: 'palette' },
  { name: 'Music', description: 'Study of sound and musical composition', icon: 'music' }
];

const SubjectInitializer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const addSampleSubjects = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const subjectsCollection = collection(db, 'subjects');
      let addedCount = 0;
      
      for (const subject of sampleSubjects) {
        await addDoc(subjectsCollection, {
          ...subject,
          createdAt: new Date()
        });
        addedCount++;
      }
      
      setResult(`Successfully added ${addedCount} subjects to the database.`);
    } catch (err) {
      setError(`Error adding subjects: ${err.message}`);
      console.error('Error adding subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Initialize Subjects</h2>
      <p className="text-sm text-gray-600 mb-4">
        Click the button below to add sample subjects to the database. This is useful if your subject dropdown is empty.
      </p>
      
      {result && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          {result}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <button
        onClick={addSampleSubjects}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Adding Subjects...' : 'Add Sample Subjects'}
      </button>
    </div>
  );
};

export default SubjectInitializer;
