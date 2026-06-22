// Computes a student's achievement badges from their activity.
// Badges are derived from existing data — nothing extra is stored.
export function computeBadges({
  quizCount = 0,
  avgScore = 0,
  perfectCount = 0,
  streak = 0,
  lessonsCompleted = 0,
  subjectStats = [],
}) {
  const base = [
    { id: 'first-quiz', name: 'First Steps', icon: '🎯', desc: 'Complete your first quiz', earned: quizCount >= 1 },
    { id: 'five-quizzes', name: 'Getting Started', icon: '🌟', desc: 'Complete 5 quizzes', earned: quizCount >= 5 },
    { id: 'quiz-master', name: 'Quiz Master', icon: '🧠', desc: 'Complete 25 quizzes', earned: quizCount >= 25 },
    { id: 'perfect', name: 'Perfectionist', icon: '💯', desc: 'Score 100% on a quiz', earned: perfectCount >= 1 },
    { id: 'high-achiever', name: 'High Achiever', icon: '🏅', desc: 'Keep an 80%+ average', earned: quizCount >= 3 && avgScore >= 80 },
    { id: 'streak-3', name: 'On Fire', icon: '🔥', desc: 'Reach a 3-day streak', earned: streak >= 3 },
    { id: 'streak-7', name: 'Unstoppable', icon: '⚡', desc: 'Reach a 7-day streak', earned: streak >= 7 },
    { id: 'bookworm', name: 'Bookworm', icon: '📚', desc: 'Finish 5 lessons', earned: lessonsCompleted >= 5 },
    { id: 'scholar', name: 'Scholar', icon: '🎓', desc: 'Finish 15 lessons', earned: lessonsCompleted >= 15 },
  ];

  // Dynamic "subject master" badges for subjects mastered (80%+ over 3+ quizzes).
  const subjectMasters = subjectStats
    .filter((s) => s.count >= 3 && s.avg >= 80)
    .map((s) => ({
      id: `master-${s.name}`,
      name: `${s.name} Master`,
      icon: '👑',
      desc: `80%+ average in ${s.name}`,
      earned: true,
    }));

  return [...subjectMasters, ...base];
}
