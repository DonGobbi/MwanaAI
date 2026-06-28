// Compute a whole-number age from a date of birth. The age shown on profiles
// is always derived from the DOB (never stored) so it can't drift out of date.
export function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
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
