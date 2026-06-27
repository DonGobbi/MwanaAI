import { API_BASE } from '../config/api';

// Emails a school invite (the /signup?email= link) via the backend, which
// relays through Resend. If the backend has no Resend key configured it
// returns { sent: false, reason: 'email_not_configured' } — the admin can
// still copy the link by hand, so sending is best-effort, never blocking.
export const emailService = {
  // The invite link carries the role (and class/subjects for students) so the
  // signup form can skip those questions. The role here only pre-fills the form
  // for self-serviceable roles; the authoritative role/class/subjects are
  // applied from the real Firestore invite when the person first signs in.
  inviteLink({ email, role, gradeLevel, subjects, schoolName }) {
    const p = new URLSearchParams();
    p.set('email', email || '');
    if (role) p.set('role', role);
    if (gradeLevel) p.set('grade', gradeLevel);
    if (subjects && subjects.length) p.set('subjects', subjects.join(','));
    if (schoolName) p.set('school', schoolName);
    return `${window.location.origin}/signup?${p.toString()}`;
  },

  async sendInvite({ email, role, schoolName, gradeLevel, gradeLabel, subjects }) {
    try {
      const res = await fetch(`${API_BASE}/api/email/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          role,
          schoolName: schoolName || '',
          gradeLabel: gradeLabel || '',
          subjects: subjects || [],
          link: this.inviteLink({ email, role, gradeLevel, subjects, schoolName }),
        }),
      });
      return await res.json().catch(() => ({ sent: false, reason: 'bad_response' }));
    } catch (err) {
      return { sent: false, reason: 'unreachable' };
    }
  },
};
