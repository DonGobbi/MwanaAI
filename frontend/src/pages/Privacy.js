import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { PrivacyContent } from '../components/LegalContent';

const Privacy = () => (
  <div className="bg-gray-50 min-h-screen">
    <div className="container py-10 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 mb-6">
        <Logo size={36} />
        <span className="text-xl font-bold font-display text-primary-700">MwanaAI</span>
      </Link>
      <div className="card p-6 sm:p-8 prose prose-sm max-w-none">
        <PrivacyContent />
      </div>
      <p className="text-center mt-6">
        <Link to="/" className="text-sm text-primary-600 hover:underline">← Back to MwanaAI</Link>
      </p>
    </div>
  </div>
);

export default Privacy;
