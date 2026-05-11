/* eslint-disable no-console */
const path = require('path');
const dns = require('node:dns');
const dotenv = require('dotenv');

// Load env from Server/.env first, then fallback to repo-root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const mongoDnsServers = String(process.env.MONGO_DNS_SERVERS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (mongoDnsServers.length > 0) {
  try {
    dns.setServers(mongoDnsServers);
    console.log('[mongo] custom DNS resolvers:', mongoDnsServers);
  } catch (e) {
    console.warn('[mongo] invalid MONGO_DNS_SERVERS, using system DNS:', e.message);
  }
}

const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const multer = require('multer');
const compression = require('compression');
const Razorpay = require('razorpay');
const cookieParser = require('cookie-parser'); // 👈 NEW

const USE_GRIDFS = process.env.USE_GRIDFS === '1';
let gridfsBucket = null;

function makeSafeName(original = '') {
  return (
    Date.now() +
    '-' +
    crypto.randomBytes(4).toString('hex') +
    path.extname(original || '')
  );
}

async function gridfsSaveBuffer(filename, buffer, mime = 'application/octet-stream') {
  return new Promise((resolve, reject) => {
    const up = gridfsBucket.openUploadStream(filename, { contentType: mime });
    up.on('finish', () => resolve({ id: up.id, filename }));
    up.on('error', reject);
    up.end(buffer);
  });
}

async function gridfsDeleteByFilename(filename) {
  const files = await gridfsBucket
    .find({ filename })
    .sort({ uploadDate: -1 })
    .limit(1)
    .toArray();
  if (files.length) {
    await gridfsBucket.delete(files[0]._id);
  }
}


// mailer
const { sendMail, resetEmailTemplate } = require('./utils/mailer');

/* ----------------------------- ENV & CONSTS ------------------------------ */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => String(e || '').trim().toLowerCase())
  .filter(Boolean);

const {
  PORT = 5000,
  MONGO_URI,
  CLIENT_ORIGINS = '',
  CLIENT_ORIGIN = '',
  CLIENT_ORIGIN_PATTERNS = '',
  NODE_ENV = 'development',

  BCRYPT_ROUNDS = '10',
  RESET_TOKEN_TTL_MINUTES = '60',
  OTP_TTL_MINUTES = '10',
  ADMIN_BOOTSTRAP_PASSWORD = 'changeme123!',
  APP_URL = 'http://localhost:5173',

  // Razorpay
  RAZORPAY_KEY_ID = '',
  RAZORPAY_KEY_SECRET = '',
  RAZORPAY_WEBHOOK_SECRET = '',
  RAZORPAY_ENABLE_PAYPAL = '0', // "1" to allow PayPal when currency = USD

  // Pricing
  AMT_RESUME_BUILD_FORM = '1450',       // $17 → ₹1450
  AMT_RESUME_BUILD_FORM_USD = '17',
  AMT_RESUME_REWRITE = '1218',
  AMT_RESUME_REWRITE_USD = '14',
  AMT_RESUME_REVIEW = '0',
  AMT_RESUME_REVIEW_USD = '0',
  AMT_LINKEDIN_OPT = '0',
  AMT_LINKEDIN_OPT_USD = '0',

  CURRENCY = 'INR',
  JWT_SECRET,
} = process.env;

if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET in env');
  process.exit(1);
}

const SALT_ROUNDS = Number(BCRYPT_ROUNDS) || 10;
const RESET_TTL_MS = (Number(RESET_TOKEN_TTL_MINUTES) || 60) * 60 * 1000;
const OTP_TTL_MS = (Number(OTP_TTL_MINUTES) || 10) * 60 * 1000;
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 45);
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
const INF_REVIEW_BONUS = Number(process.env.INFLUENCER_REVIEW_BONUS || 50);
const INF_ORDER_PRICE = Number(process.env.INFLUENCER_ORDER_PRICE || 150);
const INF_MIN_REGS = Number(process.env.INFLUENCER_MIN_REGS || 50);
const INF_MIN_BAL  = Number(process.env.INFLUENCER_MIN_BAL || 2500);
const MONGO_URI_FALLBACK = String(process.env.MONGO_URI_FALLBACK || '').trim();
const MONGO_SERVER_SELECTION_TIMEOUT_MS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000);

