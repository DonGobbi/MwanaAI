import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { aiTutoring } from '../services/aiTutoring';
import { conversationService } from '../services/conversationService';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADE_LEVELS, getSubject, getGradeLevel } from '../config/curriculum';
import { fileToDownscaledDataUrl } from '../utils/image';
import { speak, cancelSpeech, ttsSupported } from '../utils/speech';
import { useDictation } from '../hooks/useDictation';
import Markdown from '../components/Markdown';
import EmptyState from '../components/EmptyState';
import { FiMessageSquare } from 'react-icons/fi';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your MwanaAI tutor. 👋\n\nChoose your **class** and **subject** above, then tell me what you're working on. You can:\n\n- Ask me to explain something you don't understand\n- Send a **photo of your homework** and I'll help\n- Tap the 🎤 to talk, or 🔊 to hear my answers\n\nWhat would you like to start with?",
};

const STARTERS = [
  'Explain a topic I am learning',
  'Help me with my homework',
  'Give me a practice question',
];

const QUICK_ACTIONS = [
  { label: 'Explain more simply', prompt: 'Please explain that again in a simpler way.' },
  { label: 'Another example', prompt: 'Can you show me another example?' },
  {
    label: 'Practice question',
    prompt:
      'Give me one practice question on this. Wait for my answer before telling me if it is correct.',
  },
  { label: 'Quiz me', prompt: 'Quiz me with 3 short questions on this topic, one at a time.' },
  { label: 'Study tips', prompt: 'Give me a few short study tips for this topic.' },
];

