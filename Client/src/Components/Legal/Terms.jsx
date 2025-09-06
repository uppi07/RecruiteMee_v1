import { useNavigate } from "react-router-dom";
import "../../styles/legal.css";

export default function Terms() {
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

      <h2 className="mb-3">Terms & Conditions – RecruiteMee</h2>

      <h5 className="mt-4">1. Services</h5>
      <p>We provide resume-building and LinkedIn optimization services as a freelancer-based platform. We do not guarantee a job, interview, or shortlisting — our services enhance your professional profile.</p>

      <h5 className="mt-4">2. Payments</h5>
      <p>Payments are accepted via Razorpay and PayPal. We support INR and USD.</p>

      <h5 className="mt-4">3. Refunds</h5>
      <p>Refunds are applicable only if your order is in <em>Pending</em> status and work hasn’t started. Once the order is <em>In Progress</em> or delivered, refunds are not possible.</p>

      <h5 className="mt-4">4. User Responsibilities</h5>
      <p>You must provide accurate and truthful information. You’re responsible for ensuring details reflect your actual experience.</p>

      <h5 className="mt-4">5. Limitation of Liability</h5>
      <p>RecruiteMee is not responsible for job outcomes, hiring decisions, or third-party actions. Our liability is limited to the amount paid for the service.</p>

      <h5 className="mt-4">6. Governing Law</h5>
      <p>These terms are governed by the laws of the United States and India, depending on the client’s region.</p>
    </div>
  );
}
