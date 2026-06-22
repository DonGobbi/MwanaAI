import React from 'react';
import { useParams } from 'react-router-dom';
import TopicForm from '../components/TopicForm';
import Section from '../components/Section';

const TopicFormPage = () => {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Section>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {id === 'new' ? 'Add New Topic' : 'Edit Topic'}
        </h1>
        <TopicForm topicId={id !== 'new' ? id : null} />
      </Section>
    </div>
  );
};

export default TopicFormPage;
