import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const Privacy = () => (
  <div className="bg-gray-50 min-h-screen">
    <div className="container py-10 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 mb-6">
        <Logo size={36} />
        <span className="text-xl font-bold font-display text-primary-700">MwanaAI</span>
      </Link>
      <div className="card p-6 sm:p-8 prose prose-sm max-w-none">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-6">Last updated: June 2026</p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">1. What we collect</h2>
        <p className="text-gray-600 text-sm mb-4">
          Your name, email, role and school, the profile details you choose to add (such as phone,
          gender and date of birth), and your learning activity (lessons, quizzes and progress).
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">2. How we use it</h2>
        <p className="text-gray-600 text-sm mb-4">
          To run your account, personalise learning to your level, let teachers and parents see
          progress, and improve the platform. We do not sell your personal data.
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">3. Who can see your data</h2>
        <p className="text-gray-600 text-sm mb-4">
          Your teachers and school administrators can see your progress and account details for their
          school. Parents can see their own child's progress. Administrators act only within their school.
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">4. Keeping data safe</h2>
        <p className="text-gray-600 text-sm mb-4">
          Access is controlled by security rules so people only see data they're allowed to. Deactivated
          accounts can't sign in, and archived accounts are kept for a limited period before removal.
        </p>

        <h2 className="font-bold text-gray-900 mt-6 mb-2">5. Your choices</h2>
        <p className="text-gray-600 text-sm mb-4">
          You can update your profile any time, and ask your school administrator to reset, deactivate or
          remove your account.
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

export default Privacy;