function deriveTitle(msgs) {
  const firstUser = msgs.find((m) => m.role === 'user' && (m.content || m.image || m.hasImage));
  if (!firstUser) return 'New chat';
  const t = (firstUser.content || '').trim();
  if (!t) return 'Homework help';
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

const AITutor = () => {
  const { currentUser, userProfile, updateGradeLevel } = useAuth();

  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [messages, setMessages] = useState([WELCOME]);
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [attaching, setAttaching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Voice
  const [speakingId, setSpeakingId] = useState(null);
  const [autoRead, setAutoRead] = useState(false);
  const dictation = useDictation({ onText: setInputValue });
  const { listening } = dictation;

  // History
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const conversationIdRef = useRef(null);
  const createdAtRef = useRef(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const pendingQuestionRef = useRef(null);
  const onboardingHandledRef = useRef(false);

  // Initialise the class from the student's saved profile / local cache.
  useEffect(() => {
    const saved =
      userProfile?.gradeLevel || localStorage.getItem('mwanaai_grade_level') || '';
    if (saved) setGradeLevel(saved);
  }, [userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Stop any speech when leaving the page.
  useEffect(() => () => cancelSpeech(), []);

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      setConversations(await conversationService.list(currentUser.uid));
    } catch (err) {
      console.error('Could not load conversations:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-save the current conversation (debounced) whenever it changes.
  useEffect(() => {
    if (!currentUser) return;
    if (!messages.some((m) => m.role === 'user')) return;
    const timer = setTimeout(async () => {
      try {
        const id = await conversationService.save(currentUser.uid, {
          id: conversationIdRef.current,
          title: deriveTitle(messages),
          subject,
          gradeLevel,
          messages,
          createdAt: createdAtRef.current || Date.now(),
        });
        if (!conversationIdRef.current) {
          conversationIdRef.current = id;
          createdAtRef.current = createdAtRef.current || Date.now();
        }
        loadConversations();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [messages, currentUser, subject, gradeLevel, loadConversations]);

  const handleGradeChange = (e) => {
    const value = e.target.value;
    setGradeLevel(value);
    if (value) updateGradeLevel(value);
  };

  const pushAssistant = (content, idPrefix = 'a') =>
    setMessages((prev) => [
      ...prev,
      { id: `${idPrefix}-${Date.now()}`, role: 'assistant', content },
    ]);

  const askTutor = async (rawText, image = null) => {
    const text = (rawText || '').trim();
    const question =
      text || (image ? 'Please help me understand this homework I uploaded.' : '');
    if (!question || isLoading) return;

    if (!gradeLevel || !subject) {
      pushAssistant('Please choose your class and subject above first, then ask me. 🙂', 'hint');
      return;
    }

    const history = messages
      .filter(
        (m) =>
          m.content &&
          (m.role === 'user' ||
            (m.role === 'assistant' && m.id !== 'welcome' && !String(m.id).startsWith('hint')))
      )
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: text, image },
    ]);
    setInputValue('');
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const reply = await aiTutoring.generateResponse({
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(gradeLevel)?.label || gradeLevel,
        ageHint: getGradeLevel(gradeLevel)?.approxAge,
        question,
        context: history,
        image,
      });
      const id = `a-${Date.now()}`;
      setMessages((prev) => [...prev, { id, role: 'assistant', content: reply }]);
      if (autoRead && reply) {
        setSpeakingId(id);
        speak(reply, { onend: () => setSpeakingId(null) });
      }
    } catch (error) {
      console.error('Tutor error:', error);
      pushAssistant(
        error?.code === 'PROMPT_BLOCKED'
          ? error.message
          : "Sorry, I couldn't answer that just now. Please check your internet connection and try again.",
        'e'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (listening) dictation.stop(); // stop the mic before sending
    askTutor(inputValue, attachedImage);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    try {
      setAttaching(true);
      const dataUrl = await fileToDownscaledDataUrl(file);
      setAttachedImage(dataUrl);
    } catch (err) {
      pushAssistant(err.message || 'Sorry, I could not read that image.', 'hint');
    } finally {
      setAttaching(false);
    }
  };

  // --- Voice ---
  const handleSpeak = (msg) => {
    if (speakingId === msg.id) {
      cancelSpeech();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(msg.id);
    speak(msg.content, { onend: () => setSpeakingId(null) });
  };

  const toggleListening = () => {
    // Keeps the mic open through pauses; tap again (or Send) to stop. The
    // transcript fills the box so the student can fix any mis-heard words first.
    dictation.toggle(inputValue);
    if (!listening) inputRef.current?.focus();
  };

  // --- History ---
  const newChat = () => {
    cancelSpeech();
    if (listening) dictation.stop();
    setSpeakingId(null);
    setMessages([WELCOME]);
    setInputValue('');
    setAttachedImage(null);
    conversationIdRef.current = null;
    createdAtRef.current = null;
    setShowHistory(false);
  };

  const loadConversation = (convo) => {
    cancelSpeech();
    setSpeakingId(null);
    const loaded = (convo.messages || []).map((m, i) => ({
      id: `m-${i}`,
      role: m.role,
      content: m.content,
      hasImage: m.hasImage,
    }));
    setMessages([WELCOME, ...loaded]);
    if (convo.subject) setSubject(convo.subject);
    if (convo.gradeLevel) setGradeLevel(convo.gradeLevel);
    conversationIdRef.current = convo.id;
    createdAtRef.current = convo.createdAt || null;
    setShowHistory(false);
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await conversationService.remove(id);
      if (conversationIdRef.current === id) newChat();
      loadConversations();
    } catch (err) {
      console.error('Could not delete conversation:', err);
    }
  };

  // Prefill class/subject and queue the first question coming from onboarding.
  useEffect(() => {
    const st = location.state;
    if (st && st.fromOnboarding && !onboardingHandledRef.current) {
      onboardingHandledRef.current = true;
      if (st.gradeLevel) setGradeLevel(st.gradeLevel);
      if (st.subject) setSubject(st.subject);
      if (st.question) pendingQuestionRef.current = st.question;
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Once class + subject are set, auto-send the queued onboarding question.
  useEffect(() => {
    if (pendingQuestionRef.current && gradeLevel && subject && !isLoading) {
      const q = pendingQuestionRef.current;
      pendingQuestionRef.current = null;
      askTutor(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeLevel, subject]);

  const ready = gradeLevel && subject;
  const hasConversation = messages.some(
    (m) => m.role === 'assistant' && m.id !== 'welcome' && !String(m.id).startsWith('hint')
  );
  const canSend = ready && !isLoading && (inputValue.trim() || attachedImage);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-6 max-w-4xl">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MwanaAI Tutor</h1>
            <p className="text-gray-600 text-sm">
              Ask anything, talk with the 🎤, send a photo of your homework, or listen with 🔊.
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button
              onClick={newChat}
              className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg"
            >
              + New chat
            </button>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg"
            >
              History{conversations.length ? ` (${conversations.length})` : ''}
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="card mb-4 max-h-64 overflow-y-auto">
            {conversations.length === 0 ? (
              <EmptyState
                compact
                icon={FiMessageSquare}
                title="No saved chats yet"
                description="Your conversations will appear here so you can pick up where you left off."
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {conversations.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => loadConversation(c)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                      <p className="text-xs text-gray-400">
                        {getSubject(c.subject)?.label || c.subject || 'General'} ·{' '}
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(e, c.id)}
                      className="text-gray-300 hover:text-red-500 text-xl leading-none px-2 flex-shrink-0"
                      aria-label="Delete chat"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Class + Subject pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
              Your class
            </label>
            <select
              id="grade"
              value={gradeLevel}
              onChange={handleGradeChange}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Select a subject</option>
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto-read toggle */}
        {ttsSupported && (
          <label className="flex items-center gap-2 mb-2 text-sm text-gray-600 select-none">
            <input
              type="checkbox"
              checked={autoRead}
              onChange={(e) => {
                setAutoRead(e.target.checked);
                if (!e.target.checked) {
                  cancelSpeech();
                  setSpeakingId(null);
                }
              }}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            🔊 Read answers aloud automatically
          </label>
        )}

        {/* Chat window */}
        <div className="card flex flex-col" style={{ height: '60vh' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Uploaded homework"
                      className="rounded-lg mb-2 max-h-48 w-auto"
                    />
                  )}
                  {message.role === 'assistant' ? (
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Markdown content={message.content} />
                      </div>
                      {ttsSupported && message.id !== 'welcome' && (
                        <button
                          onClick={() => handleSpeak(message)}
                          className="flex-shrink-0 text-gray-400 hover:text-primary-600 mt-0.5"
                          title={speakingId === message.id ? 'Stop' : 'Listen'}
                          aria-label="Listen to answer"
                        >
                          {speakingId === message.id ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <rect x="5" y="5" width="10" height="10" rx="1" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 5.343a1 1 0 011.414 0A7.97 7.97 0 0118 10a7.97 7.97 0 01-1.929 4.657 1 1 0 11-1.414-1.414A5.98 5.98 0 0016 10a5.98 5.98 0 00-1.343-3.243 1 1 0 010-1.414z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    (message.content || message.hasImage) && (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content || '📷 Photo'}
                      </p>
                    )
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions / quick actions */}
          {ready && !isLoading && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {(hasConversation
                ? QUICK_ACTIONS
                : STARTERS.map((s) => ({ label: s, prompt: s }))
              ).map((action) => (
                <button
                  key={action.label}
                  onClick={() => askTutor(action.prompt)}
                  className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1 rounded-full"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Attached image preview */}
          {(attachedImage || attaching) && (
            <div className="px-4 pb-2">
              {attaching ? (
                <span className="text-xs text-gray-500">Processing image…</span>
              ) : (
                <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg p-1 pr-2">
                  <img src={attachedImage} alt="Attachment preview" className="h-12 w-12 object-cover rounded" />
                  <span className="text-xs text-gray-600">Homework attached</span>
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input row */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || attaching}
              title="Upload a photo of your homework"
              className="flex-shrink-0 text-gray-500 hover:text-primary-600 disabled:opacity-50 p-2"
              aria-label="Upload homework photo"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {dictation.supported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                title={listening ? 'Stop listening' : 'Speak your question'}
                aria-label="Speak your question"
                className={`flex-shrink-0 p-2 rounded-full disabled:opacity-50 ${
                  listening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-500 hover:text-primary-600'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v4a4 4 0 01-4 4z" />
                </svg>
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                listening
                  ? 'Listening… keep talking, then tap 🎤 or Send'
                  : ready
                  ? 'Type your question…'
                  : 'Choose your class and subject first…'
              }
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg flex-shrink-0"
            >
              Send
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          MwanaAI can make mistakes. Always check important answers with your teacher or textbook.
        </p>
      </div>
    </div>
  );
};

export default AITutor;
