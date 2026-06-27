const express = require('express');
const router = express.Router();

// Sends school invite emails via Resend (https://resend.com).
//
// Configuration (backend/.env):
//   RESEND_API_KEY=re_...           # required to actually send
//   RESEND_FROM="MwanaAI <onboarding@resend.dev>"   # a verified sender
//
// Without a key the endpoint is a no-op that reports email_not_configured, so
// the admin flow still works (they can copy the invite link by hand).

const escapeHtml = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function buildEmail({ role, schoolName, gradeLabel, subjects, link }) {
  const school = escapeHtml(schoolName) || 'your school';
  const isStudent = role === 'student';
  const subjectLine =
    isStudent && Array.isArray(subjects) && subjects.length
      ? `<p style="margin:0 0 16px;color:#475569">Class: <strong>${escapeHtml(gradeLabel || '')}</strong>${
          subjects.length ? ` · ${subjects.length} subject${subjects.length !== 1 ? 's' : ''}` : ''
        }</p>`
      : '';

  const subject = `You've been invited to MwanaAI`;
  const roleIntro = {
    student: `${school} has set up a MwanaAI account for you. Your class and subjects are ready — just create your password to start learning.`,
    teacher: `${school} has invited you to MwanaAI as a teacher. Create your password to set up your classes.`,
    admin: `${school} has invited you to help administer their school on MwanaAI. Create your password to enrol teachers and students.`,
  };
  const intro = roleIntro[role] || roleIntro.teacher;

  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px">
      <div style="background:#fff;border-radius:14px;padding:28px;border:1px solid #e2e8f0">
        <h1 style="margin:0 0 4px;font-size:20px;color:#0f172a">Welcome to MwanaAI 👋</h1>
        <p style="margin:0 0 16px;color:#475569;line-height:1.5">${escapeHtml(intro)}</p>
        ${subjectLine}
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:9px">Create my account</a>
        <p style="margin:18px 0 0;color:#94a3b8;font-size:13px">Or paste this link into your browser:<br><span style="color:#64748b">${escapeHtml(link)}</span></p>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">A Rexplore Research Labs product</p>
    </div>
  </body></html>`;

  const text = `Welcome to MwanaAI\n\n${intro}\n\nCreate your account: ${link}\n\nA Rexplore Research Labs product`;
  return { subject, html, text };
}

// POST /api/email/invite  { to, role, schoolName, gradeLabel, subjects, link }
router.post('/invite', async (req, res) => {
  const { to, role, schoolName, gradeLabel, subjects, link } = req.body || {};
  if (!to || !link) {
    return res.status(400).json({ sent: false, reason: 'missing_fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.json({ sent: false, reason: 'email_not_configured' });
  }

  // Accept either RESEND_FROM or FROM_EMAIL; a bare address gets a friendly name.
  const fromRaw = process.env.RESEND_FROM || process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const from = fromRaw.includes('<') ? fromRaw : `MwanaAI <${fromRaw}>`;
  const { subject, html, text } = buildEmail({ role, schoolName, gradeLabel, subjects, link });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Resend error:', r.status, data);
      return res.status(502).json({ sent: false, reason: 'provider_error', detail: data?.message || `HTTP ${r.status}` });
    }
    return res.json({ sent: true, id: data?.id });
  } catch (err) {
    console.error('Email send failed:', err);
    return res.status(502).json({ sent: false, reason: 'send_failed', detail: err.message });
  }
});

module.exports = router;
