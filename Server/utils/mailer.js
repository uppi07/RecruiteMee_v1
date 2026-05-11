const nodemailer = require('nodemailer');

const asBool = (v) => /^(1|true|yes|on)$/i.test(String(v || '').trim());
const asNum  = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || '';
const USER = process.env.SMTP_USER || process.env.EMAIL_USER || '';
const PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
const SECURE = asBool(process.env.SMTP_SECURE || '0');   // accepts "0"/"1" or "false"/"true"
const PORT = asNum(process.env.SMTP_PORT || process.env.EMAIL_PORT, SECURE ? 465 : 587);
const FROM = process.env.MAIL_FROM || process.env.EMAIL_FROM || USER;

let transporter = null;

function buildTransport() {
  if (!HOST || !USER || !PASS) return null;
  return nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: SECURE,
    auth: { user: USER, pass: PASS },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    tls: { minVersion: 'TLSv1.2' },
  });
}

async function getTransport() {
  if (!transporter) transporter = buildTransport();
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = await getTransport();
  if (!t) throw new Error('SMTP not configured');

  // Helpful error if creds are wrong
  await t.verify();

  const info = await t.sendMail({ from: FROM, to, subject, html, text });
  return info;
}

function resetEmailTemplate({ appUrl, token }) {
  const base = String(appUrl || '').replace(/\/+$/, '');
  const safeBase = base || 'http://localhost:5173';
  const link = `${safeBase}/forgot?token=${encodeURIComponent(token || '')}`;

  const html = `
    <p>Hi,</p>
    <p>We received a request to reset your RecruiteMee password.</p>
    <p><a href="${link}" target="_blank" rel="noopener noreferrer">Reset Password</a></p>
    <p>If the button does not work, copy and paste this URL into your browser:</p>
    <p>${link}</p>
    <p>This link will expire shortly for security reasons.</p>
    <p>— RecruiteMee Team</p>
  `;

  const text = [
    'We received a request to reset your RecruiteMee password.',
    `Reset link: ${link}`,
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  return { html, text };
}

module.exports = { sendMail, resetEmailTemplate };
