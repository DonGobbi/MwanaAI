import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const features = [
  {
    title: 'Help with any subject',
    description:
      'Maths, Science, English, Chichewa and more — ask about anything you are learning in class.',
  },
  {
    title: 'Explained for your level',
    description:
      'Tell us your class or form and the tutor explains things in a way that fits your age.',
  },
  {
    title: 'Step by step',
    description:
      'The tutor guides you through problems so you actually understand, not just copy answers.',
  },
];

const Home = () => {
  const { currentUser } = useAuth();
  const startLink = currentUser ? '/tutor' : '/signup';

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-primary-700 text-white">
        <div className="container py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Your personal AI tutor
          </h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto mb-8">
            MwanaAI helps students in Malawi understand their schoolwork — any
            subject, explained step by step for your class level.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to={startLink}
              className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-md hover:bg-primary-50 transition-colors"
            >
              {currentUser ? 'Go to your tutor' : 'Start learning free'}
            </Link>
            {!currentUser && (
              <Link
                to="/login"
                className="border border-white text-white font-semibold px-8 py-3 rounded-md hover:bg-primary-600 transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="text-center p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="bg-gray-50">
        <div className="container py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Ready to learn?
          </h2>
          <p className="text-gray-600 mb-8">
            Create a free account, pick your class and subject, and start asking
            questions.
          </p>
          <Link
            to={startLink}
            className="bg-primary-600 text-white font-semibold px-8 py-3 rounded-md hover:bg-primary-700 transition-colors inline-block"
          >
            {currentUser ? 'Open the tutor' : 'Get started'}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
