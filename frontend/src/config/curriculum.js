// Malawi school structure used across MwanaAI.
// Primary: Standard 1-8.  Secondary: Form 1-4.
// approxAge is a rough guide the AI tutor uses to pitch its explanations.

export const GRADE_LEVELS = [
  { value: 'standard-1', label: 'Standard 1', stage: 'Primary', approxAge: 6 },
  { value: 'standard-2', label: 'Standard 2', stage: 'Primary', approxAge: 7 },
  { value: 'standard-3', label: 'Standard 3', stage: 'Primary', approxAge: 8 },
  { value: 'standard-4', label: 'Standard 4', stage: 'Primary', approxAge: 9 },
  { value: 'standard-5', label: 'Standard 5', stage: 'Primary', approxAge: 10 },
  { value: 'standard-6', label: 'Standard 6', stage: 'Primary', approxAge: 11 },
  { value: 'standard-7', label: 'Standard 7', stage: 'Primary', approxAge: 12 },
  { value: 'standard-8', label: 'Standard 8', stage: 'Primary', approxAge: 13 },
  { value: 'form-1', label: 'Form 1', stage: 'Secondary', approxAge: 14 },
  { value: 'form-2', label: 'Form 2', stage: 'Secondary', approxAge: 15 },
  { value: 'form-3', label: 'Form 3', stage: 'Secondary', approxAge: 16 },
  { value: 'form-4', label: 'Form 4', stage: 'Secondary', approxAge: 17 },
];

export const SUBJECTS = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'chichewa', label: 'Chichewa' },
  { value: 'science', label: 'Science' },
  { value: 'biology', label: 'Biology' },
  { value: 'physical-science', label: 'Physical Science' },
  { value: 'geography', label: 'Geography' },
  { value: 'history', label: 'History' },
  { value: 'social-studies', label: 'Social Studies' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'computer-studies', label: 'Computer Studies' },
  { value: 'life-skills', label: 'Life Skills' },
];

export function getGradeLevel(value) {
  return GRADE_LEVELS.find((g) => g.value === value) || null;
}

export function getSubject(value) {
  return SUBJECTS.find((s) => s.value === value) || null;
}
