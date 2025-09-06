const nodemailer = require('nodemailer');

const asBool = (v) => /^(1|true|yes|on)$/i.test(String(v || '').trim());
const asNum  = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const HOST = process.env.SMTP_HOST || '';
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const SECURE = asBool(process.env.SMTP_SECURE || '0');   // accepts "0"/"1" or "false"/"true"
const PORT = asNum(process.env.SMTP_PORT, SECURE ? 465 : 587);
const FROM = process.env.MAIL_FROM || USER;

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

module.exports = { sendMail };
