import { useRef, useState, useCallback, useEffect } from 'react';
import { SpeechRecognitionCtor, sttSupported } from '../utils/speech';

// Continuous, ChatGPT-style dictation.
//
// The old version used `continuous = false`, so the browser stopped listening
// the moment you paused — even if you were mid-sentence. This hook keeps the
// microphone open: it accumulates what you say across natural pauses and only
// stops when YOU stop it (tap the mic again, or press Send). Nothing is ever
// sent automatically — the transcript lands in the input box for you to edit.
export function useDictation({ lang = 'en-GB', onText } = {}) {
  const [listening, setListening] = useState(false);

  const recRef = useRef(null);
  const finalRef = useRef(''); // confirmed text, kept across auto-restarts
  const manualStopRef = useRef(false);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const emit = () => {
    onTextRef.current?.(finalRef.current.replace(/\s+/g, ' ').trim());
  };

  const stop = useCallback(() => {
    manualStopRef.current = true;
    setListening(false);
    try {
      recRef.current?.stop();
    } catch (_) {
      /* already stopped */
    }
  }, []);

  const start = useCallback(
    (seed = '') => {
      if (!sttSupported) return;
      // Seed with any text already typed so dictation appends to it.
      finalRef.current = seed ? `${seed.trim()} ` : '';
      manualStopRef.current = false;

      const rec = new SpeechRecognitionCtor();
      rec.lang = lang; // en-GB matches Malawian/East-African English better than en-US
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalRef.current += `${chunk} `;
          else interim += chunk;
        }
        onTextRef.current?.((finalRef.current + interim).replace(/\s+/g, ' ').trimStart());
      };

      rec.onerror = (event) => {
        // A blocked mic is fatal; brief silence/aborts are not — let onend retry.
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          manualStopRef.current = true;
          setListening(false);
        }
      };

      // Chrome fires `onend` after a pause even in continuous mode. If the user
      // hasn't stopped, restart so the mic stays open like a real dictation.
      rec.onend = () => {
        if (manualStopRef.current) {
          emit();
          return;
        }
        try {
          rec.start();
        } catch (_) {
          setListening(false);
        }
      };

      recRef.current = rec;
      setListening(true);
      try {
        rec.start();
      } catch (_) {
        setListening(false);
      }
    },
    [lang]
  );

  const toggle = useCallback(
    (seed = '') => {
      if (listening) stop();
      else start(seed);
    },
    [listening, start, stop]
  );

  // Make sure the mic is released if the component unmounts mid-session.
  useEffect(
    () => () => {
      manualStopRef.current = true;
      try {
        recRef.current?.stop();
      } catch (_) {
        /* ignore */
      }
    },
    []
  );

  return { supported: sttSupported, listening, start, stop, toggle };
}
