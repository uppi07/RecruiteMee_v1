import { useNavigate } from "react-router-dom";
import "../../styles/legal.css";

export default function Privacy() {
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

      <h2 className="mb-3">Privacy Policy – RecruiteMee</h2>
      <p>At RecruiteMee, we respect your privacy and are committed to protecting your personal information.</p>

      <h5 className="mt-4">1. Information We Collect</h5>
      <ul>
        <li>Name, email, and contact details provided during sign-up or order.</li>
        <li>Resume content, career preferences, and LinkedIn details you share for service delivery.</li>
        <li>Payment information processed securely by Razorpay or PayPal (we do not store card details).</li>
      </ul>

      <h5 className="mt-4">2. How We Use Your Information</h5>
      <ul>
        <li>To deliver resume-building and LinkedIn optimization services.</li>
        <li>To contact you regarding your order status or updates.</li>
        <li>To improve our services and user experience.</li>
      </ul>

      <h5 className="mt-4">3. Data Retention</h5>
      <p>Resume and related data are stored for 1 month after service completion. After 1 month, all files are deleted.</p>

      <h5 className="mt-4">4. Data Sharing</h5>
      <p>We do not sell, rent, or share your personal data with third parties. Payment processing is handled by trusted providers (Razorpay, PayPal).</p>

      <h5 className="mt-4">5. Your Rights</h5>
      <p>
        You can request data deletion anytime by contacting{" "}
        <a href="mailto:support@recruitemee.com">support@recruiteMee.com</a>.
        You may also request a copy of the data we hold about you.
      </p>
    </div>
  );
}
