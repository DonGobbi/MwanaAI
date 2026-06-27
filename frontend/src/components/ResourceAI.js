import React, { useState } from 'react';
import { resourceAI } from '../services/resourceAI';
import Markdown from './Markdown';
import Spinner from './Spinner';
import { FiZap } from 'react-icons/fi';

// Summarize, or ask a question grounded in, one shared resource.
// Reused by the student Resources page and the teacher class-resources list.
const ResourceAI = ({ resource, level }) => {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [error, setError] = useState('');

  const hasText = (resource.text || '').trim().length > 20;
  if (!hasText) {
    return (
      <p className="text-xs text-gray-400 mt-2">
        AI tools aren't available for this resource (no readable text).
      </p>
    );
  }

  const doSummary = async () => {
    setError('');
    setLoadingSummary(true);
    setSummary('');
    try {
      setSummary(await resourceAI.summarize({ title: resource.title, text: resource.text, level }));
    } catch (e) {
      setError(e.message || 'Could not summarize.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const doAsk = async (e) => {
    e?.preventDefault();
    if (!question.trim()) return;
    setError('');
    setLoadingAnswer(true);
    setAnswer('');
    try {
      setAnswer(await resourceAI.ask({ title: resource.title, text: resource.text, question, level }));
    } catch (e2) {
      setError(e2.message || 'Could not answer that.');
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-primary-100 bg-primary-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <FiZap className="text-primary-600" />
        <span className="text-sm font-semibold text-gray-800">Ask MwanaAI about this</span>
      </div>

      <button onClick={doSummary} disabled={loadingSummary}
        className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors mb-2">
        {loadingSummary ? <Spinner className="w-4 h-4" label="Summarizing…" /> : summary ? 'Re-summarize' : '✨ Summarize'}
      </button>

      {summary && (
        <div className="mb-3 bg-white rounded-lg p-3 border border-gray-100 animate-fade-in">
          <Markdown content={summary} />
        </div>
      )}

      <form onSubmit={doAsk} className="flex gap-2">
        <input value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this resource…"
          className="flex-1 min-w-0 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
        <button type="submit" disabled={loadingAnswer || !question.trim()}
          className="bg-secondary-600 hover:bg-secondary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg flex-shrink-0 transition-colors">
          {loadingAnswer ? <Spinner className="w-4 h-4" /> : 'Ask'}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {answer && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-gray-100 animate-fade-in">
          <Markdown content={answer} />
        </div>
      )}
    </div>
  );
};

export default ResourceAI;
