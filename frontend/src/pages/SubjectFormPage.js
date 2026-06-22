import React from 'react';
import { useParams } from 'react-router-dom';
import SubjectForm from '../components/SubjectForm';
import Section from '../components/Section';

const SubjectFormPage = () => {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Section>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {id === 'new' ? 'Add New Subject' : 'Edit Subject'}
        </h1>
        <SubjectForm subjectId={id !== 'new' ? id : null} />
      </Section>
    </div>
  );
};

export default SubjectFormPage;
