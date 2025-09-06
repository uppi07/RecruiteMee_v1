import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-light">
      <div className="text-center px-4" style={{ maxWidth: 720 }}>
        <div className="display-6 fw-bold">404</div>
        <p className="lead text-muted mb-3">Page not found</p>
        <p className="text-secondary small">
          We couldn’t find <code>{location.pathname}</code>.
        </p>
        <div className="d-inline-flex gap-2 flex-wrap justify-content-center mt-3">
          <Link className="btn btn-primary" to="/">Go Home</Link>
          <Link className="btn btn-outline-light" to="/contact">Contact</Link>
          <Link className="btn btn-outline-light" to="/influencer-kit">Influencer Kit</Link>
        </div>
      </div>
    </div>
  );
}
