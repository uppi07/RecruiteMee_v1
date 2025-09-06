// src/Components/Forgot/forgot.jsx
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './forgot.css';
import { api } from '../../lib/api';  // <-- use shared axios instance

const Forgot = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token'); // if present, show reset form
  const mode = useMemo(() => (token ? 'reset' : 'request'), [token]);

  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showCPass, setShowCPass] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(''); // dev email preview link

  const [form, setForm] = useState({ email: '', password: '', cpassword: '' });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const passwordsMatch = form.password.length > 0 && form.password === form.cpassword;
  const strongEnough = form.password.length >= 8;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrMsg('');

    try {
      setSubmitting(true);

      if (mode === 'request') {
        const email = form.email.trim().toLowerCase();
        if (!email) {
          setErrMsg('Please enter your email.');
          return;
        }
        // request reset link
        const { data } = await api.post('/forgot', { email });

        if (data.devPreviewUrl) {
          setPreviewUrl(data.devPreviewUrl);
          // open preview in a new tab for convenience (dev only)
          window.open(data.devPreviewUrl, '_blank', 'noopener,noreferrer');
        }

        alert(data.message || 'If an account exists, a reset link has been sent.');
        setForm({ email: '', password: '', cpassword: '' });
        navigate('/'); // or stay here if you prefer
      } else {
        // reset with token
        if (!strongEnough) {
          setErrMsg('Password must be at least 8 characters.');
          return;
        }
        if (!passwordsMatch) {
          setErrMsg('Passwords do not match.');
          return;
        }

        const payload = { token, password: form.password };
        const { data } = await api.post('/forgot/reset', payload);

        alert(data.message || 'Password updated. You can now log in.');
        setForm({ email: '', password: '', cpassword: '' });
        navigate('/');
      }
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fr-page">
      <div className="fr-layout container">
        {/* Left: Form */}
        <div className="fr-form-col">
          <div className="soft-card p-4 p-md-5">
            <h1 className="mb-1">Resume Creator</h1>
            <p className="text-muted mb-4">
              {mode === 'request'
                ? 'Request a password reset link via email.'
                : 'Set a new password for your account.'}
            </p>

            {errMsg && <div className="alert alert-danger py-2">{errMsg}</div>}

            {previewUrl && (
              <div className="alert alert-info py-2">
                Email preview (dev):{' '}
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  Open preview
                </a>
              </div>
            )}

            <Form onSubmit={onSubmit} noValidate>
              <h3 className="h4 mb-3">
                {mode === 'request' ? 'Reset Password' : 'Set New Password'}
              </h3>

              {mode === 'request' ? (
                <Form.Group className="mb-3" controlId="formEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="name@example.com"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={onChange}
                    required
                    disabled={submitting}
                  />
                </Form.Group>
              ) : (
                <>
                  <Form.Group className="mb-3" controlId="formPassword">
                    <Form.Label>New Password</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPass ? 'text' : 'password'}
                        placeholder="Enter a strong password"
                        name="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={onChange}
                        required
                        isInvalid={form.password.length > 0 && !strongEnough}
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
                      <Form.Control.Feedback type="invalid">
                        Minimum 8 characters.
                      </Form.Control.Feedback>
                    </div>
                    <div className="small text-muted mt-1">
                      Use at least 8 characters. Add numbers & symbols for extra strength.
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formCPassword">
                    <Form.Label>Confirm Password</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showCPass ? 'text' : 'password'}
                        placeholder="Re-enter your password"
                        name="cpassword"
                        autoComplete="new-password"
                        value={form.cpassword}
                        onChange={onChange}
                        required
                        isInvalid={form.cpassword.length > 0 && !passwordsMatch}
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
                      <Form.Control.Feedback type="invalid">
                        Passwords do not match.
                      </Form.Control.Feedback>
                    </div>
                  </Form.Group>
                </>
              )}

              <Button variant="primary" type="submit" disabled={submitting} className="w-100 mb-3">
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {mode === 'request' ? 'Sending link…' : 'Updating…'}
                  </>
                ) : mode === 'request' ? (
                  'Send Reset Link'
                ) : (
                  'Update Password'
                )}
              </Button>

              <div className="text-center small">
                {mode === 'request' ? (
                  <>
                    New customer? <Link to="/register">Register</Link> &nbsp;·&nbsp;
                    Already have an account? <Link to="/">Login</Link>
                  </>
                ) : (
                  <>Having trouble? <Link to="/forgot">Request a new link</Link></>
                )}
              </div>
            </Form>
          </div>
        </div>

        {/* Right: Carousel (unique ID to avoid conflicts) */}
        <div className="log-carousel-col">
          <div className="soft-card p-0 overflow-hidden">
            <div id="forgotCarousel" className="carousel slide" data-bs-ride="carousel" data-bs-interval="3000">
              <div className="carousel-indicators custom-indicators">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    data-bs-target="#forgotCarousel"
                    data-bs-slide-to={i}
                    className={`bg-dark ${i === 0 ? 'active' : ''}`}
                    aria-current={i === 0 ? 'true' : undefined}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>

              <div className="carousel-inner">
                {['image1.png', 'image2.png', 'image3.png', 'image4.png', 'image5.png', 'image6.png'].map(
                  (src, idx) => (
                    <div key={src} className={`carousel-item ${idx === 0 ? 'active' : ''}`}>
                      <img src={`/login/${src}`} className="d-block w-100" alt={`Slide ${idx + 1}`} />
                      <div className="carousel-caption d-none d-md-block">
                        <h5>Get Shortlisted</h5>
                        <p>ATS-friendly resumes that recruiters love.</p>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button className="carousel-control-prev" type="button" data-bs-target="#forgotCarousel" data-bs-slide="prev">
                <span className="carousel-control-prev-icon" aria-hidden="true" />
                <span className="visually-hidden">Previous</span>
              </button>
              <button className="carousel-control-next" type="button" data-bs-target="#forgotCarousel" data-bs-slide="next">
                <span className="carousel-control-next-icon" aria-hidden="true" />
                <span className="visually-hidden">Next</span>
              </button>
            </div>
          </div>

          <div className="soft-card trust-card mt-3">
            <div className="d-flex align-items-center gap-3">
              <div className="trust-dot" />
              <div>
                <div className="fw-semibold">Secure by design</div>
                <small className="text-muted">We never store your password. Sessions live in your browser.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forgot;
