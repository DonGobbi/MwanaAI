import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { lessonService } from '../services/lessonService';
import { SUBJECTS, GRADE_LEVELS, getSubject, getGradeLevel } from '../config/curriculum';
import Markdown from '../components/Markdown';
import Spinner, { PageLoader } from '../components/Spinner';

const Learn = () => {
  const { currentUser, userProfile, updateGradeLevel } = useAuth();

  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState([]);
  const [completed, setCompleted] = useState(new Set());
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState('');

  const [activeTopic, setActiveTopic] = useState(null);
  const [lesson, setLesson] = useState('');
  const [loadingLesson, setLoadingLesson] = useState(false);

  useEffect(() => {
    const saved = userProfile?.gradeLevel || localStorage.getItem('mwanaai_grade_level') || '';
    if (saved) setGradeLevel(saved);
  }, [userProfile]);

  const handleGradeChange = (e) => {
    const value = e.target.value;
    setGradeLevel(value);
    if (value) updateGradeLevel(value);
    setTopics([]);
    setActiveTopic(null);
  };

  const handleSubjectChange = (e) => {
    setSubject(e.target.value);
    setTopics([]);
    setActiveTopic(null);
  };

  const refreshCompleted = useCallback(async () => {
    if (!currentUser || !subject || !gradeLevel) return;
    try {
      const set = await lessonService.getCompleted(
        currentUser.uid,
        getSubject(subject)?.label || subject,
        getGradeLevel(gradeLevel)?.label || gradeLevel
      );
      setCompleted(set);
    } catch (err) {
      console.error('Could not load completed topics:', err);
    }
  }, [currentUser, subject, gradeLevel]);

  const loadTopics = async () => {
    setError('');
    if (!gradeLevel || !subject) {
      setError('Please choose your class and subject.');
      return;
    }
    setLoadingTopics(true);
    setActiveTopic(null);
    try {
      const list = await lessonService.getTopics({
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(gradeLevel)?.label || gradeLevel,
        ageHint: getGradeLevel(gradeLevel)?.approxAge,
      });
      setTopics(list);
      refreshCompleted();
    } catch (err) {
      setError(err.message || 'Could not load topics.');
    } finally {
      setLoadingTopics(false);
    }
  };

  const openLesson = async (topic) => {
    setActiveTopic(topic);
    setLesson('');
    setLoadingLesson(true);
    try {
      const content = await lessonService.getLesson({
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(gradeLevel)?.label || gradeLevel,
        ageHint: getGradeLevel(gradeLevel)?.approxAge,
        topic: topic.title,
      });
      setLesson(content);
    } catch (err) {
      setLesson(`*${err.message || 'Could not load this lesson. Please try again.'}*`);
    } finally {
      setLoadingLesson(false);
    }
  };

  const completeTopic = async () => {
    if (!activeTopic || !currentUser) return;
    try {
      await lessonService.markComplete(currentUser.uid, {
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(gradeLevel)?.label || gradeLevel,
        topic: activeTopic.title,
      });
      setCompleted((prev) => new Set(prev).add(activeTopic.title));
    } catch (err) {
      console.error('Could not mark complete:', err);
    }
  };

  const progressPct = topics.length
    ? Math.round((topics.filter((t) => completed.has(t.title)).length / topics.length) * 100)
    : 0;
  const isDone = activeTopic && completed.has(activeTopic.title);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Learn</h1>
        <p className="text-gray-600 text-sm mb-6">
          Pick your class and subject to get a guided course — learn each topic step by step.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left rail: pickers + topics */}
          <div className="lg:col-span-1 lg:sticky lg:top-20">
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 mb-3">
                <select value={gradeLevel} onChange={handleGradeChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
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
                <select value={subject} onChange={handleSubjectChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
                  <option value="">Select a subject</option>
                  {SUBJECTS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
              <button onClick={loadTopics} disabled={loadingTopics}
                className="inline-flex items-center justify-center w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg transition-colors">
                {loadingTopics ? <Spinner className="w-5 h-5" label="Loading…" /> : 'Show topics'}
              </button>
            </div>

            {topics.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-700">Topics</h2>
                  <span className="text-xs text-gray-500">{progressPct}% done</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="space-y-1">
                  {topics.map((t, i) => {
                    const done = completed.has(t.title);
                    const active = activeTopic?.title === t.title;
                    return (
                      <button key={i} onClick={() => openLesson(t)}
                        className={`w-full text-left flex items-start gap-2 px-2 py-2 rounded-lg transition-colors ${
                          active ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}>
                        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          done ? 'bg-green-100 text-green-700' : active ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'
                        }`}>
                          {done ? '✓' : i + 1}
                        </span>
                        <span className={`text-sm leading-snug ${active ? 'font-semibold text-primary-700' : 'text-gray-800'}`}>{t.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right pane: lesson */}
          <div className="lg:col-span-2">
            {!activeTopic ? (
              <div className="card p-10 text-center text-gray-500">
                <p className="text-4xl mb-3">📖</p>
                <p className="font-medium text-gray-700">
                  {topics.length ? 'Pick a topic to start learning.' : 'Choose your class and subject, then tap "Show topics".'}
                </p>
              </div>
            ) : (
              <>
                <div className="card p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{activeTopic.title}</h1>
                  <p className="text-sm text-gray-400 mb-4">
                    {getSubject(subject)?.label} · {getGradeLevel(gradeLevel)?.label}
                  </p>
                  {loadingLesson ? (
                    <PageLoader label="Preparing your lesson…" />
                  ) : (
                    <div className="animate-fade-in">
                      <Markdown content={lesson} />
                    </div>
                  )}
                </div>

                {!loadingLesson && (
                  <div className="flex flex-wrap gap-3 mt-5">
                    <button onClick={completeTopic} disabled={isDone}
                      className={`font-medium px-5 py-2 rounded-lg ${
                        isDone ? 'bg-green-100 text-green-700 cursor-default' : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}>
                      {isDone ? '✓ Completed' : 'Mark as complete'}
                    </button>
                    <Link to="/quiz" className="border border-primary-600 text-primary-700 hover:bg-primary-50 font-medium px-5 py-2 rounded-lg">
                      Practice with a quiz
                    </Link>
                    <Link to="/tutor" className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg">
                      Ask the tutor
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Learn;