/* ---------- CORS allowlist (supports exact & wildcard patterns) ---------- */
const RAW_ORIGINS = (CLIENT_ORIGINS || CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const RAW_PATTERNS = (CLIENT_ORIGIN_PATTERNS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// FE domains
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://recruite-mee.vercel.app',
  'https://recruitemee.vercel.app',
  'https://recruitemee.com',
  'https://www.recruitemee.com',
];

const ALLOWED_ORIGINS = Array.from(new Set([...RAW_ORIGINS, ...DEFAULT_ORIGINS]))
  .map((o) => o.replace(/\/+$/, '').toLowerCase());

const PATTERN_REGEXES = RAW_PATTERNS.map((p) => {
  const escaped = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped.replace(/\/+$/, '')}$`, 'i');
});

function originAllowed(originRaw = '') {
  const o = (originRaw || '').replace(/\/+$/, '').toLowerCase();
  if (!o) return false;
  if (ALLOWED_ORIGINS.includes(o)) return true;
  return PATTERN_REGEXES.some((re) => re.test(o));
}

console.log('[cors] exact origins →', ALLOWED_ORIGINS);
console.log('[cors] wildcard patterns →', RAW_PATTERNS);

/* ---------------- Currency / amounts / Razorpay client ------------------- */
const VALID_CURRENCIES = new Set(['inr', 'usd']);
const DEFAULT_CURRENCY = (CURRENCY || 'INR').toLowerCase();
const pickCurrency = (v) => {
  const c = String(v || '').trim().toLowerCase();
  return VALID_CURRENCIES.has(c) ? c : DEFAULT_CURRENCY;
};

const RB_INR = Number(AMT_RESUME_BUILD_FORM || AMT_RESUME_BUILD || 0);
const RB_USD = Number(AMT_RESUME_BUILD_FORM_USD || AMT_RESUME_BUILD_USD || 0);

const AMOUNT_MAP = {
  inr: {
    resume_build: RB_INR,
    resume_rewrite: Number(AMT_RESUME_REWRITE || 0),
    resume_review: Number(AMT_RESUME_REVIEW || 0),
    linkedin_opt: Number(AMT_LINKEDIN_OPT || 0),
  },
  usd: {
    resume_build: RB_USD,
    resume_rewrite: Number(AMT_RESUME_REWRITE_USD || 0),
    resume_review: Number(AMT_RESUME_REVIEW_USD || 0),
    linkedin_opt: Number(AMT_LINKEDIN_OPT_USD || 0),
  },
};

const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
    : null;

/* -------------------------------- App ------------------------------------ */
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // 👈 NEW

/* -------------------- Pretty referral routes (cookie + redirect) --------- */
// Normalize APP_URL (no trailing slash)
const FE_URL = String(APP_URL || '').replace(/\/+$/, '') || 'http://localhost:5173';

// Set cookie `ref` and redirect to FE register with ?ref=CODE
app.get(['/ref/:code', '/ref-:code'], (req, res) => {
  const code = String(req.params.code || '').trim();
  if (!code) return res.redirect(FE_URL);
  res.cookie('ref', code, {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    httpOnly: false, // FE can read if needed
    sameSite: 'lax',
  });
  return res.redirect(`${FE_URL}/register?ref=${encodeURIComponent(code)}`);
});

/* -------------------- Webhook must read RAW body ------------------------- */
// Razorpay webhook (raw body). Sends payment email **after** capture.
if (RAZORPAY_WEBHOOK_SECRET) {
  app.post('/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      if (!signature) return res.status(400).send('Missing signature');

      const expected = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(req.body) // raw buffer!
        .digest('hex');

      if (expected !== signature) return res.status(400).send('Invalid signature');

      const evt = JSON.parse(req.body.toString('utf8'));
      const type = evt.event;
      const p = evt.payload?.payment?.entity;
      const o = evt.payload?.order?.entity;

      const rzpOrderId = p?.order_id || o?.id;
      const ourReceipt = o?.receipt;

      let orderDoc = null;
      if (ourReceipt) orderDoc = await Order.findOne({ orderId: ourReceipt });
      if (!orderDoc && rzpOrderId) orderDoc = await Order.findOne({ razorpayOrderId: rzpOrderId });
      if (!orderDoc) return res.json({ ok: true });

      if (type === 'payment.captured' && p) {
        const wasPaid = orderDoc.paymentStatus === 'paid';
        const expectedAmount = Math.round(Number(orderDoc.amount) * 100);
        const expectedCurrency = (orderDoc.currency || DEFAULT_CURRENCY).toUpperCase();

        if (p.amount === expectedAmount && p.currency === expectedCurrency) {
          orderDoc.paymentStatus = 'paid';
          if (orderDoc.status === 'pending') orderDoc.status = 'processing';
          orderDoc.razorpayPaymentId = p.id;
          orderDoc.receiptUrl = p?.notes?.receipt_url || orderDoc.receiptUrl || '';
          orderDoc.invoiceUrl = orderDoc.invoiceUrl || orderDoc.receiptUrl || '';
          await orderDoc.save();

          // 👇 NEW: one-time referral credit for paid resume reviews
          try { await maybeCreditInfluencerForReview(orderDoc); } catch (e) { console.warn('[webhook credit]', e.message); }

          // ✅ Send confirmation email only when it turns paid here
          if (!wasPaid) {
            try { await sendPaymentConfirmation(orderDoc); } catch (e) { console.warn('[mail webhook confirm]', e.message); }
          }
        }
      } else if (type === 'payment.failed') {
        orderDoc.paymentStatus = 'failed';
        orderDoc.status = 'failed';
        await orderDoc.save();
      } else if (type === 'refund.processed') {
        orderDoc.paymentStatus = 'refunded';
        orderDoc.status = 'refunded';
        await orderDoc.save();
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('Webhook error', err);
      return res.status(500).send('Webhook error');
    }
  });
} else {
  console.warn('[payments] No RAZORPAY_WEBHOOK_SECRET set — webhook route disabled');
}

/* ---------------- After webhook: normal JSON parsers --------------------- */
app.use(express.json({ limit: '10mb' }));

/* -------------------------------- CORS ----------------------------------- */
app.use((req, res, next) => {
  const originRaw = String(req.headers.origin || '');
  const requestedHeaders = req.headers['access-control-request-headers'];
  const allowed = originAllowed(originRaw);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', originRaw);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      requestedHeaders || 'Content-Type, Authorization, X-Requested-With, X-Ref'
    );
    res.setHeader('Access-Control-Max-Age', '600');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
  // Always respond 204 so browsers don't stall the preflight
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', originRaw);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With, X-Ref');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  return res.sendStatus(204);
}
  next();
});

/* ------------------------------ Uploads ---------------------------------- */
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, 'uploads');

if (!USE_GRIDFS) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      fallthrough: true,
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
        if (filePath.endsWith('.pdf')) res.setHeader('Content-Type', 'application/pdf');
      },
    })
  );
} else {
  // stream latest revision of filename from GridFS
  app.get('/uploads/:name', async (req, res) => {
    try {
      const name = path.basename(req.params.name || '');
      const files = await gridfsBucket
        .find({ filename: name })
        .sort({ uploadDate: -1 })
        .limit(1)
        .toArray();
      if (!files.length) return res.status(404).send('Not found');

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      if (files[0].contentType) res.type(files[0].contentType);

      gridfsBucket.openDownloadStream(files[0]._id).pipe(res);
    } catch {
      res.status(404).send('Not found');
    }
  });
}
const storage = USE_GRIDFS
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => cb(null, makeSafeName(file.originalname || '')),
    });
const upload = multer({ storage });

/* ----------------------------- Rate limits ------------------------------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(
  ['/login', '/register', '/forgot', '/forgot/reset', '/auth/otp/send', '/auth/otp/verify'],
  authLimiter
);

const paymentsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(['/payments/checkout', '/payments/verify'], paymentsLimiter);

/* -------------------------------- Utils ---------------------------------- */
const normalizeEmail = (e) => String(e || '').trim().toLowerCase();
const signJwt = (payload, expiresIn = '10h') => jwt.sign(payload, JWT_SECRET, { expiresIn });

const generateUserId = async () => {
  for (let i = 0; i < 5; i++) {
    const candidate = 'RM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.exists({ id: candidate });
    if (!exists) return candidate;
  }
  return 'RM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

const safeUser = (u) =>
  u
    ? {
        _id: u._id,
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isVerified: !!u.isVerified,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }
    : null;

// Referral extractor 👇 NEW
function getReferralCode(req) {
  return (
    (req.query && req.query.ref) ||
    (req.body && req.body.referralCode) ||
    req.headers['x-ref'] ||
    (req.cookies && req.cookies.ref) ||
    ''
  );
}

function formatResumeDocText(data = {}) {
  const L = (label, v) => `${label}: ${v ? String(v) : '-'}`;
  const lines = [];

  lines.push('RecruiteMee — Resume Form Submission');
  lines.push('====================================');
  lines.push('');

  lines.push('— Degree —');
  lines.push(L('Degree Level', data.degreeLevel));
  lines.push(L('Primary Major', data.majorPrimary));
  if (data.majorPrimary === 'Other') lines.push(L('Other Major', data.majorOther));
  if (Array.isArray(data.targetRoles) && data.targetRoles.length) {
    lines.push('');
    lines.push('— Target Job Roles —');
    lines.push(String(data.targetRoles.join(', ')));
  }
  lines.push('');

  const p = data.personal || {};
  lines.push('— Personal —');
  lines.push(L('PID', p.pid));
  lines.push(L('Full Name', p.fullName));
  lines.push(L('Email', p.email));
  lines.push(L('Phone', p.phone));
  lines.push(L('Address', p.address));
  lines.push(L('LinkedIn', p.linkedin));
  lines.push(L('GitHub/Portfolio', p.github));
  lines.push('');

  if (data.summary) {
    lines.push('— Summary —');
    lines.push(String(data.summary));
    lines.push('');
  }

  const arr = (name, list, mapper) => {
    if (!Array.isArray(list) || list.length === 0) return;
    lines.push(`— ${name} —`);
    list.forEach((item, i) => {
      lines.push(`#${i + 1}`);
      mapper(item);
      lines.push('');
    });
  };

  arr('Work', data.work, (w) => {
    lines.push(L('Job Title', w.jobTitle));
    lines.push(L('Company', w.company));
    lines.push(L('Location', w.location));
    lines.push(L('Start', w.start));
    lines.push(L('End', w.end));
    lines.push(L('Responsibilities', w.responsibilities));
  });

  arr('Education', data.edu, (e) => {
    lines.push(L('Degree', e.degree));
    lines.push(L('Institution', e.institution));
    lines.push(L('Location', e.location));
    lines.push(L('Start', e.start));
    lines.push(L('End', e.end));
    lines.push(L('Major', e.major));
  });

  if (data.skills) {
    lines.push('— Skills —');
    lines.push(L('Technical', data.skills.techSkills));
    lines.push(L('Soft', data.skills.softSkills));
    lines.push('');
  }

  arr('Projects', data.projects, (pr) => {
    lines.push(L('Name', pr.name));
    lines.push(L('Tech', pr.tech));
    lines.push(L('Description', pr.desc));
    lines.push(L('Role', pr.role));
    lines.push(L('Link', pr.link));
  });

  arr('Certifications', data.certs, (c) => {
    lines.push(L('Name', c.name));
    lines.push(L('Organization', c.org));
    lines.push(L('Date', c.date));
  });

  arr('Languages', data.langs, (l) => {
    lines.push(L('Language', l.name));
    lines.push(L('Level', l.level));
  });

  lines.push('====================================');
  lines.push(`Generated at: ${new Date().toISOString()}`);

  return lines.join('\n');
}
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const nl2br = (s = '') => escapeHtml(s).replace(/\r?\n/g, '<br/>');
// ✅ credit influencer for PAID Resume Review exactly once per referred user
async function maybeCreditInfluencerForReview(orderLike) {
  try {
    if (!orderLike) return;
    if (String(orderLike.service) !== 'resume_review') return;
    if (String(orderLike.paymentStatus).toLowerCase() !== 'paid') return;

    const email = normalizeEmail(orderLike.userEmail);
    const user  = await User.findOne({ email });
    if (!user || !user.influencerId) return;

    // one-time guard
    if (user.referralReviewCredited) return;

    await Influencer.findByIdAndUpdate(
      user.influencerId,
      { $inc: { 'stats.orders': 1, balance: INF_REVIEW_BONUS } }
    );

    user.referralReviewCredited = true;
    await user.save();
  } catch (e) {
    console.warn('[influencer credit] maybeCreditInfluencerForReview:', e.message);
  }
}


/* -------------------------- Auth middlewares ------------------------------ */
const auth = (req, res, next) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ ok: false, message: 'Missing/invalid Authorization header' });
  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { email: decoded.email, id: decoded.id, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
  }
};
const requireAdmin = (req, res, next) =>
  req.user?.role !== 'admin'
    ? res.status(403).json({ ok: false, message: 'Admin only' })
    : next();
const requireInfluencer = (req, res, next) =>
  req.user?.role !== 'influencer'
    ? res.status(403).json({ ok: false, message: 'Influencer only' })
    : next();

/* --------------------------- Schemas & Models ----------------------------- */
const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    isVerified: { type: Boolean, default: false, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer", default: null },
    referralReviewCredited: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const User = mongoose.model('User', UserSchema);

const EmailOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true, lowercase: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const EmailOtp = mongoose.model('EmailOtp', EmailOtpSchema);

const ResumeSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, index: true, lowercase: true },
    degreeLevel: { type: String, required: true },
    majorPrimary: { type: String, required: true },
    majorOther: String,
    targetRoles: { type: [String], default: [], index: true },
    personal: {
      pid: { type: String, required: true },
      fullName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, required: true },
      address: String,
      linkedin: { type: String, required: true },
      github: String,
    },
    summary: String,
    work: [
      { jobTitle: String, company: String, location: String, start: String, end: String, responsibilities: String },
    ],
    edu: [
      { degree: { type: String, required: true }, institution: { type: String, required: true }, location: String, start: { type: String, required: true }, end: String, major: String },
    ],
    skills: {
      industrySkills: Boolean,
      techSkills: { type: String, required: true },
      softSkills: { type: String, required: true },
    },
    projects: [{ name: String, desc: String, tech: String, role: String, link: String }],
    certs: [{ name: String, org: String, date: String }],
    langs: [{ name: String, level: String }],
  },
  { timestamps: true }
);
const Resume = mongoose.model('Resume', ResumeSchema);

