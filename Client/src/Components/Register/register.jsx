// src/Components/Register/register.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './register.css';
import { api } from '../../lib/api';

function getCookie(name) {
  const pair = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return pair ? decodeURIComponent(pair.split('=')[1]) : '';
}
function getParam(k) {
  return new URLSearchParams(window.location.search).get(k);
}

const Register = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState({ name: '', email: '', password: '', cpassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showCPass, setShowCPass] = useState(false);
  const [acceptTos, setAcceptTos] = useState(false);

  const [errMsg, setErrMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

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
      const { data } = await api.post('/register', body, headers ? { headers } : undefined);

      setUser({ name: '', email: '', password: '', cpassword: '' });
      setInfoMsg(data?.message || 'Registration successful. You can log in now.');
      alert(data?.message || 'Registration successful. You can log in now.');
      navigate('/login');
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message ||
        (err?.message?.toLowerCase().includes('network')
          ? 'Backend not reachable. Check API URL / server status.'
          : 'Registration failed. Try again.');
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

  return (
    <div className="reg-page">
      <div className="reg-layout container">
        <div className="reg-form-col">
          <div className="soft-card p-4 p-md-5">
            <h1 className="mb-1">RecruiteMee</h1>
            <p className="text-muted mb-4">Create your account to build ATS-optimized resumes.</p>

            {errMsg && <div className="alert alert-danger py-2">{errMsg}</div>}
            {infoMsg && <div className="alert alert-info py-2">{infoMsg}</div>}

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
