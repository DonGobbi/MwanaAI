// Pure builders: given already-analysed data, return the notifications that
// SHOULD exist for a user. Side-effect-free so they can be unit-tested; the
// engine persists whatever's new. Each item: { type, title, body, link, dedupeKey }.

// Student: a nudge about the subject they're struggling with, plus a cheer when
// a subject is improving.
export function studentAlerts(summary) {
  const out = [];
  if (!summary || !summary.hasData) return out;
  const f = summary.focus;
  if (f && f.kind !== 'master' && f.avg < 60) {
    out.push({
      type: 'struggle',
      title: `${f.label} needs attention`,
      body: `Your average in ${f.label} is ${f.avg}%. Tap to practise your weak spots.`,
      link: `/quiz?subject=${f.subject}&focus=1`,
      dedupeKey: `student_weak_${f.subject}`,
    });
  }
  (summary.bySubject || [])
    .filter((s) => s.trend === 'up')
    .forEach((s) => {
      out.push({
        type: 'win',
        title: `Great progress in ${s.label}! 🎉`,
        body: `You've improved to ${s.recentAvg}% in ${s.label}. Keep it up!`,
        link: '/progress',
        dedupeKey: `student_up_${s.subject}_${s.recentAvg}`,
      });
    });
  return out;
}

// Student: a reminder for each assignment still to do.
export function studentAssignmentAlerts(pending) {
  return (pending || []).map((a) => ({
    type: 'assignment',
    title: 'New assignment to do',
    body: `${a.title}${a.className ? ` · ${a.className}` : ''}`,
    link: '/',
    dedupeKey: `student_assign_${a.id}`,
  }));
}

// Teacher: which students in a class need help, with their weak topic.
export function teacherAlerts(className, classId, intel) {
  if (!intel || !intel.hasData) return [];
  return (intel.studentsNeedingHelp || []).slice(0, 8).map((s) => {
    const topic = s.weakTopics && s.weakTopics[0] ? s.weakTopics[0].topic : className;
    return {
      type: 'struggle',
      title: `${s.name} needs help`,
      body: `${s.name} is struggling in ${topic} (avg ${s.avg}%) in ${className}.`,
      link: '/teacher',
      dedupeKey: `teacher_${classId}_${s.id}_${topic}`,
    };
  });
}

// Teacher: recent quiz submissions in a class (newest first, capped).
export function teacherSubmissionAlerts(className, classId, submissions, nameById = {}) {
  return (submissions || []).slice(0, 15).map((r) => ({
    type: 'submission',
    title: `${nameById[r.userId] || 'A student'} did a quiz`,
    body: `${nameById[r.userId] || 'A student'} scored ${r.percentage}% in ${className}.`,
    link: '/teacher',
    dedupeKey: `teacher_sub_${r.id}`,
  }));
}

// Parent: how their child is doing (struggle nudge + improvement cheer).
export function parentAlerts(childName, childUid, summary) {
  const out = [];
  if (!summary || !summary.hasData) return out;
  const name = childName || 'Your child';
  const f = summary.focus;
  if (f && f.kind !== 'master' && f.avg < 60) {
    out.push({
      type: 'struggle',
      title: `${name} needs support`,
      body: `${name} is finding ${f.label} difficult (avg ${f.avg}%). See how you can help.`,
      link: '/child',
      dedupeKey: `parent_${childUid}_weak_${f.subject}`,
    });
  }
  (summary.bySubject || [])
    .filter((s) => s.trend === 'up')
    .forEach((s) => {
      out.push({
        type: 'win',
        title: `${name} is improving in ${s.label} 🎉`,
        body: `${name}'s ${s.label} score is up to ${s.recentAvg}%.`,
        link: '/child',
        dedupeKey: `parent_${childUid}_up_${s.subject}_${s.recentAvg}`,
      });
    });
  return out;
}