// ⬇️ REPLACE your OrderSchema block with this (adds influencerCredited + notes[])
// ⬇️ Clean OrderSchema (no stray braces)
const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    userEmail: { type: String, required: true, index: true, lowercase: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'failed'],
      default: 'unpaid',
      index: true,
    },

    service: { type: String, enum: ['resume_review','linkedin_opt','resume_build','resume_rewrite'], index: true },
    planName: String,
    description: String,
    inputs: {
      linkedinUrl: String,
      targetRoles: { type: [String], default: [] },
    },

    customerUploads: [
      {
        originalName: String,
        filename: String,
        url: String,
        mime: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now }
      },
    ],
    attachments: [
      {
        originalName: String,
        filename: String,
        url: String,
        uploadedBy: String,
        uploadedAt: { type: Date, default: Date.now }
      },
    ],

    // end-user/admin message thread (short notes)
    notes: [
      {
        body: { type: String, required: true },
        by:   { type: String, enum: ['user','admin'], default: 'user' },
        at:   { type: Date, default: Date.now }
      }
    ],

    reviewSuggestions: { type: String, default: '' },

    amount: Number,
    currency: { type: String, default: DEFAULT_CURRENCY },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    priceId: String,
    receiptUrl: String,
    invoiceUrl: String,

    influencerCredited: { type: Boolean, default: false },
  },
  { timestamps: true }
);


const Order = mongoose.model('Order', OrderSchema);

const ResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false, index: true },
    influencerCredited: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const ResetToken = mongoose.model('ResetToken', ResetTokenSchema);

const QuerySchema = new mongoose.Schema(
  {
    pid: { type: String, index: true },
    email: { type: String, lowercase: true, required: true, index: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    lastRepliedAt: { type: Date, index: true },
    replies: [
      {
        at: { type: Date, default: Date.now },
        by: { type: String },
        to: { type: String },
        subject: { type: String },
        body: { type: String },
        sendOk: { type: Boolean, default: true },
        previewUrl: { type: String }
      }
    ]
  },
  { timestamps: true }
);
QuerySchema.index({ createdAt: -1 });
QuerySchema.index({ email: 1, createdAt: -1 });
const Query = mongoose.model('Query', QuerySchema);

// Influencer Schema
const InfluencerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, index: true, lowercase: true, unique: true },
  password: String,
  plainPassword: String,
  referralCode: String,
  referralLink: String,
  stats: {
    usersReferred: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
  },
  balance: { type: Number, default: 0 }
}, { timestamps: true });
const Influencer = mongoose.model("Influencer", InfluencerSchema);
// Pending (unverified) registrations are kept here until OTP is verified
const PendingRegSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, lowercase: true, unique: true },
  name:  { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Influencer', default: null },
  referralCode: { type: String, default: '' },
}, { timestamps: true });

const PendingReg = mongoose.model('PendingReg', PendingRegSchema);


/* ------------------------ Influencer auth & dashboard -------------------- */
app.post("/influencer/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const inf = await Influencer.findOne({ email: normalizeEmail(email) });
    if (!inf) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const hashedOk = await bcrypt.compare(password, inf.password);
    const plainOk = inf.plainPassword && password === inf.plainPassword;
    if (!hashedOk && !plainOk) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const token = signJwt({ id: inf._id, email: inf.email, role: "influencer" }, "5h");
    return res.json({
      ok: true,
      token,
      influencer: {
        id: inf._id,
        name: inf.name,
        email: inf.email,
        referralCode: inf.referralCode,
        referralLink: inf.referralLink,
        stats: inf.stats,
      },
    });
  } catch (e) {
    console.error("POST /influencer/login", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});
// BEFORE: app.get("/influencer/dashboard", async (req, res) => { ... });

