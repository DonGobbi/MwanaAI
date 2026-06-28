// Age derived from the date of birth (never stored, so it can't drift). By
// design this is the year-only difference (current year − birth year), i.e. the
// age the person turns this year — not adjusted for whether the birthday has
// passed yet.
export function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const age = new Date().getFullYear() - birth.getFullYear();
  if (age < 0 || age > 120) return null;
  return age;
}

// Friendly date for "Member since" / "Last sign-in". Accepts an ISO string,
// millis, or a Date — returns '—' for anything unparseable.
export function formatDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Today's date as YYYY-MM-DD, for the max attribute on a DOB picker.
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
