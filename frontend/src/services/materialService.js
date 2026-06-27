// Generates teaching content GROUNDED in the teacher's own materials —
// the syllabus, textbook pages, notes or screenshots they upload — instead of
// generating generic content out of the blue.
//
// If any images/screenshots are attached we use the vision model so it can
// actually read the pages; otherwise the fast text model is enough.
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

// Keep the combined source text within a sane size for the model's rate limit.
const MAX_TEXT_CHARS = 12000;

export const OUTPUT_TYPES = [
  {
    value: 'lesson',
    label: 'Lesson plan',
    instruction:
      'Write a complete, ready-to-teach lesson plan based ONLY on the material provided. Use these Markdown headings: **Topic**, **Learning Objectives**, **Introduction** (a hook), **Key Concepts** (explained simply, drawn from the material, with a worked example), **Class Activity**, **Assessment** (3 questions with answers) and **Homework**.',
  },
  {
    value: 'quiz',
    label: 'Quiz (with answers)',
    instruction:
      'Create a quiz based ONLY on the material provided. Write {count} multiple-choice questions, each with four options labelled A–D. After all the questions, add an **Answer Key** section with the correct letter and a one-line explanation for each. Use clear Markdown.',
  },
  {
    value: 'notes',
    label: 'Revision notes',
    instruction:
      'Summarise the material into clear, student-friendly revision notes in Markdown. Use a short **Summary**, then **Key Points** as bullets, **Important Definitions**, and **Remember** (a few exam tips). Keep it faithful to the material.',
  },
  {
    value: 'questions',
    label: 'Exam questions',
    instruction:
      'Generate {count} exam-style questions based ONLY on the material provided, ranging from easy to hard. Include a mix of short-answer and structured questions. After the questions, add a **Marking Guide** with model answers. Use clear Markdown.',
  },
];

function buildSystemPrompt({ subject, level }) {
  return `You are MwanaAI, an expert teacher and curriculum planner for schools in Malawi.
You create accurate, practical teaching content for ${subject || 'the subject'} at ${level || 'school'} level.
RULE: When the teacher provides material, base everything strictly on it and do not invent facts beyond it. When no material is provided, use accurate, standard ${subject || 'subject'} knowledge appropriate for ${level || 'this level'} and the Malawian curriculum. Use Malawian examples where they help. Write clean, well-structured Markdown.`;
}

async function callGroq(model, messages, maxTokens) {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');
  return content;
}

export const materialService = {
  // materials: [{ kind, name, text, image }]
  async generate({ outputType = 'lesson', instructions = '', subject, level, count = 5, materials = [] }) {
    if (!API_KEY) throw new Error('No AI key is configured.');

    const spec = OUTPUT_TYPES.find((o) => o.value === outputType) || OUTPUT_TYPES[0];
    const task = spec.instruction.replace('{count}', String(count));

    // Gather text sources and images from the uploaded materials.
    const textParts = [];
    const images = [];
    materials.forEach((m) => {
      if (m.image) images.push({ name: m.name, image: m.image });
      if (m.text) textParts.push(`--- From "${m.name}" ---\n${m.text}`);
    });

    let sourceText = textParts.join('\n\n');
    let truncated = false;
    if (sourceText.length > MAX_TEXT_CHARS) {
      sourceText = sourceText.slice(0, MAX_TEXT_CHARS);
      truncated = true;
    }

    const hasMaterial = !!sourceText || images.length > 0;
    if (!hasMaterial && !instructions.trim()) {
      throw new Error('Add material, or say what topic to cover.');
    }

    const instructionLine = instructions.trim()
      ? `\n\nThe teacher said: "${instructions.trim()}"`
      : '';
    const truncatedNote = truncated
      ? '\n\n(Note: the material was long and has been shortened — focus on what is given.)'
      : '';

    // With material → ground strictly in it. Without material → generate from
    // the subject + level curriculum (the class already pins those).
    const promptText = hasMaterial
      ? `${task}${instructionLine}\n\n` +
        (images.length
          ? `The teacher has attached ${images.length} image(s) of the material${sourceText ? ' plus the text below' : ''}.`
          : '') +
        (sourceText ? `\n\nMATERIAL:\n${sourceText}` : '') +
        truncatedNote
      : `${task}${instructionLine}\n\nThere is no uploaded material — create this for ${subject || 'the subject'} at ${level || 'school'} level, accurate and aligned to the Malawian curriculum.`;

    const system = { role: 'system', content: buildSystemPrompt({ subject, level }) };
    const maxTokens = outputType === 'lesson' ? 2200 : 2600;

    // With images → vision model (the only one that can actually read pages).
    if (images.length) {
      const userContent = [
        { type: 'text', text: promptText },
        ...images.map((im) => ({ type: 'image_url', image_url: { url: im.image } })),
      ];
      try {
        return await callGroq(VISION_MODEL, [system, { role: 'user', content: userContent }], maxTokens);
      } catch (err) {
        throw new Error(
          err.status === 429
            ? 'The AI is busy right now. Please wait a few seconds and try again.'
            : 'Could not read those images. Try fewer or clearer photos, or paste the text instead.'
        );
      }
    }

    // Text only → strong model first, fast model as a rate-limit fallback.
    let lastError;
    for (const model of TEXT_MODELS) {
      try {
        return await callGroq(model, [system, { role: 'user', content: promptText }], maxTokens);
      } catch (err) {
        lastError = err;
        if (err.status && err.status !== 429) break;
      }
    }
    throw new Error(
      lastError?.status === 429
        ? 'The AI is busy right now. Please wait a few seconds and try again.'
        : 'Could not generate that. Please try again.'
    );
  },
};