// ✅ keep this one
app.get("/influencer/dashboard", auth, requireInfluencer, async (req, res) => {
  try {
    const inf = await Influencer.findById(req.user.id).lean();
    if (!inf) return res.status(404).json({ ok: false, message: "Influencer not found" });

    const users = await User.find({ influencerId: inf._id }).lean();
    const emails = users.map((u) => u.email);
    const orders = await Order.find({ userEmail: { $in: emails } })
      .sort({ createdAt: -1 })
      .lean();

    const registrations = users.length;
    const ordersCount = orders.length;
    const balance = inf.balance || 0;
    const eligible = registrations >= INF_MIN_REGS && balance >= INF_MIN_BAL;

    return res.json({
      ok: true,
      influencer: {
        id: inf._id,
        name: inf.name,
        email: inf.email,
        referralCode: inf.referralCode,
        referralLink: inf.referralLink,
      },
      stats: {
        registrations,
        orders: ordersCount,
        balance,
        minRegs: INF_MIN_REGS,
        minBalance: INF_MIN_BAL,
        eligible,
      },
      orders,
    });
  } catch (e) {
    console.error("GET /influencer/dashboard", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
/* ----------------------- Influencer Queries & Payouts -------------------- */
const InfluencerQuerySchema = new mongoose.Schema({
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer", required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
  replies: [
    {
      body: String,
      at: { type: Date, default: Date.now },
      by: { type: String, default: "admin" }
    }
  ]
}, { timestamps: true });
const InfluencerQuery = mongoose.model("InfluencerQuery", InfluencerQuerySchema);

// ⬇️ add to PayoutSchema fields
const PayoutSchema = new mongoose.Schema({
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer", required: true },
  amount: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ["requested", "approved", "paid", "rejected"], default: "requested" },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  txnId: { type: String },

  // 👇 NEW FIELDS
  payeeName: { type: String, default: "" },
  mobile: { type: String, default: "" },
  bankName: { type: String, default: "" },
  upiId: { type: String, default: "" }
}, { timestamps: true });

const Payout = mongoose.model("Payout", PayoutSchema);

app.post("/influencer/queries", async (req, res) => {
  try {
    const { influencerId, subject, message } = req.body;
    if (!influencerId || !subject || !message) {
      return res.status(400).json({ ok: false, message: "All fields required" });
    }
    const query = await InfluencerQuery.create({ influencerId, subject, message });
    return res.status(201).json({ ok: true, query });
  } catch (err) {
    console.error("POST /influencer/queries", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.get("/influencer/queries/:id", async (req, res) => {
  try {
    const items = await InfluencerQuery.find({ influencerId: req.params.id }).sort({ createdAt: -1 });
    return res.json({ ok: true, items });
  } catch (err) {
    console.error("GET /influencer/queries/:id", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.post("/influencer/payouts/request", auth, async (req, res) => {
  try {
    if (req.user.role !== "influencer")
      return res.status(403).json({ ok: false, message: "Influencer only" });

    const inf = await Influencer.findById(req.user.id);
    if (!inf) return res.status(404).json({ ok: false, message: "Influencer not found" });

    // ✅ compute from users (same as dashboard)
    const regs = await User.countDocuments({ influencerId: inf._id });

    if (regs < INF_MIN_REGS) {
      return res.status(400).json({ ok: false, message: `Need at least ${INF_MIN_REGS} registrations to request payout` });
    }
    if ((inf.balance || 0) < INF_MIN_BAL) {
      return res.status(400).json({ ok: false, message: `Minimum balance of ₹${INF_MIN_BAL} required to request payout` });
    }

    // 👇 NEW: pick payout contact details
    const payeeName = String(req.body.payeeName || '').trim();
    const mobile   = String(req.body.mobile || '').trim();
    const bankName = String(req.body.bankName || '').trim();
    const upiId    = String(req.body.upiId || '').trim();

    if (!payeeName || !mobile || !bankName || !upiId) {
      return res.status(400).json({ ok: false, message: "Name, mobile, bank name and UPI ID are required" });
    }

    const payout = await Payout.create({
      influencerId: inf._id,
      amount: inf.balance,
      payeeName,
      mobile,
      bankName,
      upiId,
    });

    // zero out balance after request (your current behavior)
    inf.balance = 0;
    await inf.save();

    return res.status(201).json({ ok: true, payout });
  } catch (e) {
    console.error("POST /influencer/payouts/request", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});



app.get("/influencer/payouts", auth, async (req, res) => {
  try {
    if (req.user.role !== "influencer")
      return res.status(403).json({ ok: false, message: "Influencer only" });

    const items = await Payout.find({ influencerId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ ok: true, items });
  } catch (e) {
    console.error("GET /influencer/payouts", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* --------------------------- Mail helpers -------------------------------- */
function htmlList(items = []) {
  return items.length ? `<ul>${items.map((s) => `<li>${s}</li>`).join('')}</ul>` : '';
}

async function notifyStatusChange(orderBefore, orderAfter) {
  try {
    const changed = [];
    if (orderBefore.status !== orderAfter.status)
      changed.push(`Status: <strong>${orderBefore.status || '—'}</strong> → <strong>${orderAfter.status}</strong>`);
    if (orderBefore.paymentStatus !== orderAfter.paymentStatus)
      changed.push(`Payment: <strong>${orderBefore.paymentStatus || '—'}</strong> → <strong>${orderAfter.paymentStatus}</strong>`);
    if (changed.length === 0) return;

    const subject = `Your RecruiteMee order ${orderAfter.orderId} is now ${orderAfter.status}`;
    const attachmentsList = (orderAfter.attachments || []).map(
      (a) => `<a href="${a.url}">${a.originalName || a.filename || 'Attachment'}</a>`
    );

    const html = `
      <p>Hi,</p>
      <p>There’s an update on your <strong>${orderAfter.planName || orderAfter.service}</strong> order.</p>
      <p>Order ID: <strong>${orderAfter.orderId}</strong></p>
      <p>${changed.join('<br/>')}</p>
      ${attachmentsList.length ? `<p>Latest attachments:</p>${htmlList(attachmentsList)}` : ''}
      <p>— RecruiteMee Team</p>
    `;

    await sendMail({
      to: orderAfter.userEmail,
      subject,
      html,
      text: `Order ${orderAfter.orderId} update: ${changed.join(' | ').replace(/<[^>]*>/g, '')}`,
    });
  } catch (e) {
    console.warn('[mail status-change] failed:', e.message);
  }
}

async function notifyAttachment(order, fileObj) {
  try {
    const subject = `New delivery file for your order ${order.orderId}`;
    const html = `
      <p>Hi,</p>
      <p>We’ve added a new file to your order <strong>${order.orderId}</strong> (${order.planName || order.service}).</p>
      <p><a href="${fileObj.url}">${fileObj.originalName || fileObj.filename || 'Attachment'}</a></p>
      <p>Current status: <strong>${order.status}</strong></p>
      <p>— RecruiteMee Team</p>
    `;
    await sendMail({
      to: order.userEmail,
      subject,
      html,
      text: `New file uploaded for order ${order.orderId}: ${fileObj.url}`,
    });
  } catch (e) {
    console.warn('[mail attachment] failed:', e.message);
  }
}
// after: notifyAttachment()
async function sendPaymentConfirmation(order) {
  try {
    const subject = `Payment received for ${order.planName || 'Service'} (${order.orderId})`;
    await sendMail({
      to: order.userEmail,
      subject,
      html: `
        <p>Hi,</p>
        <p>Your payment for <strong>${order.planName || order.service}</strong> was successful.</p>
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        ${order.receiptUrl ? `<p>Receipt: <a href="${order.receiptUrl}">View Receipt</a></p>` : ''}
        <p>— RecruiteMee Team</p>
      `,
      text: subject,
    });

    if (ADMIN_EMAILS.length) {
      await sendMail({
        to: ADMIN_EMAILS[0],
        subject: `[Admin] ${subject}`,
        html: `<p><strong>Payment received</strong></p>
               <p>Order: ${order.orderId}</p>
               <p>User: ${order.userEmail}</p>
               <p>Service: ${order.planName || order.service}</p>`,
        text: subject,
      });
    }
  } catch (e) {
    console.warn('[mail payment-confirmation] failed:', e.message);
  }
}


/* -------------------------------- Routes --------------------------------- */
app.get('/', (_req, res) => res.json({ ok: true, name: 'RecruiteMee API', status: 'up' }));
app.get('/health', (_req, res) => res.json({ ok: true, status: 'up' }));
app.post('/auth/logout', (_req, res) => res.json({ ok: true, message: 'Logged out' }));

/* ----------------------- Registration (OTP disabled) ---------------------- */
app.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const { password, cpassword } = req.body;

    if (!name || !email || !password || !cpassword) {
      return res.status(400).json({ ok: false, message: 'Please fill all fields.' });
    }
    if (password !== cpassword) {
      return res.status(400).json({ ok: false, message: 'Passwords do not match.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters.' });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const isAdmin = ADMIN_EMAILS.includes(email);

    const referralCode = String(getReferralCode(req) || '').trim();
    let influencer = null;
    if (referralCode) {
      influencer = await Influencer.findOne({ referralCode }).lean();
    }

    const id = await generateUserId();
    const created = await User.create({
      id,
      name,
      email,
      password: hashed,
      role: isAdmin ? 'admin' : 'user',
      isVerified: true,
      influencerId: influencer ? influencer._id : null,
    });

    // Cleanup any old OTP/pending artifacts for this email.
    await Promise.all([
      PendingReg.deleteMany({ email }),
      EmailOtp.updateMany({ email, used: false }, { $set: { used: true } }),
    ]);

    // Credit influencer for registration immediately (OTP flow is disabled).
    if (created.influencerId) {
      try {
        await Influencer.findByIdAndUpdate(created.influencerId, {
          $inc: { "stats.usersReferred": 1 },
        });
      } catch (e) {
        console.warn('[influencer credit] register usersReferred', e.message);
      }
    }

    return res.status(201).json({
      ok: true,
      message: 'Registration successful. You can log in now.',
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Email already registered.' });
    }
    console.error('POST /register error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});


app.post('/auth/otp/send', async (_req, res) => {
  return res.status(410).json({
    ok: false,
    message: 'OTP verification is temporarily disabled.',
  });
});

app.post('/auth/otp/verify', async (_req, res) => {
  return res.status(410).json({
    ok: false,
    message: 'OTP verification is temporarily disabled.',
  });
});

/* ------------------------------- Login ---------------------------------- */
app.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, message: 'All fields are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid email or password' });

    if (!user.isVerified) {
      // OTP flow is currently disabled; upgrade legacy accounts on first login.
      user.isVerified = true;
      await user.save();
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, message: 'Invalid email or password' });

    const token = signJwt({ email: user.email, id: user.id, role: user.role }, '2h');
    return res.status(200).json({ ok: true, message: 'Login successful', token, user: safeUser(user) });
  } catch (err) {
    console.error('POST /login error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/* ------------------------------- Forgot ---------------------------------- */
app.post('/forgot', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ ok: false, message: 'Email is required' });

    const user = await User.findOne({ email }).select('_id email').lean();
    if (!user)
      return res.status(200).json({ ok: true, message: 'If an account exists, a reset link has been sent.' });

    await ResetToken.updateMany({ userId: user._id, used: false }, { $set: { used: true } });

    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    await ResetToken.create({ userId: user._id, tokenHash, expiresAt });

    const { html, text } = resetEmailTemplate({ appUrl: FE_URL, token: tokenPlain });
    const info = await sendMail({
      to: user.email,
      subject: 'Reset your RecruiteMee password',
      html,
      text,
    });

    return res.status(200).json({
      ok: true,
      message: 'If an account exists, a reset link has been sent.',
      ...(info?.previewUrl ? { devPreviewUrl: info.previewUrl } : {}),
    });
  } catch (err) {
    console.error('POST /forgot error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.post('/forgot/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ ok: false, message: 'Token and password are required' });
    if (password.length < 8)
      return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await ResetToken.findOne({ tokenHash }).lean();

    if (!reset || reset.used || (reset.expiresAt && reset.expiresAt < new Date())) {
      return res.status(400).json({ ok: false, message: 'Invalid or expired reset token' });
    }

    const user = await User.findById(reset.userId);
    if (!user) return res.status(400).json({ ok: false, message: 'Invalid or expired reset token' });

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    await user.save();

    await ResetToken.updateOne({ tokenHash }, { $set: { used: true } });
    await ResetToken.updateMany({ userId: user._id, used: false }, { $set: { used: true } });

    return res.status(200).json({ ok: true, message: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error('POST /forgot/reset error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/* --------- Resume: create + seed order + auto summary doc ---------------- */
// Save resume form → seed "resume_build" order + auto summary file
app.post('/resume', auth, async (req, res) => {
  try {
    const data = req.body || {};
    const ownerEmail = normalizeEmail(req.user?.email);
    if (!ownerEmail) return res.status(401).json({ ok: false, message: 'Unauthorized' });

    // validations (unchanged)
    if (
      !data.degreeLevel ||
      !data.majorPrimary ||
      !data.personal ||
      !data.personal.pid ||
      !data.personal.fullName ||
      !data.personal.email ||
      !data.personal.phone ||
      !data.skills ||
      !data.skills.techSkills ||
      !data.skills.softSkills ||
      !Array.isArray(data.edu) ||
      data.edu.length === 0 ||
      !data.edu[0].degree ||
      !data.edu[0].institution ||
      !data.edu[0].start
    ) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(data.targetRoles) || data.targetRoles.length === 0) {
      return res.status(400).json({ ok: false, message: 'Please select at least one target job role' });
    }
    if (data.targetRoles.length > 10) {
      return res.status(400).json({ ok: false, message: 'Too many target roles selected' });
    }

    data.personal.email = normalizeEmail(data.personal.email);
    const resume = await Resume.create({ ...data, ownerEmail });

    // pricing for build-from-scratch
    const desiredCurrency = pickCurrency(req.body.currency || req.query.currency || CURRENCY);
    const amount = AMOUNT_MAP[desiredCurrency]?.resume_build || 0;
    const isFree = amount <= 0;

    const orderId =
      'ORDER-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();

    const order = await Order.create({
      orderId,
      resumeId: resume._id,
      userEmail: ownerEmail,
      status: 'pending',
      paymentStatus: isFree ? 'paid' : 'unpaid', // ✅ important
      service: 'resume_build',
      planName: 'ATS-Optimized Resume (from Scratch)',
      description: 'Resume created from form',
      amount,
      currency: desiredCurrency,
      customerUploads: [],
      attachments: [],
      inputs: { targetRoles: Array.from(new Set(data.targetRoles)).slice(0, 10) },
    });

    // Auto-generate summary (PDF or TXT) and attach
    const summaryText = formatResumeDocText(data);
    let outName = `resume-form-${orderId}.pdf`;
    let outMime = 'application/pdf';
    let fileSize = 0;
    let pdfOk = false;

    try {
      const PDFDocument = require('pdfkit');
      if (USE_GRIDFS) {
        const docPdf = new PDFDocument({ margin: 50 });
        const up = gridfsBucket.openUploadStream(outName, { contentType: 'application/pdf' });
        docPdf.pipe(up);
        docPdf.fontSize(16).text('RecruiteMee — Resume Form Submission', { align: 'center' });
        docPdf.moveDown();
        docPdf.fontSize(11).text(summaryText, { align: 'left' });
        docPdf.end();
        await new Promise((resolve, reject) => {
          up.on('finish', () => { pdfOk = true; resolve(); });
          up.on('error', reject);
        });
      } else {
        const PDF = new PDFDocument({ margin: 50 });
        const outPath = path.join(UPLOAD_DIR, outName);
        const stream = fs.createWriteStream(outPath);
        PDF.pipe(stream);
        PDF.fontSize(16).text('RecruiteMee — Resume Form Submission', { align: 'center' });
        PDF.moveDown();
        PDF.fontSize(11).text(summaryText, { align: 'left' });
        PDF.end();
        await new Promise((resolve, reject) => {
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        fileSize = fs.statSync(outPath).size;
        pdfOk = true;
      }
    } catch {
      outName = `resume-form-${orderId}.txt`;
      outMime = 'text/plain';
      if (USE_GRIDFS) {
        const up = gridfsBucket.openUploadStream(outName, { contentType: 'text/plain' });
        up.end(Buffer.from(summaryText, 'utf8'));
        await new Promise((resolve, reject) => {
          up.on('finish', resolve);
          up.on('error', reject);
        });
      } else {
        const outPath = path.join(UPLOAD_DIR, outName);
        fs.writeFileSync(outPath, summaryText, 'utf8');
        fileSize = fs.statSync(outPath).size;
      }
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${outName}`;
    order.customerUploads.push({
      originalName: pdfOk ? 'Resume Form (auto-generated).pdf' : 'Resume Form (auto-generated).txt',
      filename: outName,
      url: fileUrl,
      mime: outMime,
      size: fileSize,
      uploadedAt: new Date(),
    });
    await order.save();

    // ✅ user email ONLY if already paid (free plan)
    if (order.paymentStatus === 'paid') {
      try {
        const subject = `We’ve received your order ${order.orderId} — ${order.planName}`;
        const link = `${FE_URL}/orders`;
        const html = `
          <p>Hi,</p>
          <p>Your resume form was saved and an order was created: <strong>${order.planName}</strong>.</p>
          <p><strong>Order ID:</strong> ${order.orderId}<br/>
             <strong>Amount:</strong> ${order.amount} ${String(order.currency || '').toUpperCase()}<br/>
             <strong>Payment:</strong> ${order.paymentStatus}</p>
          <p>Track your order: <a href="${link}">Your Orders</a></p>
          <p>— RecruiteMee Team</p>
        `;
        await sendMail({ to: order.userEmail, subject, html, text: `Order received (${order.orderId}).` });
      } catch (e) {
        console.warn('[mail order-submitted] /resume (paid-only) failed:', e.message);
      }
    }

    // influencer credit (unchanged)
    try {
      const user = await User.findOne({ email: ownerEmail });
      if (user?.influencerId && !order.influencerCredited) {
        await Influencer.findByIdAndUpdate(user.influencerId, {
          $inc: { "stats.orders": 1, balance: INF_ORDER_PRICE }
        });
        await Order.updateOne({ _id: order._id }, { $set: { influencerCredited: true } });
      }
    } catch (e) {
      console.warn('[influencer credit] /resume', e.message);
    }

    // (Admin alert kept as-is, optional)

    return res.status(201).json({ ok: true, message: 'Resume saved', id: resume._id, orderId });
  } catch (err) {
    console.error('POST /resume error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});


/* ---------------------------- Service Orders ------------------------------ */
// Create a service order (review/rewrite/build/linkedin) + upload
app.post('/orders/service', auth, upload.single('file'), async (req, res) => {
  try {
    const ownerEmail = normalizeEmail(req.user?.email);
    if (!ownerEmail) return res.status(401).json({ ok: false, message: 'Unauthorized' });

    const { service, description } = req.body || {};
    if (!service) return res.status(400).json({ ok: false, message: 'Service is required' });

    const svc = String(service).toLowerCase();
    const ALLOWED = new Set(['resume_review', 'resume_rewrite', 'resume_build', 'linkedin_opt']);
    if (!ALLOWED.has(svc)) {
      return res.status(400).json({ ok: false, message: 'Unknown service' });
    }

    // pricing (env-driven)
    const desiredCurrency = pickCurrency(req.body.currency || CURRENCY); // -> "inr" | "usd"
    const amountMap = AMOUNT_MAP[desiredCurrency] || {};
    const serviceAmount = Number(amountMap[svc] ?? 0);

    // ❗️Business rule: Resume Review cannot be free
    if (svc === 'resume_review' && !(serviceAmount > 0)) {
      return res.status(400).json({ ok: false, message: 'Resume Review must have a price configured' });
    }

    // “coming soon” gate
    if (svc === 'linkedin_opt') {
      return res.status(400).json({ ok: false, message: 'LinkedIn Optimization is coming soon' });
    }

    const planNameMap = {
      resume_review: 'Resume Review',
      resume_rewrite: 'ATS Resume – Rewrite',
      resume_build: 'ATS-Optimized Resume (from Scratch)',
      linkedin_opt: 'LinkedIn Optimization (Coming soon)',
    };

    // required files
    if (svc === 'resume_review' && !req.file) {
      return res.status(400).json({ ok: false, message: 'Resume file (PDF/DOC/DOCX) is required' });
    }
    if (svc === 'resume_rewrite' && !req.file) {
      return res.status(400).json({ ok: false, message: 'Upload your existing resume (PDF/DOC/DOCX) to rewrite' });
    }

    const orderId =
      'ORDER-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();

    const doc = {
      orderId,
      userEmail: ownerEmail,
      status: 'pending',
      paymentStatus: serviceAmount > 0 ? 'unpaid' : 'paid', // review should be >0, so 'unpaid'
      service: svc,
      planName: planNameMap[svc] || 'Service',
      description: String(description || '').slice(0, 300),
      inputs: {},
      customerUploads: [],
      attachments: [],
      amount: serviceAmount,
      currency: desiredCurrency, // store as 'inr' | 'usd'
    };

    // save uploaded file
    if (req.file && (svc === 'resume_review' || svc === 'resume_rewrite' || svc === 'resume_build')) {
      if (USE_GRIDFS) {
        const safe = makeSafeName(req.file.originalname || 'file');
        await gridfsSaveBuffer(safe, req.file.buffer, req.file.mimetype || 'application/octet-stream');
        doc.customerUploads.push({
          originalName: req.file.originalname,
          filename: safe,
          url: `${req.protocol}://${req.get('host')}/uploads/${safe}`,
          mime: req.file.mimetype,
          size: req.file.size,
          uploadedAt: new Date(),
        });
      } else {
        doc.customerUploads.push({
          originalName: req.file.originalname,
          filename: req.file.filename,
          url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
          mime: req.file.mimetype,
          size: req.file.size,
          uploadedAt: new Date(),
        });
      }
    }

    const order = await Order.create(doc);

    // email only if (rare) auto-paid service (not the case for resume_review)
    if (order.paymentStatus === 'paid') {
      try {
        const subject = `We’ve received your order ${order.orderId} — ${order.planName || 'Service'}`;
        const linkOrders = `${FE_URL}/orders`;
        const html = `
          <p>Hi,</p>
          <p>Your order <strong>${order.planName || order.service}</strong> has been created.</p>
          <p><strong>Order ID:</strong> ${order.orderId}<br/>
             <strong>Amount:</strong> ${order.amount} ${String(order.currency || '').toUpperCase()}<br/>
             <strong>Payment:</strong> ${order.paymentStatus}</p>
          <p>Track anytime: <a href="${linkOrders}">Your Orders</a></p>
          <p>— RecruiteMee Team</p>
        `;
        await sendMail({ to: order.userEmail, subject, html, text: `Order created (${order.orderId}).` });
      } catch (e) {
        console.warn('[mail order-created] /orders/service (paid-only) failed:', e.message);
      }
    }

    // ❌ NO influencer credit here. It happens only after successful payment.

    return res.status(201).json({
      ok: true,
      message: 'Order created',
      orderId: order.orderId,
      redirect: `${FE_URL}/checkout?orderId=${encodeURIComponent(order.orderId)}&created=1`,
    });
  } catch (err) {
    console.error('POST /orders/service error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});


app.get('/orders/:orderId/suggestions', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId }).lean();
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    const isOwner = order.userEmail === normalizeEmail(req.user?.email);
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ ok: false, message: 'Forbidden' });
    return res.json({ ok: true, reviewSuggestions: order.reviewSuggestions || '' });
  } catch (e) {
    console.error('GET /orders/:orderId/suggestions error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.get('/orders/history/:email', async (req, res) => {
  try {
    const email = normalizeEmail(req.params.email);
    if (!email) return res.status(400).json({ ok: false, message: 'Missing email in path' });

    const docs = await Order.find({ userEmail: email }).sort({ createdAt: -1 }).lean();

    const normalizeStatusV = (s = '') => {
      const x = String(s || '').toLowerCase();
      if (x === 'paid') return 'pending';
      if (!x) return 'pending';
      return s;
    };

    const orders = docs.map((o) => ({
      id: o.orderId,
      status: normalizeStatusV(o.status),
      paymentStatus: o.paymentStatus || 'unpaid',
      date: o.createdAt,
      service: o.service || null,
      planName: o.planName || null,
      description: o.description || '',
      amount: o.amount || 0,
      currency: (o.currency || DEFAULT_CURRENCY).toUpperCase(),
      invoiceUrl: o.invoiceUrl || o.receiptUrl || '',
      customerUploads: (o.customerUploads || []).map((f) => ({ name: f.originalName, url: f.url, size: f.size })),
      attachments: (o.attachments || []).map((a) => ({ name: a.originalName, filename: a.filename, url: a.url, uploadedAt: a.uploadedAt })),
      inputs: o.inputs || {},
      hasReviewSuggestions: !!(o.reviewSuggestions && o.reviewSuggestions.trim()),
    }));

    return res.status(200).json({ ok: true, orders });
  } catch (err) {
    console.error('GET /orders/history error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
// GET one order by orderId (owner or admin)
app.get('/orders/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId }).lean();
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    const requester = (req.user && req.user.email) ? req.user.email.toLowerCase() : '';
    const isOwner = requester && requester === (order.userEmail || '').toLowerCase();
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ ok: false, message: 'Forbidden' });

    // shape it like your frontend expects
    return res.json({
      ok: true,
      order: {
        id: order.orderId,
        orderId: order.orderId,
        planName: order.planName || order.service || 'Service',
        service: order.service || null,
        description: order.description || '',
        amount: order.amount || 0,
        currency: (order.currency || 'inr').toUpperCase(),
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'unpaid',
        receiptUrl: order.receiptUrl || '',
        invoiceUrl: order.invoiceUrl || '',
        createdAt: order.createdAt,
        attachments: (order.attachments || []).map(a => ({
          name: a.originalName, filename: a.filename, url: a.url, uploadedAt: a.uploadedAt
        })),
        customerUploads: (order.customerUploads || []).map(f => ({
          name: f.originalName, url: f.url, size: f.size
        })),
        inputs: order.inputs || {},
      }
    });
  } catch (e) {
    console.error('GET /orders/:orderId error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
// PATCH: switch order currency (unpaid orders only)
app.patch('/orders/:orderId/currency', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const desired = pickCurrency(req.body.currency || req.query.currency || DEFAULT_CURRENCY); // "inr"/"usd"

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    const requester = (req.user && req.user.email) ? req.user.email.toLowerCase() : '';
    const isOwner = requester && requester === (order.userEmail || '').toLowerCase();
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ ok: false, message: 'Forbidden' });

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ ok: false, message: 'Paid orders cannot be modified' });
    }

    // Map amount from env pricing for the service
    const svc = order.service || 'resume_build';
    const map = AMOUNT_MAP[desired] || {};
    const newAmount = Number(map[svc] || 0);

    order.currency = desired;           // "inr" | "usd"
    order.amount = newAmount;
    // invalidate any previous RZP order (to avoid currency mismatch)
    order.razorpayOrderId = '';
    order.razorpayPaymentId = '';
    order.razorpaySignature = '';
    await order.save();

    // shape like GET /orders/:orderId
    return res.json({
      ok: true,
      order: {
        id: order.orderId,
        orderId: order.orderId,
        planName: order.planName || order.service || 'Service',
        service: order.service || null,
        description: order.description || '',
        amount: order.amount || 0,
        currency: (order.currency || DEFAULT_CURRENCY).toUpperCase(),
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'unpaid',
        receiptUrl: order.receiptUrl || '',
        invoiceUrl: order.invoiceUrl || '',
        createdAt: order.createdAt,
        attachments: (order.attachments || []).map(a => ({
          name: a.originalName, filename: a.filename, url: a.url, uploadedAt: a.uploadedAt
        })),
        customerUploads: (order.customerUploads || []).map(f => ({
          name: f.originalName, url: f.url, size: f.size
        })),
        inputs: order.inputs || {},
      }
    });
  } catch (e) {
    console.error('PATCH /orders/:orderId/currency error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});



/* --------- Delete UNPAID order (owner or admin) -------------------------- */
/* --------- Delete UNPAID order (owner or admin) -------------------------- */
app.delete('/orders/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(401).json({ ok: false, message: 'Unauthorized' });

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    const isOwner = order.userEmail === email;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ ok: false, message: 'Forbidden' });
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ ok: false, message: 'Paid orders cannot be deleted' });
    }

    const filenames = (order.customerUploads || []).map(f => f.filename).filter(Boolean);

    /* ===================== STAGE 3: remove uploaded file(s) ===================== */
    if (USE_GRIDFS) {
      for (const fn of filenames) {
        try { await gridfsDeleteByFilename(fn); } catch (_) {}
      }
    } else {
      for (const fn of filenames) {
        const fp = path.join(UPLOAD_DIR, path.basename(fn));
        fs.promises.unlink(fp).catch(() => {});
      }
    }
    /* ========================================================================== */

    await Order.deleteOne({ _id: order._id });
    return res.json({ ok: true, message: 'Order deleted' });
  } catch (e) {
    console.error('DELETE /orders/:orderId error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
/* -------------------------- Payments (Razorpay) --------------------------- */
app.post('/payments/checkout', auth, async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ ok: false, message: 'orderId required' });
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    const requester = normalizeEmail(req.user?.email);
    if (order.userEmail !== requester && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }
    if (order.paymentStatus === 'paid' || !(order.amount > 0)) {
  return res.status(400).json({ ok: false, message: 'No payment required for this order' });
}
    if (!razorpay) return res.status(500).json({ ok: false, message: 'Razorpay not configured' });
    const currencyToSend = (order.currency || DEFAULT_CURRENCY).toUpperCase();
    const rpOrder = await razorpay.orders.create({
      amount: Math.round(Number(order.amount) * 100),
      currency: currencyToSend,
      receipt: order.orderId,
      notes: { orderId: order.orderId, service: order.service },
    });
    order.razorpayOrderId = rpOrder.id;
    await order.save();
    const enablePaypal = RAZORPAY_ENABLE_PAYPAL === '1' && currencyToSend === 'USD';
    const external = enablePaypal ? { wallets: ['paypal'] } : undefined;
    return res.json({
      ok: true,
      provider: 'razorpay',
      razorpay: {
        key: RAZORPAY_KEY_ID,
        order_id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: 'RecruiteMee',
        description: order.planName || 'Service payment',
        prefill: { email: order.userEmail },
        orderRef: order.orderId,
        ...(external ? { external } : {}),
      },
    });
  } catch (e) {
    const msg = e?.error?.description || e?.message || 'Failed to create checkout order';
    console.error('POST /payments/checkout error:', msg);
    return res.status(500).json({ ok: false, message: msg });
  }
});

app.post('/payments/verify', auth, async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ ok: false, message: 'Razorpay not configured' });
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ ok: false, message: 'Missing verification fields' });
    }
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    if (order.userEmail !== normalizeEmail(req.user?.email) && req.user?.role !== 'admin')
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ ok: false, message: 'Order mismatch' });
    }
    const hmac = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (hmac !== razorpay_signature) {
      return res.status(400).json({ ok: false, message: 'Signature verification failed' });
    }
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== order.razorpayOrderId) {
      return res.status(400).json({ ok: false, message: 'Payment not for this order' });
    }
    const expectedAmount = Math.round(Number(order.amount) * 100);
    const expectedCurrency = (order.currency || DEFAULT_CURRENCY).toUpperCase();
    if (payment.amount !== expectedAmount || payment.currency !== expectedCurrency) {
      return res.status(400).json({ ok: false, message: 'Amount/currency mismatch' });
    }
    if (!['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ ok: false, message: `Unexpected payment status: ${payment.status}` });
    }
    order.paymentStatus = 'paid';
    if (!order.status || order.status === 'pending') order.status = 'processing';
    order.razorpayOrderId = razorpay_order_id;
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    await order.save();
    await maybeCreditInfluencerForReview(order);
    try {
      const subject = `Payment received for ${order.planName || 'Service'} (${order.orderId})`;
      await sendMail({
        to: order.userEmail,
        subject,
        html: `
          <p>Hi,</p>
          <p>Your payment for <strong>${order.planName || order.service}</strong> was successful.</p>
          <p>Order ID: <strong>${order.orderId}</strong></p>
          ${order.receiptUrl ? `<p>Receipt: <a href="${order.receiptUrl}">View Receipt</a></p>` : ''}
          <p>— RecruiteMee Team</p>
        `,
        text: subject,
      });
      if (ADMIN_EMAILS.length) {
        await sendMail({
          to: ADMIN_EMAILS[0],
          subject: `[Admin] ${subject}`,
          html: `<p><strong>Payment received</strong></p><p>Order: ${order.orderId}</p><p>User: ${order.userEmail}</p><p>Service: ${order.planName || order.service}</p>`,
          text: subject,
        });
      }
    } catch (e) {
      console.warn('[mail verify] failed:', e.message);
    }
    return res.json({
      ok: true,
      orderId: order.orderId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      receiptUrl: order.receiptUrl || '',
    });
  } catch (e) {
    console.error('POST /payments/verify error:', e);
    return res.status(500).json({ ok: false, message: 'Verification failed' });
  }
});

/* ------------------------------ Queries API ------------------------------ */
app.post('/queries', async (req, res) => {
  try {
    const { pid, contactemail, contactmessage } = req.body || {};
    if (!pid || !contactemail || !contactmessage) {
      return res.status(400).json({ ok: false, message: 'All fields are required' });
    }
    await Query.create({
      pid: String(pid),
      email: normalizeEmail(contactemail),
      message: String(contactmessage),
    });
    return res
      .status(201)
      .json({ ok: true, message: 'Query created successfully.We will get back soon!' });
  } catch (err) {
    console.error('POST /queries error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
/* ------------------------------- Me Stats -------------------------------- */
app.get('/me/stats', auth, async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    const [resumesCount, pendingOrders, processingOrders, completedOrders, totalOrders] =
      await Promise.all([
        Resume.countDocuments({ ownerEmail: email }),
        Order.countDocuments({ userEmail: email, status: 'pending' }),
        Order.countDocuments({ userEmail: email, status: 'processing' }),
        Order.countDocuments({ userEmail: email, status: 'completed' }),
        Order.countDocuments({ userEmail: email }),
      ]);
    return res.status(200).json({
      ok: true,
      totals: { resumes: resumesCount, orders: totalOrders },
      orders: { pending: pendingOrders, processing: processingOrders, completed: completedOrders },
    });
  } catch (err) {
    console.error('GET /me/stats error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
/* --------------------------- Optional: Pricing ---------------------------- */
app.get('/pricing', (_req, res) => {
  const INR_FORM    = Number(process.env.AMT_RESUME_BUILD_FORM || process.env.AMT_RESUME_BUILD || 0);
  const USD_FORM    = Number(process.env.AMT_RESUME_BUILD_FORM_USD || process.env.AMT_RESUME_BUILD_USD || 0);
  const INR_REWRITE = Number(process.env.AMT_RESUME_REWRITE || 0);
  const USD_REWRITE = Number(process.env.AMT_RESUME_REWRITE_USD || 0);
  const INR_REVIEW  = Number(process.env.AMT_RESUME_REVIEW || 0);      // ✅ NEW
  const USD_REVIEW  = Number(process.env.AMT_RESUME_REVIEW_USD || 0);  // ✅ NEW

  const fmt = (inr, usd) =>
    (inr <= 0 && usd <= 0) ? 'Free' : `₹${inr} • $${usd}${usd > 0 ? '' : ''}`;

  res.json({
    ok: true,
    plans: [
      {
        id: 'resume_build',
        name: 'ATS-Optimized Resume (from Scratch)',
        priceDisplay: `₹${INR_FORM} • $${USD_FORM} (PayPal for USD)`,
        features: ['ATS-friendly formatting', 'Keyword enrichment', 'PDF/DOC export'],
      },
      {
        id: 'resume_rewrite',
        name: 'ATS Resume – Rewrite',
        priceDisplay: `₹${INR_REWRITE} • $${USD_REWRITE}`,
        features: ['Rewrite & optimize existing resume', 'Role-focused keywords', 'ATS formatting'],
      },
      {
        id: 'resume_review',
        name: 'Resume Review',
        priceDisplay: fmt(INR_REVIEW, USD_REVIEW), // ✅ env-driven, “Free” if 0
        features: ['Line-by-line feedback', 'Impact-focused suggestions', 'Tailored tips'],
      },
      {
        id: 'linkedin_opt',
        name: 'LinkedIn Optimization',
        priceDisplay: 'Coming soon',
        features: ['Headline & About revamp', 'Search-optimized keywords', 'Profile polish'],
      },
    ],
  });
});

/* ------------------------------- Admin API -------------------------------- */
app.get('/admin/users', auth, requireAdmin, async (req, res) => {
  try {
    const { q = '', page = 1, limit = 50, sort = '-createdAt' } = req.query;
    const find = {};
    if (q && String(q).trim()) {
      const esc = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(esc, 'i');
      find.$or = [{ name: regex }, { email: regex }, { id: regex }, { username: regex }];
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * lim;
    const [docs, total] = await Promise.all([
      User.find(find).sort(sort).skip(skip).limit(lim).lean(),
      User.countDocuments(find),
    ]);
    return res.json({ ok: true, page: pageNum, limit: lim, total, items: docs.map(safeUser) });
  } catch (e) {
    console.error('GET /admin/users error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
app.get('/admin/stats', auth, requireAdmin, async (_req, res) => {
  try {
    const [users, resumes, orders, pendingCt, processingCt, completedCt, failedCt] =
      await Promise.all([
        User.countDocuments(),
        Resume.countDocuments(),
        Order.countDocuments(),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'processing' }),
        Order.countDocuments({ status: 'completed' }),
        Order.countDocuments({ status: 'failed' }),
      ]);
    res.json({
      ok: true,
      users,
      resumes,
      orders,
      ordersByStatus: {
        pending: pendingCt,
        processing: processingCt,
        completed: completedCt,
        failed: failedCt,
      },
    });
  } catch (e) {
    console.error('GET /admin/stats error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});
app.get('/admin/orders', auth, requireAdmin, async (req, res) => {
  try {
    const { status, q, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const find = { paymentStatus: 'paid' };
    if (status) find.status = status;
    if (q) {
      const regex = new RegExp(String(q), 'i');
      find.$or = [{ orderId: regex }, { userEmail: regex }, { planName: regex }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Order.find(find).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Order.countDocuments(find),
    ]);
    res.json({ ok: true, page: Number(page), limit: Number(limit), total, items });
  } catch (e) {
    console.error('GET /admin/orders error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});
app.patch('/admin/orders/:orderId', auth, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const theUpdate = {};
    const { status, paymentStatus } = req.body || {};
    if (status) theUpdate.status = status;
    if (paymentStatus) theUpdate.paymentStatus = paymentStatus;
    const before = await Order.findOne({ orderId });
    if (!before) return res.status(404).json({ ok: false, message: 'Order not found' });
    const after = await Order.findOneAndUpdate({ orderId }, theUpdate, { new: true });
    res.json({ ok: true, message: 'Order updated', order: after });
    // notify via email (fire-and-forget)
    notifyStatusChange(before, after);
  } catch (e) {
    console.error('PATCH /admin/orders/:orderId error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});
app.post('/admin/orders/:orderId/attachments', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    if (!req.file) return res.status(400).json({ ok: false, message: 'Attachment file is required' });

    let fileObj;
    if (USE_GRIDFS) {
      const safe = makeSafeName(req.file.originalname || 'file');
      await gridfsSaveBuffer(safe, req.file.buffer, req.file.mimetype);
      fileObj = {
        originalName: req.file.originalname,
        filename: safe,
        url: `${req.protocol}://${req.get('host')}/uploads/${safe}`,
        uploadedBy: req.user.email,
        uploadedAt: new Date(),
      };
    } else {
      fileObj = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
        uploadedBy: req.user.email,
        uploadedAt: new Date(),
      };
    }

    order.attachments = order.attachments || [];
    order.attachments.push(fileObj);
    await order.save();
    notifyAttachment(order, fileObj);

    return res.json({ ok: true, message: 'Attachment uploaded', attachment: fileObj });
  } catch (e) {
    console.error('POST /admin/orders/:orderId/attachments error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.delete('/admin/orders/:orderId/attachments/:filename', auth, requireAdmin, async (req, res) => {
  try {
    const { orderId, filename } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    const safeName = path.basename(filename);
    const list = order.attachments || [];
    const idx = list.findIndex((a) => a.filename === safeName);
    if (idx === -1) return res.status(404).json({ ok: false, message: 'Attachment not found' });

    const [removed] = list.splice(idx, 1);
    order.attachments = list;
    await order.save();

    if (USE_GRIDFS) {
      await gridfsDeleteByFilename(safeName);
    } else {
      const filePath = path.join(UPLOAD_DIR, safeName);
      fs.promises.unlink(filePath).catch(() => {});
    }
    return res.json({ ok: true, message: 'Attachment deleted', filename: removed.filename });
  } catch (e) {
    console.error('DELETE /admin/orders/:orderId/attachments/:filename error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});


app.put('/admin/orders/:orderId/suggestions', auth, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const theText = String(req.body.text || '');
    const order = await Order.findOneAndUpdate(
      { orderId },
      { $set: { reviewSuggestions: theText } },
      { new: true }
    );
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    return res.json({ ok: true, message: 'Suggestions saved', reviewSuggestions: order.reviewSuggestions || '' });
  } catch (e) {
    console.error('PUT /admin/orders/:orderId/suggestions error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
// LIST contact queries
app.get('/admin/queries', auth, requireAdmin, async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 50,
      sort = '-createdAt', // createdAt desc by default
    } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * lim;
    const find = {};
    if (q && String(q).trim()) {
      const esc = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(esc, 'i');
      find.$or = [{ pid: regex }, { email: regex }, { message: regex }];
    }
    const [items, total] = await Promise.all([
      Query.find(find).sort(sort).skip(skip).limit(lim).lean(),
      Query.countDocuments(find),
    ]);
    return res.json({
      ok: true,
      page: pageNum,
      limit: lim,
      total,
      items, // contains _id, pid, email, message, createdAt
    });
  } catch (e) {
    console.error('GET /admin/queries error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
// (optional) delete a query
app.delete('/admin/queries/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Query.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Query not found' });
    return res.json({ ok: true, message: 'Query deleted' });
  } catch (e) {
    console.error('DELETE /admin/queries/:id error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
app.get('/admin/queries/:id', auth, requireAdmin, async (req, res) => {
  try {
    const doc = await Query.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Query not found' });
    return res.json({ ok: true, item: doc });
  } catch (e) {
    console.error('GET /admin/queries/:id', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
app.post('/admin/queries/:id/reply', auth, requireAdmin, async (req, res) => {
  try {
    const { subject = '', body = '', close = false } = req.body || {};
    if (!subject.trim() || !body.trim())
      return res.status(400).json({ ok: false, message: 'Subject and message are required' });
    const q = await Query.findById(req.params.id);
    if (!q) return res.status(404).json({ ok: false, message: 'Query not found' });
    const to = q.email;
    const by = req.user?.email || 'admin@system';
    let sendOk = true;
    let previewUrl = '';
    try {
      const html = `
        <p>Hi${q.pid ? ` (${escapeHtml(q.pid)})` : ''},</p>
        <p>${nl2br(body)}</p>
        <hr/>
        <p style="color:#555;font-size:12px">
          Re: your message to RecruiteMee<br/>
          Query ID: ${q._id}
        </p>`;
      const info = await sendMail({
        to,
        subject,
        html,
        text: body,
      });
      if (info?.previewUrl) previewUrl = info.previewUrl;
    } catch (e) {
      sendOk = false;
      console.warn('[mail reply] failed:', e.message);
    }
    q.replies = q.replies || [];
    q.replies.push({ at: new Date(), by, to, subject, body, sendOk, previewUrl });
    q.lastRepliedAt = new Date();
    if (close) q.status = 'closed';
    await q.save();

    return res.json({
      ok: true,
      message: sendOk ? 'Reply sent.' : 'Saved, but email could not be sent right now.',
      devPreviewUrl: previewUrl || '',
      item: q,
    });
  } catch (e) {
    console.error('POST /admin/queries/:id/reply', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
// Create influencer (admin sets credentials)
app.post('/admin/influencers', auth, requireAdmin, async (req, res) => {
  try {
    const { name, email: rawEmail, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ ok: false, message: 'Name and password are required' });
    }

    const email = rawEmail ? normalizeEmail(rawEmail) : `influencer_${name.replace(/\s+/g,'').toLowerCase()}@recruitemee.com`;

    // prevent duplicates
    const exists = await Influencer.findOne({ email });
    if (exists) return res.status(409).json({ ok: false, message: 'Email already exists for an influencer' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const referralCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    const referralLink = `${APP_URL.replace(/\/+$/,'')}/register?ref=${referralCode}`;

    const inf = await Influencer.create({
      name,
      email,
      password: hashed,
      plainPassword: password,
      referralCode,
      referralLink,
    });

    return res.status(201).json({ ok: true, influencer: inf });
  } catch (err) {
    console.error('POST /admin/influencers error:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});
// List influencers
app.get('/admin/influencers', auth, requireAdmin, async (_req, res) => {
  const infs = await Influencer.find().lean();
  return res.json({ ok: true, items: infs });
});
// Update password
app.patch('/admin/influencers/:id/password', auth, requireAdmin, async (req, res) => {
  const newPass = req.body.password;
  const hashed = await bcrypt.hash(newPass, SALT_ROUNDS);
  await Influencer.findByIdAndUpdate(req.params.id, { 
    password: hashed,
    plainPassword: newPass  // 👈 update both
  });
  return res.json({ ok: true, message: 'Password updated' });
});
// Delete influencer
app.delete('/admin/influencers/:id', auth, requireAdmin, async (req, res) => {
  await Influencer.findByIdAndDelete(req.params.id);
  return res.json({ ok: true, message: 'Influencer deleted' });
});
/* ----------------------- Admin – Manage Influencer Queries --------------- */
// List all queries
app.get("/admin/influencer-queries", auth, requireAdmin, async (_req, res) => {
  try {
    const items = await InfluencerQuery.find()
      .populate("influencerId", "name email")
      .sort({ createdAt: -1 });
    return res.json({ ok: true, items });
  } catch (err) {
    console.error("GET /admin/influencer-queries", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
// Reply / Update query
app.put("/admin/influencer-queries/:id/reply", auth, requireAdmin, async (req, res) => {
  try {
    const { reply, status } = req.body;
    const q = await InfluencerQuery.findById(req.params.id);
    if (!q) return res.status(404).json({ ok: false, message: "Query not found" });

    if (reply) {
      q.replies.push({ body: reply, by: req.user?.email || "admin" });
    }
    if (status) q.status = status;

    await q.save();
    return res.json({ ok: true, query: q });
  } catch (err) {
    console.error("PUT /admin/influencer-queries/:id/reply", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
app.post("/admin/influencers/fix-emails", auth, requireAdmin, async (_req, res) => {
  const infs = await Influencer.find();
  for (const inf of infs) {
    inf.email = normalizeEmail(inf.email);
    await inf.save();
  }
  return res.json({ ok: true, count: infs.length });
});
// List all payouts
app.get("/admin/influencer-payouts", auth, requireAdmin, async (_req, res) => {
  try {
    const items = await Payout.find().populate("influencerId", "name email").sort({ createdAt: -1 });
    return res.json({ ok: true, items });
  } catch (e) {
    console.error("GET /admin/influencer-payouts", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Update payout (mark paid/rejected/approved)
app.patch("/admin/influencer-payouts/:id", auth, requireAdmin, async (req, res) => {
  try {
    const { status, txnId } = req.body;
    const update = { status };
    if (status === "paid") update.processedAt = new Date();
    if (txnId) update.txnId = txnId;

    const payout = await Payout.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!payout) return res.status(404).json({ ok: false, message: "Not found" });

    return res.json({ ok: true, payout });
  } catch (e) {
    console.error("PATCH /admin/influencer-payouts/:id", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* --------------------------- DB Connect + Start --------------------------- */
async function bootstrapAdminIfNeeded() {
  if (NODE_ENV === 'production') return;
  try {
    if (ADMIN_EMAILS.length === 0) return;
    const email = ADMIN_EMAILS[0];
    const exists = await User.findOne({ email }).lean();
    if (exists) {
      console.log(`[bootstrap] Admin exists: ${email}`);
      return;
    }
    const id = await generateUserId();
    const hashed = await bcrypt.hash(ADMIN_BOOTSTRAP_PASSWORD, SALT_ROUNDS);
    await User.create({ id, name: 'Admin', email, password: hashed, role: 'admin', isVerified: true });
    console.log('───────────────────────────────────────────────');
    console.log(' Admin account created (DEV):');
    console.log(`   email: ${email}`);
    console.log(`   pass : ${ADMIN_BOOTSTRAP_PASSWORD}`);
    console.log('───────────────────────────────────────────────');
  } catch (e) {
    console.warn('[bootstrap] admin create failed:', e.message);
  }
}

async function connectMongo() {
  const options = {
    serverSelectionTimeoutMS: Number.isFinite(MONGO_SERVER_SELECTION_TIMEOUT_MS)
      ? MONGO_SERVER_SELECTION_TIMEOUT_MS
      : 10000,
  };

  try {
    await mongoose.connect(MONGO_URI, options);
    return;
  } catch (err) {
    const canFallback = Boolean(MONGO_URI_FALLBACK) && MONGO_URI_FALLBACK !== MONGO_URI;
    if (!canFallback) throw err;

    console.warn('[mongo] primary connection failed; trying MONGO_URI_FALLBACK');
    try {
      await mongoose.disconnect();
    } catch (_e) {
      // ignore disconnect errors before fallback attempt
    }
    await mongoose.connect(MONGO_URI_FALLBACK, options);
  }
}

connectMongo()
  .then(async () => {
    console.log('MongoDB connected');
    if (USE_GRIDFS) {
      gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      console.log('[gridfs] ready');
    }
    await bootstrapAdminIfNeeded();
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
