import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADE_LEVELS } from '../config/curriculum';
import Logo from './Logo';

export const ONBOARDED_KEY = 'mwanaai_onboarded';

const STARTERS = [
  "I don't understand my homework",
  'Explain a topic to me',
  'Give me a practice question',
];

// First-run flow for students: pick class + subject, then ask a first question.
const Onboarding = ({ onClose }) => {
  const { updateGradeLevel } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');

  const close = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    onClose?.();
  };

  const finish = (q) => {
    const text = (q ?? question).trim();
    if (grade) updateGradeLevel(grade);
    localStorage.setItem(ONBOARDED_KEY, '1');
    onClose?.();
    navigate('/tutor', {
      state: { fromOnboarding: true, subject, gradeLevel: grade, question: text },
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-fade-in">
      <div className="card p-6 w-full max-w-md animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Logo size={32} />
          <span className="font-bold font-display text-gray-900">MwanaAI</span>
        </div>

        {step === 1 ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome! 🎓</h2>
            <p className="text-sm text-gray-500 mb-5">
              Let's set you up. Tell us your class and what you'd like help with.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Your class</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 mb-4"
            >
              <option value="">Select your class</option>
              <optgroup label="Primary">
                {GRADE_LEVELS.filter((g) => g.stage === 'Primary').map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </optgroup>
              <optgroup label="Secondary">
                {GRADE_LEVELS.filter((g) => g.stage === 'Secondary').map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </optgroup>
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 mb-5"
            >
              <option value="">Select a subject</option>
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <div className="flex items-center justify-between">
              <button onClick={close} className="text-sm text-gray-500 hover:text-gray-700">
                Skip for now
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!grade || !subject}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Ask your first question</h2>
            <p className="text-sm text-gray-500 mb-4">
              What would you like help with today? Type it, or tap one below.
            </p>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="e.g. How do I add fractions?"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 mb-3 text-sm"
            />

            <div className="flex flex-wrap gap-2 mb-5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => finish(s)}
                  className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">
                ← Back
              </button>
              <button
                onClick={() => finish()}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Start learning →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
