import { useAuth } from '../contexts/AuthContext';
import { getSubject, getGradeLevel } from '../config/curriculum';

// The student's class + enrolled subjects, read once from their profile so every
// page (Learn, Practice, Tutor, Flashcards) can personalise itself without ever
// asking the student to pick a class or subject again.
export function useCourses() {
  const { userProfile } = useAuth();
  const level =
    userProfile?.gradeLevel ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('mwanaai_grade_level') : '') ||
    '';
  const levelInfo = getGradeLevel(level);
  const subjects = (userProfile?.subjects || [])
    .map((v) => getSubject(v))
    .filter(Boolean); // [{ value, label, ... }]
  return {
    level,
    levelLabel: levelInfo?.label || level,
    ageHint: levelInfo?.approxAge,
    subjects,
  };
}
