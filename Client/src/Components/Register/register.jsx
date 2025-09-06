// src/Components/Register/register.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './register.css';
import { api } from '../../lib/api';

const COOLDOWN_DEFAULT = 45; // fallback if server doesn't send retryAfter

function getCookie(name) {
  const pair = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return pair ? decodeURIComponent(pair.split('=')[1]) : '';
}
function getParam(k) {
  return new URLSearchParams(window.location.search).get(k);
}

const Register = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState('form'); // 'form' | 'otp'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const [user, setUser] = useState({ name: '', email: '', password: '', cpassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showCPass, setShowCPass] = useState(false);
  const [acceptTos, setAcceptTos] = useState(false);

  const [errMsg, setErrMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // resend cooldown
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldown]);

  // Capture ?ref to localStorage once
  useEffect(() => {
    const urlRef = getParam('ref');
    if (urlRef) localStorage.setItem('ref', urlRef);
  }, []);

  const passwordsMatch = useMemo(
    () => user.password.length > 0 && user.password === user.cpassword,
    [user.password, user.cpassword]
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const onRegisterUser = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setInfoMsg('');
    setPreviewUrl('');

    const payload = {
      name: user.name.trim(),
      email: user.email.trim().toLowerCase(),
      password: user.password,
      cpassword: user.cpassword,
    };

    if (!payload.name || !payload.email || !payload.password || !payload.cpassword) {
      setErrMsg('Please fill all fields.');
      return;
    }
    if (!passwordsMatch) {
      setErrMsg('Passwords do not match.');
      return;
    }
    if (!acceptTos) {
      setErrMsg('Please accept the Terms to continue.');
      return;
    }

    // Gather referral code from URL, cookie, or localStorage
    const referralCode =
      getParam('ref') ||
      getCookie('ref') ||
      localStorage.getItem('ref') ||
      '';

    // Put ref into body as "referralCode" (backend reads it)
    const body = { ...payload, ...(referralCode ? { referralCode } : {}) };

    // Optional header support (NOT required by backend)
    const headers = referralCode ? { 'X-Ref': referralCode } : undefined;

    try {
      setSubmitting(true);

      // 🔧 Single, clean call (no duplicate pre-call, no undefined headers)
      const { data } = await api.post('/register', body, headers ? { headers } : undefined);

      // move to OTP step regardless of email send outcome
      setOtpEmail(payload.email);
      setPhase('otp');
      setUser({ name: '', email: '', password: '', cpassword: '' });

      if (data?.devPreviewUrl) setPreviewUrl(data.devPreviewUrl);
      setInfoMsg(
        data?.canResend
          ? 'Account created, but email could not be sent automatically — tap “Resend code”.'
          : (data?.message || 'We sent a 6-digit code to your email.')
      );

      // start cooldown (server may include retryAfter)
      const retryAfter = Number(data?.retryAfter || COOLDOWN_DEFAULT);
      if (!Number.isNaN(retryAfter) && retryAfter > 0) setCooldown(retryAfter);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || 'Registration failed. Try again.';
      if (status === 409) {
        alert('Email already registered. Please log in.');
        navigate('/login');
        return;
      }
      setErrMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setErrMsg('');
    setInfoMsg('');
    setPreviewUrl('');
    try {
      setSubmitting(true);
      const { data } = await api.post('/auth/otp/send', { email: otpEmail });
      if (data?.devPreviewUrl) setPreviewUrl(data.devPreviewUrl);

      // server always 200; it may tell us to wait via cooldown=true
      if (data?.cooldown && data?.retryAfter) {
        setCooldown(Number(data.retryAfter) || COOLDOWN_DEFAULT);
      } else if (typeof data?.retryAfter === 'number') {
        setCooldown(Number(data.retryAfter));
      } else {
        setCooldown(COOLDOWN_DEFAULT);
      }

      setInfoMsg(data?.message || 'Code resent. Check your inbox (and spam).');
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.message?.toLowerCase().includes('network')
          ? 'Network error. Please check your connection.'
          : 'Failed to resend code. Try again in a moment.');
      setErrMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setInfoMsg('');

    const clean = otpCode.replace(/\D/g, '').trim();
    if (!clean) {
      setErrMsg('Enter the 6-digit code.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await api.post('/auth/otp/verify', { email: otpEmail, code: clean });
      alert(data?.message || 'Email verified. Please log in.');
      navigate('/login');
    } catch (e2) {
      setErrMsg(e2?.response?.data?.message || 'Verification failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetToForm = () => {
    setPhase('form');
    setOtpEmail('');
    setOtpCode('');
    setErrMsg('');
    setInfoMsg('');
    setPreviewUrl('');
    setCooldown(0);
  };

  return (
    <div className="reg-page">
      <div className="reg-layout container">
        {/* Left: Form / OTP */}
        <div className="reg-form-col">
          <div className="soft-card p-4 p-md-5">
            <h1 className="mb-1">RecruiteMee</h1>
            <p className="text-muted mb-4">
              {phase === 'form'
                ? 'Create your account to build ATS-optimized resumes.'
                : `We emailed a 6-digit code to ${otpEmail}.`}
            </p>

            {errMsg && <div className="alert alert-danger py-2">{errMsg}</div>}
            {infoMsg && <div className="alert alert-info py-2">{infoMsg}</div>}
            {previewUrl && (
              <div className="alert alert-secondary py-2">
                Dev email preview: <a href={previewUrl} target="_blank" rel="noreferrer">Open</a>
              </div>
            )}

            {phase === 'form' ? (
              <Form className="register-form" onSubmit={onRegisterUser} noValidate>
                <h3 className="h4 mb-3">Register</h3>

                <Form.Group className="mb-3" controlId="formName">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your name"
                    name="name"
                    value={user.name}
                    onChange={onChange}
                    required
                    disabled={submitting}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="name@example.com"
                    name="email"
                    autoComplete="email"
                    value={user.email}
                    onChange={onChange}
                    required
                    disabled={submitting}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formPassword">
                  <Form.Label>Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showPass ? 'text' : 'password'}
                      placeholder="Enter your password"
                      name="password"
                      autoComplete="new-password"
                      value={user.password}
                      onChange={onChange}
                      required
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="toggle-pass"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPass((s) => !s)}
                      disabled={submitting}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </Form.Group>

                <Form.Group className="mb-2" controlId="formCPassword">
                  <Form.Label>Confirm Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showCPass ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      name="cpassword"
                      autoComplete="new-password"
                      value={user.cpassword}
                      onChange={onChange}
                      isInvalid={user.cpassword.length > 0 && !passwordsMatch}
                      required
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="toggle-pass"
                      aria-label={showCPass ? 'Hide password' : 'Show password'}
                      onClick={() => setShowCPass((s) => !s)}
                      disabled={submitting}
                    >
                      {showCPass ? '🙈' : '👁️'}
                    </button>
                    <Form.Control.Feedback type="invalid">Passwords do not match.</Form.Control.Feedback>
                  </div>
                </Form.Group>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <input
                    id="tos"
                    type="checkbox"
                    className="form-check-input"
                    checked={acceptTos}
                    onChange={(e) => setAcceptTos(e.target.checked)}
                    disabled={submitting}
                  />
                  <label htmlFor="tos" className="form-check-label">
                    I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
                  </label>
                </div>

                <Button variant="primary" type="submit" disabled={submitting} className="w-100 mb-3">
                  {submitting ? (<><Spinner animation="border" size="sm" className="me-2" /> Creating account…</>) : ('Register')}
                </Button>

                <div className="text-center small">
                  Already have an account? <Link to="/login">Login</Link>
                </div>
              </Form>
            ) : (
              <Form onSubmit={onVerify} noValidate>
                <h3 className="h4 mb-3">Verify your email</h3>
                <Form.Group className="mb-3" controlId="formOtp">
                  <Form.Label>Enter 6-digit code</Form.Label>
                  <Form.Control
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={submitting}
                  />
                </Form.Group>

                <Button variant="primary" type="submit" disabled={submitting} className="w-100 mb-2">
                  {submitting ? (<><Spinner animation="border" size="sm" className="me-2" /> Verifying…</>) : ('Verify & Continue')}
                </Button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    className="btn btn-link"
                    disabled={submitting || cooldown > 0}
                    onClick={onResend}
                  >
                    {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                  </button>
                  <span className="text-muted"> · </span>
                  <button type="button" className="btn btn-link" disabled={submitting} onClick={resetToForm}>
                    Change email
                  </button>
                </div>
              </Form>
            )}
          </div>
        </div>

        {/* Right: Carousel (optional assets) */}
        <div className="reg-carousel-col">
          <div className="soft-card p-0 overflow-hidden">
            <div
              id="registerCarousel"
              className="carousel slide auth-carousel"
              data-bs-ride="carousel"
              data-bs-interval="3000"
            >
              <div className="carousel-indicators custom-indicators">
                {[0,1,2,3,4,5].map(i => (
                  <button
                    key={i}
                    type="button"
                    data-bs-target="#registerCarousel"
                    data-bs-slide-to={i}
                    className={`bg-dark ${i === 0 ? 'active' : ''}`}
                    aria-current={i === 0 ? 'true' : undefined}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>

              <div className="carousel-inner">
                {['image1.png','image2.png','image3.png','image4.png','image5.png','image6.png'].map((src, idx) => (
                  <div key={src} className={`carousel-item ${idx === 0 ? 'active' : ''}`}>
                    <img src={`/register/${src}`} className="d-block w-100" alt={`Slide ${idx + 1}`} />
                    <div className="carousel-caption d-none d-md-block">
                      <h5>Grow with RecruiteMee</h5>
                      <p>ATS-friendly resumes. Cleaner profiles. Faster shortlists.</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="carousel-control-prev" type="button" data-bs-target="#registerCarousel" data-bs-slide="prev">
                <span className="carousel-control-prev-icon" aria-hidden="true" />
                <span className="visually-hidden">Previous</span>
              </button>
              <button className="carousel-control-next" type="button" data-bs-target="#registerCarousel" data-bs-slide="next">
                <span className="carousel-control-next-icon" aria-hidden="true" />
                <span className="visually-hidden">Next</span>
              </button>
            </div>
          </div>

          <div className="soft-card trust-card mt-3">
            <div className="d-flex align-items-center gap-3">
              <div className="trust-dot" />
              <div>
                <div className="fw-semibold">Privacy first</div>
                <small className="text-muted">We only use your data to create your resume.</small>
              </div>
            </div>
          </div>
        </div>
      </div>      
    </div>
  );
};

export default Register;
