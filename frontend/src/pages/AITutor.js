import React, { useState, useRef, useEffect } from 'react';
import { aiTutoring } from '../services/aiTutoring';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADE_LEVELS, getSubject, getGradeLevel } from '../config/curriculum';
import { fileToDownscaledDataUrl } from '../utils/image';
import Markdown from '../components/Markdown';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your MwanaAI tutor. 👋\n\nChoose your **class** and **subject** above, then tell me what you're working on. You can:\n\n- Ask me to explain something you don't understand\n- Send a **photo of your homework** and I'll help\n- Ask for a **practice question** or a quick quiz\n\nWhat would you like to start with?",
};

// Suggestions shown before the conversation starts.
const STARTERS = [
  'Explain a topic I am learning',
  'Help me with my homework',
  'Give me a practice question',
];

// Tutor-like quick actions shown once we're chatting.
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

const AITutor = () => {
  const { userProfile, updateGradeLevel } = useAuth();

  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [messages, setMessages] = useState([WELCOME]);
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [attaching, setAttaching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialise the class from the student's saved profile / local cache.
  useEffect(() => {
    const saved =
      userProfile?.gradeLevel || localStorage.getItem('mwanaai_grade_level') || '';
    if (saved) setGradeLevel(saved);
  }, [userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

    // Text history sent to the model (exclude welcome/hint bubbles & empties).
    const history = messages
      .filter(
        (m) =>
          m.content &&
          (m.role === 'user' ||
            (m.role === 'assistant' && m.id !== 'welcome' && !m.id.startsWith('hint')))
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
      pushAssistant(reply);
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
    askTutor(inputValue, attachedImage);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ''; // allow re-selecting the same file
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

  const ready = gradeLevel && subject;
  const hasConversation = messages.some(
    (m) => m.role === 'assistant' && m.id !== 'welcome' && !m.id.startsWith('hint')
  );
  const canSend = ready && !isLoading && (inputValue.trim() || attachedImage);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-6 max-w-3xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">MwanaAI Tutor</h1>
          <p className="text-gray-600 text-sm">
            Your personal AI tutor — ask anything, or send a photo of your homework.
          </p>
        </div>

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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Select a subject</option>
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat window */}
        <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '62vh' }}>
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
                    <Markdown content={message.content} />
                  ) : (
                    message.content && (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
              {(hasConversation ? QUICK_ACTIONS.map((a) => a) : STARTERS.map((s) => ({ label: s, prompt: s }))).map(
                (action) => (
                  <button
                    key={action.label}
                    onClick={() => askTutor(action.prompt)}
                    className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1 rounded-full"
                  >
                    {action.label}
                  </button>
                )
              )}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
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
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={ready ? 'Type your question…' : 'Choose your class and subject first…'}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-md flex-shrink-0"
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
