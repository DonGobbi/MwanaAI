// Turns a class's quiz results into what a teacher needs at a glance: which
// topics to re-teach, which students need help, and the concepts most missed
// across the class — all from real assignment results, no AI call needed. The
// same summary also feeds the AI narrative so both agree.

const WEAK_TOPIC_BELOW = 60; // a topic/student average below this needs attention
const FAIL_BELOW = 50; // a single score below this counts as a fail

const topicOfResult = (r, topicOf) => topicOf[r.assignmentId] || r.topic || 'General';

export function analyzeClass({ results = [], topicOf = {}, nameById = {} }) {
  const hasData = results.length > 0;
  const classAvg = hasData
    ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / results.length)
    : null;

  // By topic (weakest first).
  const byTopic = {};
  results.forEach((r) => {
    const topic = topicOfResult(r, topicOf);
    const t = byTopic[topic] || (byTopic[topic] = { attempts: 0, sum: 0, students: new Set(), fails: 0 });
    t.attempts += 1;
    t.sum += r.percentage || 0;
    t.students.add(r.userId);
    if ((r.percentage || 0) < FAIL_BELOW) t.fails += 1;
  });
  const topicStats = Object.entries(byTopic)
    .map(([topic, v]) => ({
      topic,
      avg: Math.round(v.sum / v.attempts),
      attempts: v.attempts,
      students: v.students.size,
      fails: v.fails,
    }))
    .sort((a, b) => a.avg - b.avg);
  const strugglingTopics = topicStats.filter((t) => t.avg < WEAK_TOPIC_BELOW);

  // Per student: overall average + their weak topics in this class.
  const byStudent = {};
  results.forEach((r) => {
    const topic = topicOfResult(r, topicOf);
    const s = byStudent[r.userId] || (byStudent[r.userId] = { sum: 0, n: 0, topics: {} });
    s.sum += r.percentage || 0;
    s.n += 1;
    const tt = s.topics[topic] || (s.topics[topic] = { sum: 0, n: 0 });
    tt.sum += r.percentage || 0;
    tt.n += 1;
  });
  const students = Object.entries(byStudent).map(([id, v]) => ({
    id,
    name: nameById[id] || 'A student',
    avg: Math.round(v.sum / v.n),
    quizzes: v.n,
    weakTopics: Object.entries(v.topics)
      .map(([topic, x]) => ({ topic, avg: Math.round(x.sum / x.n) }))
      .filter((x) => x.avg < WEAK_TOPIC_BELOW)
      .sort((a, b) => a.avg - b.avg),
  }));
  const studentsNeedingHelp = students
    .filter((s) => s.avg < WEAK_TOPIC_BELOW || s.weakTopics.length)
    .sort((a, b) => a.avg - b.avg);
  // Shape the AI narrative expects.
  const studentWeak = studentsNeedingHelp.map((s) => ({ name: s.name, weak: s.weakTopics }));

  // Concepts most missed across the whole class.
  const conceptCount = {};
  results.forEach((r) => {
    if (!Array.isArray(r.missed)) return;
    r.missed.forEach((m) => {
      const q = (m && m.q ? String(m.q) : '').trim();
      if (q) conceptCount[q] = (conceptCount[q] || 0) + 1;
    });
  });
  const missedConcepts = Object.entries(conceptCount)
    .map(([q, n]) => ({ q, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);

  return {
    hasData,
    classAvg,
    topicStats,
    strugglingTopics,
    students,
    studentsNeedingHelp,
    studentWeak,
    missedConcepts,
  };
}
