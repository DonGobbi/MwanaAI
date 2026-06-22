const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;
// Strong model first, fast model as a rate-limit fallback.
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

// Shared Groq chat helper with automatic model fallback on rate limits.
export async function groqChat(messages, { json = false, maxTokens = 1600, temperature = 0.6 } = {}) {
  if (!API_KEY) throw new Error('No AI key is configured.');
  let lastError = '';
  for (const model of MODELS) {
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } else {
        lastError = `${model}: HTTP ${res.status}`;
        console.warn('[groq]', lastError);
      }
    } catch (err) {
      lastError = `${model}: ${err.message}`;
      console.warn('[groq]', lastError);
    }
  }
  throw new Error(
    lastError.includes('429')
      ? 'The AI is busy right now. Please wait a few seconds and try again.'
      : 'Something went wrong. Please try again.'
  );
}
