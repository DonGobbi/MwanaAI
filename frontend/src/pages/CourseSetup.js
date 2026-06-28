import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GRADE_LEVELS } from '../config/curriculum';
import { useSchoolSubjects } from '../hooks/useSchoolSubjects';
import Logo from '../components/Logo';
import Spinner from '../components/Spinner';

// One-time setup shown to a student who has no subjects yet. Captures their
// class + subjects so the whole platform can personalise itself — they're never
// asked to pick a class/subject again.
const CourseSetup = () => {
  const { userProfile, updateCourses, logout } = useAuth();
  const { subjects: subjectChoices } = useSchoolSubjects(userProfile?.schoolId);
  const [level, setLevel] = useState(userProfile?.gradeLevel || '');
  const [subjects, setSubjects] = useState(userProfile?.subjects || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (v) =>
    setSubjects((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const save = async () => {
    if (!level) {
      setError('Please choose your class.');
      return;
    }
    if (subjects.length === 0) {
      setError('Pick at least one subject you are studying.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateCourses({ gradeLevel: level, subjects });
      // The gate disappears automatically once the profile has subjects.
    } catch (e) {
      setError('Could not save. Please check your connection and try again.');
      setSaving(false);
    }
  };

  const name = (userProfile?.firstName || userProfile?.displayName || '').split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size={40} />
          <span className="text-2xl font-bold font-display text-primary-700">MwanaAI</span>
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {name ? `Welcome, ${name}! ` : ''}Set up your courses
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            Tell us your class and the subjects you're studying. We'll personalise everything for you —
            you won't be asked to pick a class or subject again.
          </p>

          <label className="block text-sm font-medium text-gray-700 mb-1">Your class</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm mb-4">
            <option value="">Select your class</option>
            <optgroup label="Primary">
              {GRADE_LEVELS.filter((g) => g.stage === 'Primary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </optgroup>
            <optgroup label="Secondary">
              {GRADE_LEVELS.filter((g) => g.stage === 'Secondary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </optgroup>
          </select>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your subjects <span className="font-normal text-gray-400">({subjects.length} selected)</span>
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {subjectChoices.map((s) => {
              const on = subjects.includes(s.value);
              return (
                <label key={s.value}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${
                    on ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(s.value)}
                    className="rounded text-primary-600 focus:ring-primary-500" />
                  {s.label}
                </label>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <button onClick={save} disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors inline-flex items-center justify-center">
            {saving ? <Spinner className="w-5 h-5" /> : 'Start learning'}
          </button>
          <button onClick={logout} className="w-full text-xs text-gray-400 hover:text-gray-600 mt-3">Log out</button>
        </div>
      </div>
    </div>
  );
};

export default CourseSetup;
