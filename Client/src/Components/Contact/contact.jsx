// Client/src/Components/Contact/contact.jsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Nav from '../Navbar/nav.jsx';
// ⛔ remove SiteFooter import here
import './contact.css';

const Contact = () => {
  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [contact, setContact] = useState({
    pid: sessionUser.id || '',
    contactemail: sessionUser.email || '',
    contactmessage: ''
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setContact((c) => ({ ...c, [name]: value }));
  };

  const getQueries = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post('https://resumerepo.onrender.com/queries', contact);
      setContact({
        pid: sessionUser.id || '',
        contactemail: sessionUser.email || '',
        contactmessage: ''
      });
      alert(data.message || 'We have received your query and will get back to you ASAP.');
    } catch (err) {
      alert(err?.response?.data?.message || 'Error submitting your query.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <Nav />

      {/* Header */}
      <header className="contact-hero">
        <div className="container py-5">
          <h1 className="text-white fw-bold mb-2">Contact Us</h1>
          <p className="text-white-50 mb-0">Have a question? We’ll reply within one business day.</p>
        </div>
      </header>

      {/* Main */}
      <main className="container my-5">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card soft-card border-0">
              <div className="card-body p-4 p-md-5">
                <form className="w-100" onSubmit={getQueries}>
                  <div className="mb-3">
                    <label htmlFor="pid" className="form-label">Profile ID</label>
                    <input
                      type="text"
                      className="form-control"
                      id="pid"
                      name="pid"
                      value={contact.pid}
                      onChange={onChange}
                      placeholder="Your profile ID"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="contactemail" className="form-label">Email address</label>
                    <input
                      type="email"
                      className="form-control"
                      id="contactemail"
                      name="contactemail"
                      value={contact.contactemail}
                      onChange={onChange}
                      placeholder="name@example.com"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="contactmessage" className="form-label">Message</label>
                    <textarea
                      className="form-control"
                      id="contactmessage"
                      rows="3"
                      name="contactmessage"
                      value={contact.contactmessage}
                      onChange={onChange}
                      placeholder="Tell us how we can help…"
                      required
                    ></textarea>
                  </div>

                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="reset"
                      onClick={() => setContact({
                        pid: sessionUser.id || '',
                        contactemail: sessionUser.email || '',
                        contactmessage: ''
                      })}
                      className="btn btn-outline-secondary"
                      disabled={submitting}
                    >
                      Reset
                    </button>
                    <button type="submit" className="btn btn-primary px-4" disabled={submitting}>
                      {submitting ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Highlights / Trust */}
          <div className="col-lg-5">
            <div className="card border-0 highlight-card mb-3">
              <div className="card-body">
                <h5 className="mb-1">Why choose us?</h5>
                <ul className="mb-0 text-muted">
                  <li>ATS-optimized formatting and keywords</li>
                  <li>Tailored to each job description</li>
                  <li>Fast turnaround & clear feedback</li>
                </ul>
              </div>
            </div>
            <div className="card border-0 highlight-card">
              <div className="card-body">
                <h5 className="mb-1">Need resume help now?</h5>
                <p className="text-muted mb-3">
                  Share your current resume & target role. We’ll suggest improvements.
                </p>
                <div className="d-flex gap-2">
                  <Link to="/createresume" className="btn btn-accent">Create Resume</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-5">
          <div className="card border-0 shadow-sm p-4 p-md-5 cta-card">
            <h3 className="fw-bold mb-2 text-white">Ready to get shortlisted?</h3>
            <p className="text-muted mb-3">
              Create your resume now—optimize for ATS and stand out to recruiters.
            </p>
            <Link to="/createresume" className="btn btn-primary rounded-pill px-4">
              Start Building
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
