import { useNavigate } from "react-router-dom";
import "../../styles/legal.css";

export default function Disclaimer() {
  const navigate = useNavigate();

  return (
    <div className="legal-page container py-5">
      <button
        className="legal-close"
        onClick={() => navigate("/signup")}
        aria-label="Back to Sign Up"
      >
        Close
      </button>

      <h2 className="mb-3">Disclaimer – RecruiteMee</h2>
      <p>
        RecruiteMee is a resume and LinkedIn optimization service. We help
        improve the presentation and ATS-friendliness of your documents, but we
        do not guarantee employment, interviews, or shortlisting.
      </p>
      <p>
        Clients are responsible for ensuring that all information provided is
        truthful and accurate. Use of our services is at your own discretion.
      </p>
    </div>
  );
}
