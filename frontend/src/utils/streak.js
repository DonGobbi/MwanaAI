// Current run of consecutive active days, based on quiz dates.
// Counts today (or yesterday, as a grace day) back through unbroken days.
export function computeStreak(results) {
  const days = new Set(results.map((r) => new Date(r.createdAt || 0).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) {
    d.setDate(d.getDate() - 1);
    if (!days.has(d.toDateString())) return 0;
  }
  while (days.has(d.toDateString())) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
