// Client/src/Components/Navbar/nav.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSessionUser } from '../../lib/session';
import './nav.css';

const Nav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const u = getSessionUser();
  const authed = !!sessionStorage.getItem('token');

  const onLogOut = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/home'); // back to landing page
  };

  const common = [
    { path: '/home', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' }
  ];

  const authedOnly = [
    { path: '/createresume', label: 'Create Resume' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/checkout', label: 'Checkout' },
    { path: '/orders', label: 'Orders' },
    { path: '/profile', label: 'Profile' },
  ];

  const links = [...common, ...(authed ? authedOnly : [])];

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-gradient w-100 shadow-sm sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/home" aria-label="RecruiteMee, go to Home">
          <span className="brand-dot" aria-hidden="true" />
          <span>RecruiteMee</span>
        </Link>

        <button
          className="navbar-toggler rounded-3"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMain"
          aria-controls="navbarMain"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarMain">
          <ul className="navbar-nav ms-auto align-items-md-center gap-md-3 py-2 py-md-0">
            {links.map(({ path, label }) => {
              const active = location.pathname === path;
              return (
                <li className="nav-item" key={path}>
                  <Link
                    to={path}
                    className={`nav-link ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}

            {u?.role === 'admin' && authed && (
              <li className="nav-item">
                <a className="nav-link" href="/admin">Admin</a>
              </li>
            )}

            {authed ? (
              <li className="nav-item mt-2 mt-md-0">
                <button className="btn btn-outline-light ms-md-2 rounded-pill nav-btn" type="button" onClick={onLogOut}>
                  <span className="text-white">Logout</span>
                </button>
              </li>
            ) : (
              <>
                <li className="nav-item mt-2 mt-md-0">
                  <Link className="btn btn-outline-light ms-md-2 rounded-pill nav-btn" to="/login">
                    <span className="text-white">Login</span>
                  </Link>
                </li>
                <li className="nav-item mt-2 mt-md-0">
                  <Link className="btn btn-primary ms-md-2 rounded-pill nav-btn" to="/register">Sign up</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
