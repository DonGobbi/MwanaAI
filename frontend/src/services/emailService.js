import { API_BASE } from '../config/api';

// Emails a school invite (the /signup?email= link) via the backend, which
// relays through Resend. If the backend has no Resend key configured it
// returns { sent: false, reason: 'email_not_configured' } — the admin can
// still copy the link by hand, so sending is best-effort, never blocking.
export const emailService = {
  inviteLink(email) {
    return `${window.location.origin}/signup?email=${encodeURIComponent(email)}`;
  },

  async sendInvite({ email, role, schoolName, gradeLabel, subjects }) {
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
          link: this.inviteLink(email),
        }),
      });
      return await res.json().catch(() => ({ sent: false, reason: 'bad_response' }));
    } catch (err) {
      return { sent: false, reason: 'unreachable' };
    }
  },
};
