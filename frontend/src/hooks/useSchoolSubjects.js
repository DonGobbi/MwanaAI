import { useState, useEffect } from 'react';
import { subjectService, slugifySubject } from '../services/subjectService';
import { SUBJECTS } from '../config/curriculum';

// Resolves the subjects to offer a user. If their school has a catalogue with
// active subjects, use it (so admin-added subjects show up and deactivated ones
// disappear); otherwise fall back to the standard hardcoded list — so people
// without a school (self sign-ups) keep working unchanged.
//
// Returns { subjects: [{ value, label }], loading }.
export function useSchoolSubjects(schoolId) {
  const [subjects, setSubjects] = useState(SUBJECTS);
  const [loading, setLoading] = useState(!!schoolId);

  useEffect(() => {
    let active = true;
    if (!schoolId) {
      setSubjects(SUBJECTS);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    (async () => {
      try {
        const all = await subjectService.listForSchool(schoolId);
        const list = all
          .filter((s) => (s.status || 'active') === 'active')
          .map((s) => ({ value: s.value || slugifySubject(s.name), label: s.name }));
        if (active) setSubjects(list.length ? list : SUBJECTS);
      } catch (_) {
        if (active) setSubjects(SUBJECTS);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [schoolId]);

  return { subjects, loading };
}
