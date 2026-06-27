// Turns a student's raw quiz history into a clear picture of where they stand
// and what to revise next — entirely from real results, no guessing. The output
// feeds the dashboard "Revise next" card and the AI study plan, so both speak
// about the same, grounded weak spots.

const TREND_DELTA = 8; // percentage points that count as a real change
const WEAK_BELOW = 60; // a subject below this average needs attention
const STRONG_AT = 80; // mastery threshold

const subjectKey = (r) => r.subject || r.subjectLabel || 'other';

export function analyzeResults(results = []) {
  const sorted = [...results].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // oldest first
  const totalQuizzes = results.length;
  const overallAvg = totalQuizzes
    ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / totalQuizzes)
    : 0;

  // Group scores by subject (in time order).
  const groups = {};
  for (const r of sorted) {
    const key = subjectKey(r);
    if (!groups[key]) {
      groups[key] = { subject: r.subject || key, label: r.subjectLabel || r.subject || 'Other', scores: [], lastAt: 0 };
    }
    groups[key].scores.push(r.percentage || 0);
    groups[key].lastAt = Math.max(groups[key].lastAt, r.createdAt || 0);
  }

  const bySubject = Object.values(groups)
    .map((g) => {
      const n = g.scores.length;
      const avg = Math.round(g.scores.reduce((a, x) => a + x, 0) / n);
      let trend = 'flat';
      let recentAvg = avg;
      // Only call a trend once there's enough history to compare halves.
      if (n >= 4) {
        const half = Math.floor(n / 2);
        const older = g.scores.slice(0, n - half);
        const newer = g.scores.slice(n - half);
        const om = older.reduce((a, x) => a + x, 0) / older.length;
        const nm = newer.reduce((a, x) => a + x, 0) / newer.length;
        recentAvg = Math.round(nm);
        if (nm - om >= TREND_DELTA) trend = 'up';
        else if (om - nm >= TREND_DELTA) trend = 'down';
      }
      return { subject: g.subject, label: g.label, avg, count: n, recentAvg, trend, lastAt: g.lastAt };
    })
    .sort((a, b) => a.avg - b.avg); // weakest first

  // Specific concepts the student recently got wrong (from quizzes that stored
  // them). These let the AI plan name exact gaps, not just "study Biology".
  const recentMissed = [];
  for (let i = sorted.length - 1; i >= 0 && recentMissed.length < 12; i--) {
    const r = sorted[i];
    if (!Array.isArray(r.missed)) continue;
    for (const m of r.missed) {
      if (recentMissed.length >= 12) break;
      if (m && m.q) recentMissed.push({ subject: r.subjectLabel || r.subject || 'Other', q: m.q, a: m.a || '' });
    }
  }

  // The single most useful thing to revise next.
  let focus = null;
  if (bySubject.length) {
    const weakest = bySubject[0];
    const declining = bySubject.find((s) => s.trend === 'down');
    const allStrong = bySubject.every((s) => s.avg >= STRONG_AT);
    if (weakest.avg < WEAK_BELOW) {
      focus = { ...weakest, kind: 'weak', line: "Your weakest subject so far — a little focus here will go a long way." };
    } else if (declining) {
      focus = { ...declining, kind: 'declining', line: "Your recent scores here are slipping — time for a quick refresh." };
    } else if (allStrong) {
      focus = { ...weakest, kind: 'master', line: "You're doing great — stretch yourself with harder questions." };
    } else {
      focus = { ...weakest, kind: 'improve', line: "A bit more practice here will push your score higher." };
    }
  }

  return { hasData: totalQuizzes > 0, totalQuizzes, overallAvg, bySubject, recentMissed, focus };
}

// The specific concepts a student recently got wrong in one subject — used to
// target adaptive practice. `subject` may be the value ("biology") or label.
export function weakConceptsForSubject(results = [], subject) {
  if (!subject) return [];
  const match = (r) => r.subject === subject || r.subjectLabel === subject;
  const concepts = [];
  const seen = new Set();
  [...results]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) // newest first
    .forEach((r) => {
      if (!match(r) || !Array.isArray(r.missed)) return;
      r.missed.forEach((m) => {
        const q = (m && m.q ? String(m.q) : '').trim();
        if (q && !seen.has(q) && concepts.length < 6) {
          seen.add(q);
          concepts.push(q);
        }
      });
    });
  return concepts;
}
