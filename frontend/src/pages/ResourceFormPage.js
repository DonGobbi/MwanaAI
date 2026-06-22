import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import ResourceForm from '../components/ResourceForm';
import Section from '../components/Section';
import SubjectInitializer from '../components/SubjectInitializer';

const ResourceFormPage = () => {
  const { id } = useParams();
  const [showSubjectInitializer, setShowSubjectInitializer] = useState(false);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Section>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {id === 'new' ? 'Add New Resource' : 'Edit Resource'}
          </h1>
          <button 
            onClick={() => setShowSubjectInitializer(!showSubjectInitializer)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {showSubjectInitializer ? 'Hide Subject Tool' : 'Subject Dropdown Empty?'}
          </button>
        </div>
        
        {showSubjectInitializer && (
          <div className="mb-8">
            <SubjectInitializer />
          </div>
        )}
        
        <ResourceForm resourceId={id !== 'new' ? id : null} />
      </Section>
    </div>
  );
};

export default ResourceFormPage;
