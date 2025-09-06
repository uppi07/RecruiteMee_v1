// Client/src/Components/Footer/footer.jsx
import { Link } from "react-router-dom";
import "./footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="rm-footer">
      <div className="container py-4">
        <div className="row g-4 align-items-start footer-grid">
          {/* Brand */}
          <div className="col-12 col-md-4 text-center text-md-start">
            <h5 className="mb-2 footer-brand">
              <span className="brand-dot" /> RecruiteMee
            </h5>
            <p className="text-white-75 mb-2">
              ATS-optimized resumes and LinkedIn optimization.
            </p>
            <div className="small text-white-50">
              © {year} RecruiteMee. All rights reserved.
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-12 col-sm-6 col-md-4">
            <h6 className="mb-2 text-center text-md-start">Quick Links</h6>
            <ul className="list-unstyled footer-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/createresume">Create Resume</Link></li>
              <li><Link to="/orders">Orders</Link></li>
              <li><Link to="/profile">Profile</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-12 col-sm-6 col-md-4">
            <h6 className="mb-2 text-center text-md-start">Legal</h6>
            <ul className="list-unstyled footer-list">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms & Conditions</Link></li>
              <li><Link to="/refund">Refund & Cancellation</Link></li>
              <li><Link to="/disclaimer">Disclaimer</Link></li>
              <li>
                <a className="email-pill" href="mailto:support@recruiteMee.com">
                  support@recruiteMee.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* bottom line */}
        <div className="footer-bottom">
          <span className="small text-white-50">
            Built with ♥ to help you get shortlisted.
          </span>
        </div>
      </div>
    </footer>
  );
}
