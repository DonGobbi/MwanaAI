import React from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../hooks/useCourses';
import EmptyState from '../components/EmptyState';
import { FiBookOpen, FiEdit3, FiMessageCircle, FiLayers } from 'react-icons/fi';

const ACTIONS = [
  { to: 'learn', label: 'Learn', icon: FiBookOpen, cls: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
  { to: 'quiz', label: 'Practice', icon: FiEdit3, cls: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { to: 'tutor', label: 'Tutor', icon: FiMessageCircle, cls: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
  { to: 'flashcards', label: 'Flashcards', icon: FiLayers, cls: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
];

// The student's hub — every subject they're enrolled in, with one-tap access to
// Learn / Practice / Tutor / Flashcards for that subject.
const MyCourses = () => {
  const { levelLabel, subjects } = useCourses();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My courses</h1>
        <p className="text-gray-600 text-sm mb-6">
          {levelLabel}
          {subjects.length ? ` · ${subjects.length} subject${subjects.length !== 1 ? 's' : ''}` : ''}
        </p>

        {subjects.length === 0 ? (
          <div className="card p-6">
            <EmptyState icon={FiBookOpen} title="No courses yet"
              description="Your subjects will appear here once they're set up." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((s) => (
              <div key={s.value} className="card p-5">
                <h2 className="font-bold text-gray-900">{s.label}</h2>
                <p className="text-xs text-gray-400 mb-4">{levelLabel}</p>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIONS.map((a) => (
                    <Link key={a.to} to={`/${a.to}?subject=${s.value}`}
                      className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${a.cls}`}>
                      <a.icon className="w-4 h-4" /> {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
