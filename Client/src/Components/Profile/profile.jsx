// Client/src/Components/Profile/profile.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../Navbar/nav.jsx';
import { api } from '../../lib/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './profile.css';

const Profile = () => {
  const [puser, setUser] = useState({ id: '', email: '', name: '' });
  const [stats, setStats] = useState({
    totals: { resumes: 0, orders: 0 },
    orders: { pending: 0, completed: 0 },
  });
  const navigate = useNavigate();

  // read once from sessionStorage
  const storedUser = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  useEffect(() => {
    setUser({
      id: storedUser.id || '',
      email: storedUser.email || '',
      name: storedUser.name || ''
    });
  }, [storedUser]);

  // fetch live stats (orders)
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    (async () => {
      try {
        const { data } = await api.get('/me/stats');
        if (data?.ok) setStats(data);
      } catch {
        // ignore for now (could show toast)
      }
    })();
  }, [navigate]);

  const onCopyId = async () => {
    try {
      await navigator.clipboard.writeText(puser.id || '');
      alert('Profile ID copied!');
    } catch {
      alert('Unable to copy Profile ID.');
    }
  };

  return (
    <div className="profile-page">
      <Navbar />

      <div className="container py-5 d-flex justify-content-center">
        <div className="profile-card soft-card shadow-lg">
          <div className="profile-cover" />

          <div className="profile-header text-center">
            <div className="avatar-wrap">
              <img src="/avatar/default.svg" alt="User avatar" className="profile-avatar" />
            </div>

            <h2 className="mt-3 mb-1">{puser.name || 'Your Name'}</h2>
            <p className="text-muted mb-2">{puser.email || 'email@example.com'}</p>

            <div className="d-flex flex-wrap justify-content-center gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={onCopyId}>Copy ID</button>
              <Link to="/createresume" className="btn btn-sm btn-primary">Create Resume</Link>
              <Link to="/orders" className="btn btn-sm btn-outline-primary">View Orders</Link>
            </div>
          </div>

          <div className="profile-body mt-4">
            <div className="row g-3">
              <div className="col-12">
                <div className="info-item">
                  <span className="label">Profile ID</span>
                  <span className="value">{puser.id || '—'}</span>
                </div>
              </div>
            </div>

            <div className="stats-strip mt-4">
              <div className="stat">
                <div className="stat-num">{stats?.orders?.pending ?? 0}</div>
                <div className="stat-label">Pending Orders</div>
              </div>
              <div className="stat">
                <div className="stat-num">{stats?.orders?.completed ?? 0}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>

            {/* Optional: show totals if you want */}
            {/* <div className="mt-3 text-center text-muted small">
              Total Orders: {stats?.totals?.orders ?? 0}
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
