import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../hooks/useCourses';
import { lessonService } from '../services/lessonService';
import { getSubject } from '../config/curriculum';
import Markdown from '../components/Markdown';
import { PageLoader } from '../components/Spinner';

const Learn = () => {
  const { currentUser } = useAuth();
  const { levelLabel, ageHint, subjects } = useCourses();
  const location = useLocation();

  const [subject, setSubject] = useState(''); // selected subject value
  const [topics, setTopics] = useState([]);
  const [completed, setCompleted] = useState(new Set());
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState('');

  const [activeTopic, setActiveTopic] = useState(null);
  const [lesson, setLesson] = useState('');
  const [loadingLesson, setLoadingLesson] = useState(false);

  const subjectLabel = getSubject(subject)?.label || subject;

  const refreshCompleted = useCallback(
    async (subjVal) => {
      if (!currentUser || !subjVal || !levelLabel) return;
      try {
        const set = await lessonService.getCompleted(currentUser.uid, getSubject(subjVal)?.label || subjVal, levelLabel);
        setCompleted(set);
      } catch (err) {
        console.error('Could not load completed topics:', err);
      }
    },
    [currentUser, levelLabel]
  );

  const selectSubject = useCallback(
    async (subjVal) => {
      setSubject(subjVal);
      setActiveTopic(null);
      setTopics([]);
      setError('');
      setLoadingTopics(true);
      try {
        const list = await lessonService.getTopics({
          subject: getSubject(subjVal)?.label || subjVal,
          level: levelLabel,
          ageHint,
        });
        setTopics(list);
        refreshCompleted(subjVal);
      } catch (err) {
        setError(err.message || 'Could not load topics.');
      } finally {
        setLoadingTopics(false);
      }
    },
    [levelLabel, ageHint, refreshCompleted]
  );

  // Auto-open a course on load — the one from ?subject= if given, else the
  // first. No picking required.
  useEffect(() => {
    if (subject || !subjects.length) return;
    const wanted = new URLSearchParams(location.search).get('subject');
    const initial = subjects.find((s) => s.value === wanted)?.value || subjects[0].value;
    selectSubject(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects.length]);

  const openLesson = async (topic) => {
    setActiveTopic(topic);
    setLesson('');
    setLoadingLesson(true);
    try {
      const content = await lessonService.getLesson({
        subject: subjectLabel,
        level: levelLabel,
        ageHint,
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
        subject: subjectLabel,
        level: levelLabel,
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
        <p className="text-gray-600 text-sm mb-6">Your {levelLabel} courses — learn each topic step by step.</p>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left rail: my courses + topics */}
          <div className="lg:col-span-1 lg:sticky lg:top-20">
            <div className="card p-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">My courses</h2>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <button key={s.value} onClick={() => selectSubject(s.value)}
                    className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                      subject === s.value ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700">{subjectLabel || 'Topics'}</h2>
                {topics.length > 0 && <span className="text-xs text-gray-500">{progressPct}% done</span>}
              </div>
              {topics.length > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              )}
              {loadingTopics ? (
                <p className="text-sm text-gray-400 py-2">Loading topics…</p>
              ) : (
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
              )}
            </div>
          </div>

          {/* Right pane: lesson */}
          <div className="lg:col-span-2">
            {!activeTopic ? (
              <div className="card p-10 text-center text-gray-500">
                <p className="text-4xl mb-3">📖</p>
                <p className="font-medium text-gray-700">
                  {loadingTopics ? 'Loading your course…' : 'Pick a topic on the left to start learning.'}
                </p>
              </div>
            ) : (
              <>
                <div className="card p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{activeTopic.title}</h1>
                  <p className="text-sm text-gray-400 mb-4">{subjectLabel} · {levelLabel}</p>
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
                    <Link to={`/quiz?subject=${subject}`} className="border border-primary-600 text-primary-700 hover:bg-primary-50 font-medium px-5 py-2 rounded-lg">
                      Practice with a quiz
                    </Link>
                    <Link to={`/tutor?subject=${subject}`} className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-5 py-2 rounded-lg">
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
