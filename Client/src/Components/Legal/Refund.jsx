import { useNavigate } from "react-router-dom";
import "../../styles/legal.css";

export default function Refund() {
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

      <h2 className="mb-3">Refund & Cancellation Policy – RecruiteMee</h2>

      <h5 className="mt-4">Refund Eligibility</h5>
      <ul>
        <li>
          Refunds are allowed only when your order is in <em>Pending</em> status
          (before work has started).
        </li>
        <li>
          No refunds once the service is marked <em>In Progress</em> or{" "}
          <em>Completed</em>.
        </li>
      </ul>

      <h5 className="mt-4">Refund Process</h5>
      <ul>
        <li>
          Refunds are processed back to the original payment method (Razorpay or
          PayPal).
        </li>
        <li>Please allow 5–7 business days for the amount to reflect.</li>
      </ul>

      <h5 className="mt-4">How to Request</h5>
      <p>
        Email us at{" "}
        <a href="mailto:support@recruitemee.com">support@recruiteMee.com</a>{" "}
        with your order ID.
      </p>
    </div>
  );
}
