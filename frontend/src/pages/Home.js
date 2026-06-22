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
    title: 'Learn, practise, track',
    description:
      'Follow guided lessons, take quizzes and exam practice, and watch your progress grow.',
  },
];

// Cards shown to a logged-in student.
const STUDENT_CARDS = [
  { to: '/learn', title: '📖 Learn', text: 'Guided lessons by topic, for your class.' },
  { to: '/tutor', title: '💬 Tutor', text: 'Ask anything or upload your homework.' },
  { to: '/quiz', title: '📝 Practice', text: 'Quizzes and PSLCE/JCE/MSCE exam practice.' },
  { to: '/progress', title: '📈 Progress', text: 'See your scores and join a class.' },
];

const DashboardCard = ({ to, title, text }) => (
  <Link to={to} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
    <p className="text-lg font-bold text-gray-900 mb-1">{title}</p>
    <p className="text-sm text-gray-600">{text}</p>
  </Link>
);

const Home = () => {
  const { currentUser, userProfile } = useAuth();
  const role = userProfile?.userType || 'student';
  const firstName = currentUser?.displayName ? currentUser.displayName.split(' ')[0] : '';

  // ---- Logged-in dashboard ----
  if (currentUser) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-10 max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-gray-600 mb-6">
            {role === 'teacher'
              ? 'Manage your classes and track your students.'
              : role === 'parent'
              ? "Follow your child's learning progress."
              : 'What would you like to do today?'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {role === 'teacher' ? (
              <>
                <DashboardCard to="/teacher" title="👩‍🏫 My Classes" text="Create classes and track student progress." />
                <DashboardCard to="/tutor" title="💬 Tutor" text="Try the AI tutor yourself." />
              </>
            ) : role === 'parent' ? (
              <DashboardCard to="/child" title="👨‍👩‍👧 My Child" text="View your child's progress by email." />
            ) : (
              STUDENT_CARDS.map((c) => <DashboardCard key={c.to} {...c} />)
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Public landing ----
  return (
    <div className="bg-white">
      <section className="bg-primary-700 text-white">
        <div className="container py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Your personal AI tutor</h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto mb-8">
            MwanaAI helps students in Malawi learn — guided lessons, exam practice
            and an AI tutor, explained step by step for your class level.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-md hover:bg-primary-50 transition-colors">
              Start learning free
            </Link>
            <Link to="/login" className="border border-white text-white font-semibold px-8 py-3 rounded-md hover:bg-primary-600 transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </section>

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

      <section className="bg-gray-50">
        <div className="container py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Ready to learn?</h2>
          <p className="text-gray-600 mb-8">
            Create a free account, pick your class and subject, and start learning.
          </p>
          <Link to="/signup" className="bg-primary-600 text-white font-semibold px-8 py-3 rounded-md hover:bg-primary-700 transition-colors inline-block">
            Get started
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
