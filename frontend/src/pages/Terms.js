import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const Terms = () => (
  <div className="bg-gray-50 min-h-screen">
    <div className="container py-10 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 mb-6">
        <Logo size={36} />
        <span className="text-xl font-bold font-display text-primary-700">MwanaAI</span>
      </Link>
      <div className="card p-6 sm:p-8 prose prose-sm max-w-none">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Terms of Use</h1>
        <p className="text-sm text-gray-400 mb-6">Last updated: June 2026</p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">1. Acceptance</h2>
        <p className="text-gray-600 text-sm mb-4">
          By using MwanaAI you agree to these terms. MwanaAI is an educational platform for learners,
          teachers and schools in Malawi and beyond.
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">2. Accounts</h2>
        <p className="text-gray-600 text-sm mb-4">
          You are responsible for keeping your account secure and for activity under it. Schools and
          administrators manage the accounts they create for their teachers, students and parents.
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">3. Acceptable use</h2>
        <p className="text-gray-600 text-sm mb-4">
          Use MwanaAI for learning and teaching. Do not misuse the service, attempt to access other
          users' data, or upload unlawful or harmful content.
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">4. AI-generated content</h2>
        <p className="text-gray-600 text-sm mb-4">
          MwanaAI uses AI to generate lessons, quizzes and explanations. These can occasionally be
          inaccurate — always review important content before relying on it.
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">5. Changes</h2>
        <p className="text-gray-600 text-sm mb-4">
          We may update these terms. Continued use after an update means you accept the new terms.
        </p>

        <p className="text-gray-500 text-sm mt-8">
          Questions? Contact your school administrator or Rexplore Research Labs.
        </p>
      </div>
      <p className="text-center mt-6">
        <Link to="/" className="text-sm text-primary-600 hover:underline">← Back to MwanaAI</Link>
      </p>
    </div>
  </div>
);

export default Terms;
