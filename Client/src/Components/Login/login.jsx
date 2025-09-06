import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './login.css';
import { api } from '../../lib/api';

const Login = () => {
  const [user, setUser] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const navigate = useNavigate();

  const onLogUser = async (e) => {
    e.preventDefault();
    setErrMsg('');

    const payload = {
      email: user.email.trim().toLowerCase(),
      password: user.password,
    };

    if (!payload.email || !payload.password) {
      setErrMsg('Please enter email and password');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await api.post('/login', payload);

      sessionStorage.setItem('token', data.token);
      const minimalUser = {
        id: data.user?.id ?? '',
        email: (data.user?.email ?? '').toLowerCase(),
        name: data.user?.name ?? '',
        role: data.user?.role ?? 'user',
      };
      sessionStorage.setItem('user', JSON.stringify(minimalUser));

      setUser({ email: '', password: '' });

      console.log(data.message || 'Login successful');
    navigate('/home', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setErrMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="log-page">
      <div className="log-layout container">
        {/* Left: Form */}
        <div className="log-form-col">
          <div className="soft-card p-4 p-md-5">
            <h1 className="mb-1">RecruiteMee</h1>
            <p className="text-muted mb-4">Log in to build and manage your ATS-optimized resumes.</p>

            {errMsg && (
              <div className="alert alert-danger py-2" role="alert">
                {errMsg}
              </div>
            )}

            <Form className="register-form" onSubmit={onLogUser} noValidate>
              <h3 className="h4 mb-3">Login</h3>

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
                />
              </Form.Group>

              <Form.Group className="mb-2" controlId="formPassword">
                <Form.Label>Password</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    name="password"
                    autoComplete="current-password"
                    value={user.password}
                    onChange={onChange}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPass((s) => !s)}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </Form.Group>

              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="rememberCheck" />
                  <label className="form-check-label" htmlFor="rememberCheck">Remember me</label>
                </div>
                <Link to="/forgot" className="small">Forgot password?</Link>
              </div>

              <Button variant="primary" type="submit" disabled={submitting} className="w-100 mb-3">
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" /> Logging in…
                  </>
                ) : ('Login')}
              </Button>

              <div className="text-center small">
                New here? <Link to="/register">Create an account</Link>
              </div>
            </Form>
          </div>
        </div>

        {/* Right: Carousel (images in /public/login/) */}
        <div className="log-carousel-col">
          <div className="soft-card p-0 overflow-hidden">
           <div id="loginCarousel" className="carousel slide auth-carousel" data-bs-ride="carousel" data-bs-interval="3000">
              <div className="carousel-indicators custom-indicators">
                {[0,1,2,3,4,5].map(i => (
                  <button
                    key={i}
                    type="button"
                    data-bs-target="#loginCarousel"
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
                    <img src={`/login/${src}`} className="d-block w-100" alt={`Slide ${idx + 1}`} />
                    <div className="carousel-caption d-none d-md-block">
                      <h5>Get Shortlisted</h5>
                      <p>ATS-friendly resumes that recruiters love.</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="carousel-control-prev" type="button" data-bs-target="#loginCarousel" data-bs-slide="prev">
                <span className="carousel-control-prev-icon" aria-hidden="true" />
                <span className="visually-hidden">Previous</span>
              </button>
              <button className="carousel-control-next" type="button" data-bs-target="#loginCarousel" data-bs-slide="next">
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

export default Login;
