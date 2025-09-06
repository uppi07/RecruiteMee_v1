import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Maintenance() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-light">
      <div className="text-center px-4" style={{ maxWidth: 720 }}>
        <div className="display-6 fw-bold mb-2">Maintenance Mode, We will be available soon..!</div>
        <p className="lead text-muted mb-4">
          RecruiteMee is undergoing scheduled maintenance to upgrade a few things.
          Please check back shortly.
        </p>
        <p className="text-secondary mt-4 mb-0 small">
          If you’re seeing this for long, try refreshing the page or clearing cache.
        </p>
      </div>
    </div>
  );
}
