// Text-to-speech helpers for the tutor (uses the browser's free Web Speech API).

export const ttsSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window;

// Speech-to-text constructor (Chrome/Edge expose webkitSpeechRecognition).
export const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

export const sttSupported = !!SpeechRecognitionCtor;

// Strips Markdown so the spoken text sounds natural (no "asterisk asterisk").
export function stripMarkdown(text = '') {
  return text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Speak the given text aloud. Returns true if speech started.
export function speak(text, { onend, onstart, lang = 'en-US', rate = 0.95 } = {}) {
  if (!ttsSupported) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
  utterance.lang = lang;
  utterance.rate = rate;
  if (onstart) utterance.onstart = onstart;
  if (onend) {
    utterance.onend = onend;
    utterance.onerror = onend;
  }
  window.speechSynthesis.speak(utterance);
  return true;
}

export function cancelSpeech() {
  if (ttsSupported) window.speechSynthesis.cancel();
}
