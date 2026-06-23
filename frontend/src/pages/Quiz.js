import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizService } from '../services/quizService';
import { aiInsights } from '../services/aiInsightsService';
import Markdown from '../components/Markdown';
import Spinner from '../components/Spinner';
import {
  SUBJECTS,
  GRADE_LEVELS,
  EXAM_TYPES,
  getSubject,
  getGradeLevel,
} from '../config/curriculum';

const COUNTS = [5, 10];
const DIFFICULTIES = [
  { value: 'adaptive', label: 'Adaptive (recommended)' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const Quiz = () => {
  const { currentUser, userProfile, updateGradeLevel } = useAuth();
  const location = useLocation();

  const [phase, setPhase] = useState('setup'); // setup | loading | taking | done
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [examType, setExamType] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('adaptive');
  const [chosenDifficulty, setChosenDifficulty] = useState('');
  const [error, setError] = useState('');

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);

  const [feedback, setFeedback] = useState('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const assignmentRef = useRef(null);
  const pendingStartRef = useRef(false);

  useEffect(() => {
    const saved = userProfile?.gradeLevel || localStorage.getItem('mwanaai_grade_level') || '';
    if (saved) setGradeLevel(saved);
  }, [userProfile]);

  // Launch from a teacher assignment.
  useEffect(() => {
    const a = location.state?.assignment;
    if (a && !assignmentRef.current) {
      assignmentRef.current = a;
      setSubject(a.subject);
      if (a.examType) setExamType(a.examType);
      if (a.count) setCount(a.count);
      pendingStartRef.current = true;
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleGradeChange = (e) => {
    const value = e.target.value;
    setGradeLevel(value);
    if (value) updateGradeLevel(value);
  };

  const startQuiz = async () => {
    setError('');
    if (!gradeLevel || !subject) {
      setError('Please choose your class and subject.');
      return;
    }
    setPhase('loading');
    try {
      // Resolve adaptive difficulty from the student's past scores in this subject.
      let diff = difficulty;
      if (diff === 'adaptive') {
        diff = 'medium';
        try {
          const past = await quizService.listResults(currentUser.uid);
          const subjLabel = getSubject(subject)?.label || subject;
          const subj = past.filter((r) => (r.subjectLabel || r.subject) === subjLabel);
          if (subj.length) {
            const a = subj.reduce((s, r) => s + (r.percentage || 0), 0) / subj.length;
            diff = a >= 75 ? 'hard' : a < 50 ? 'easy' : 'medium';
          }
        } catch (e) {
          /* default to medium */
        }
      }
      setChosenDifficulty(diff);

      const qs = await quizService.generate({
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(gradeLevel)?.label || gradeLevel,
        ageHint: getGradeLevel(gradeLevel)?.approxAge,
        examType,
        count,
        difficulty: diff,
        topic: assignmentRef.current?.topic || undefined,
      });
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setCurrent(0);
      setFeedback('');
      setPhase('taking');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setPhase('setup');
    }
  };

  // Auto-start when launched from an assignment and class/subject are ready.
  useEffect(() => {
    if (pendingStartRef.current && subject && gradeLevel && phase === 'setup') {
      pendingStartRef.current = false;
      startQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, gradeLevel]);

  const selectOption = (optionIndex) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optionIndex;
      return next;
    });
  };

  const score = answers.reduce(
    (acc, ans, i) => acc + (ans === questions[i]?.correctIndex ? 1 : 0),
    0
  );

  const finishQuiz = async () => {
    setPhase('done');
    const total = questions.length;
    const finalScore = answers.reduce(
      (acc, ans, i) => acc + (ans === questions[i]?.correctIndex ? 1 : 0),
      0
    );
    if (currentUser) {
      try {
        await quizService.saveResult(currentUser.uid, {
          subject,
          subjectLabel: getSubject(subject)?.label || subject,
          gradeLevel,
          levelLabel: getGradeLevel(gradeLevel)?.label || gradeLevel,
          examType: examType || 'General',
          difficulty: chosenDifficulty,
          score: finalScore,
          total,
          percentage: Math.round((finalScore / total) * 100),
          ...(assignmentRef.current
            ? { assignmentId: assignmentRef.current.id, classId: assignmentRef.current.classId }
            : {}),
        });
      } catch (err) {
        console.error('Could not save quiz result:', err);
      }
    }
  };

  const getFeedback = async () => {
    setLoadingFeedback(true);
    setFeedback('');
    try {
      const wrong = questions
        .map((q, i) => ({ q, i }))
        .filter(({ q, i }) => answers[i] !== q.correctIndex)
        .map(({ q, i }) => ({
          question: q.question,
          your: answers[i] != null ? q.options[answers[i]] : '(no answer)',
          correct: q.options[q.correctIndex],
        }));
      const fb = await aiInsights.quizFeedback({
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(gradeLevel)?.label || gradeLevel,
        score,
        total: questions.length,
        wrong,
      });
      setFeedback(fb);
    } catch (err) {
      setFeedback(`*${err.message || 'Could not get feedback.'}*`);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Automatically generate feedback as soon as the quiz is finished.
  useEffect(() => {
    if (phase === 'done' && !feedback && !loadingFeedback && questions.length) {
      getFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const resetQuiz = () => {
    assignmentRef.current = null;
    setPhase('setup');
    setQuestions([]);
    setAnswers([]);
    setCurrent(0);
    setError('');
    setFeedback('');
    setChosenDifficulty('');
  };

  // ---- Setup ----
  if (phase === 'setup' || phase === 'loading') {
    const loading = phase === 'loading';
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-8 max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Practice & Exam Quiz</h1>
          <p className="text-gray-600 text-sm mb-6">
            Generate a quiz for your class and subject. Adaptive mode tunes the difficulty to your past scores.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <div className="card p-6 space-y-4">
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Your class</label>
              <select id="grade" value={gradeLevel} onChange={handleGradeChange} disabled={loading}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
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
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={loading}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                <option value="">Select a subject</option>
                {SUBJECTS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="exam" className="block text-sm font-medium text-gray-700 mb-1">Exam style</label>
                <select id="exam" value={examType} onChange={(e) => setExamType(e.target.value)} disabled={loading}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  {EXAM_TYPES.map((x) => (<option key={x.value} value={x.value}>{x.label}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor="diff" className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select id="diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={loading}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  {DIFFICULTIES.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of questions</label>
              <div className="flex gap-2">
                {COUNTS.map((c) => (
                  <button key={c} type="button" onClick={() => setCount(c)} disabled={loading}
                    className={`px-4 py-2 rounded-lg border text-sm ${count === c ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startQuiz} disabled={loading}
              className="w-full flex items-center justify-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors">
              {loading ? <Spinner className="w-5 h-5" label="Generating your quiz…" /> : 'Start quiz'}
            </button>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-3">How it works</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><span className="font-medium text-gray-800">🎯 Adaptive mode</span> — the difficulty tunes itself to your past scores.</li>
                <li><span className="font-medium text-gray-800">📝 Exam styles</span> — practise in PSLCE, JCE or MSCE format.</li>
                <li><span className="font-medium text-gray-800">✨ AI feedback</span> — after each quiz, see exactly what to review.</li>
                <li><span className="font-medium text-gray-800">🔥 Build a streak</span> — quiz daily to earn badges and climb the leaderboard.</li>
              </ul>
              <Link to="/progress" className="inline-block mt-4 text-sm text-primary-600 hover:underline">View your progress →</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Taking ----
  if (phase === 'taking') {
    const q = questions[current];
    const selected = answers[current];
    const isLast = current === questions.length - 1;
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-8 max-w-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-500">Question {current + 1} of {questions.length}</span>
            <span className="text-sm text-gray-400">
              {getSubject(subject)?.label} · {getGradeLevel(gradeLevel)?.label}
              {chosenDifficulty ? ` · ${chosenDifficulty}` : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
            <div className="bg-primary-600 h-1.5 rounded-full transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>

          <div key={current} className="card p-6 animate-slide-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{q.question}</h2>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => selectOption(i)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    selected === i ? 'bg-primary-50 border-primary-500 text-primary-800'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                  <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
                className="text-sm text-gray-500 disabled:opacity-40 hover:text-gray-700">← Back</button>
              {isLast ? (
                <button onClick={finishQuiz} disabled={selected === null}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg">Finish</button>
              ) : (
                <button onClick={() => setCurrent((c) => c + 1)} disabled={selected === null}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg">Next →</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Done / results ----
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  const message =
    percentage >= 80 ? 'Excellent work! 🎉'
    : percentage >= 50 ? 'Good effort — keep practising! 💪'
    : "Don't worry — review these and try again. You'll improve! 🌱";

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-3xl">
        <div className="card p-6 text-center mb-6 animate-fade-in-up">
          {assignmentRef.current && (
            <p className="text-xs text-primary-600 font-medium mb-1">Assignment completed ✓</p>
          )}
          <p className="text-gray-500 text-sm">Your score</p>
          <p className="text-4xl font-bold text-primary-600 my-1 animate-pop">{score}/{total}</p>
          <p className="text-lg font-semibold text-gray-800">{percentage}%</p>
          <p className="text-gray-600 mt-2">{message}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <button onClick={resetQuiz} className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2 rounded-lg">
              Take another quiz
            </button>
            <Link to="/tutor" className="border border-primary-600 text-primary-700 hover:bg-primary-50 font-medium px-5 py-2 rounded-lg">
              Ask the tutor for help
            </Link>
          </div>
        </div>

        {/* AI feedback */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-gray-900">✨ AI feedback</h2>
            <button onClick={getFeedback} disabled={loadingFeedback}
              className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {loadingFeedback ? <Spinner className="w-4 h-4" label="Thinking…" /> : feedback ? 'Refresh' : 'What should I review?'}
            </button>
          </div>
          {feedback ? (
            <div className="mt-4 border-t border-gray-100 pt-4 animate-fade-in">
              <Markdown content={feedback} />
            </div>
          ) : loadingFeedback ? (
            <p className="text-sm text-gray-500 mt-2">Analysing your answers…</p>
          ) : (
            <p className="text-sm text-gray-500 mt-2">
              Get a personalised note on exactly which topics to review based on what you missed.
            </p>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-3">Review</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {questions.map((q, i) => {
            const chosen = answers[i];
            const correct = q.correctIndex;
            return (
              <div key={i} className="card p-4 animate-fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                <p className="font-medium text-gray-900 mb-2">{i + 1}. {q.question}</p>
                <div className="space-y-1.5 mb-2">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === correct;
                    const isChosen = oi === chosen;
                    return (
                      <div key={oi}
                        className={`text-sm px-3 py-1.5 rounded-lg border ${
                          isCorrect ? 'bg-green-50 border-green-300 text-green-800'
                          : isChosen ? 'bg-red-50 border-red-300 text-red-800'
                          : 'border-gray-100 text-gray-600'
                        }`}>
                        <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                        {opt}
                        {isCorrect && <span className="ml-2 text-green-600">✓ correct</span>}
                        {isChosen && !isCorrect && <span className="ml-2 text-red-600">your answer</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500"><span className="font-medium">Why:</span> {q.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
