// Prompt Guard — input safety screening for MwanaAI
//
// Uses Meta's Llama Prompt Guard 2 (86M) via Groq to detect prompt-injection
// and jailbreak attempts in student-supplied text BEFORE it reaches the tutor
// model. Prompt Guard is a CLASSIFIER, not a chat model — it does not generate
// answers; it only labels the input as benign or an attack.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PROMPT_GUARD_MODEL = 'meta-llama/llama-prompt-guard-2-86m';

// Prompt Guard reports a probability that the input is an attack
// (0 = benign, 1 = attack). Inputs at or above this threshold are blocked.
const ATTACK_THRESHOLD = 0.5;

/**
 * Interprets Prompt Guard's raw output into a structured verdict.
 *
 * Groq returns the verdict in choices[0].message.content, but the exact form
 * isn't documented — it may be a probability ("0.998") or a label ("LABEL_1",
 * "jailbreak", "benign"). We parse both defensively; anything we can't
 * interpret is treated as benign so a parsing quirk never blocks a legitimate
 * student. Exported for testing.
 *
 * @param {string} raw
 * @returns {{safe: boolean, score: number|null, label: string, raw: string}}
 */
export function interpretVerdict(raw) {
  const value = (raw ?? '').toString().trim();

  // Case 1: a bare numeric probability of attack.
  if (value !== '' && /^[\d.eE+-]+$/.test(value)) {
    const numeric = Number.parseFloat(value);
    if (!Number.isNaN(numeric)) {
      const safe = numeric < ATTACK_THRESHOLD;
      return { safe, score: numeric, label: safe ? 'benign' : 'attack', raw: value };
    }
  }

  // Case 2: a text label.
  const attack = /(inject|jailbreak|malicious|unsafe|label[_ ]?1|\battack\b)/i.test(
    value
  );
  return { safe: !attack, score: null, label: attack ? 'attack' : 'benign', raw: value };
}

/**
 * Screens a piece of user-supplied text for prompt-injection / jailbreak
 * attempts.
 *
 * Fails OPEN: if there is no API key or the request errors, the input is
 * allowed — the guard must never take the tutor offline by itself.
 *
 * @param {string} text
 * @returns {Promise<{safe: boolean, score: number|null, label: string, raw: string}>}
 */
export async function screenInput(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { safe: true, score: 0, label: 'benign', raw: '' };
  }

  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  if (!apiKey) {
    console.warn('[PromptGuard] No API key set — skipping input screening.');
    return { safe: true, score: null, label: 'unscreened', raw: '' };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PROMPT_GUARD_MODEL,
        messages: [{ role: 'user', content: trimmed }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Prompt Guard request failed (${response.status})`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const verdict = interpretVerdict(raw);
    if (!verdict.safe) {
      console.warn('[PromptGuard] Flagged input as a prompt attack:', verdict);
    }
    return verdict;
  } catch (error) {
    console.error('[PromptGuard] Screening error — failing open:', error);
    return { safe: true, score: null, label: 'error', raw: '' };
  }
}

const promptGuard = { screenInput, interpretVerdict };
export default promptGuard;
