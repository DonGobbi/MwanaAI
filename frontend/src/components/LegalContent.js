import React from 'react';

// The legal copy, with no page chrome — so it can render both as standalone
// public pages (/terms, /privacy) and inside the in-app Settings panel.

export const TermsContent = () => (
  <>
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
  </>
);

export const PrivacyContent = () => (
  <>
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
  </>
);
