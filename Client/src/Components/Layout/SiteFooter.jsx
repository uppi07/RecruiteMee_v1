import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./SiteFooter.css";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  // legal modals
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const anyOpen = showPrivacy || showTerms || showRefund || showDisclaimer;

  // refs for focus trapping
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previouslyFocused = useRef(null);

  // ESC + body scroll lock + focus management while modal open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowPrivacy(false);
        setShowTerms(false);
        setShowRefund(false);
        setShowDisclaimer(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = anyOpen ? "hidden" : "";

    // focus trap setup when opened
    if (anyOpen) {
      previouslyFocused.current = document.activeElement;
      // wait a tick for modal content to mount
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 0);
    } else if (previouslyFocused.current instanceof HTMLElement) {
      // restore focus to the element that opened the modal
      previouslyFocused.current.focus();
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [anyOpen]);

  // simple focus trap within the active modal
  const onTrapKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const root = modalRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const list = Array.from(focusables).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
    );
    if (list.length === 0) return;

    const first = list[0];
    const last = list[list.length - 1];

    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  };

  // helpers to open each modal (for returnFocus to work)
  const openWithFocusMemo = (setter) => (e) => {
    // remember the clicked link/button
    previouslyFocused.current = e.currentTarget;
    setter(true);
  };

  return (
    <>
      {/* FOOTER */}
      <footer className="site-footer pt-5 pb-4">
        <div className="container">
          <div className="row g-4">
            <div className="col-12 col-md-4">
  <h5 className="mb-3">RecruiteMee</h5>
  <p className="brand-desc small mb-2">
    We craft ATS-optimized resumes and polish your LinkedIn so you get noticed faster.
  </p>
  <div className="brand-email small">
    <a href="mailto:support@recruiteMee.com">support@recruiteMee.com</a>
  </div>
</div>

            <div className="col-6 col-md-2">
              <h6 className="mb-3">Quick Links</h6>
              <ul className="list-unstyled footer-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/createresume">Create Resume</Link></li>
                <li><Link to="/orders">Orders</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>

            <div className="col-6 col-md-3">
              <h6 className="mb-3">Legal</h6>
              <ul className="list-unstyled footer-links">
                <li>
                  <a
                    href="#privacy"
                    onClick={(e) => { e.preventDefault(); openWithFocusMemo(setShowPrivacy)(e); }}
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#terms"
                    onClick={(e) => { e.preventDefault(); openWithFocusMemo(setShowTerms)(e); }}
                  >
                    Terms &amp; Conditions
                  </a>
                </li>
                <li>
                  <a
                    href="#refund"
                    onClick={(e) => { e.preventDefault(); openWithFocusMemo(setShowRefund)(e); }}
                  >
                    Refund &amp; Cancellation
                  </a>
                </li>
                <li>
                  <a
                    href="#disclaimer"
                    onClick={(e) => { e.preventDefault(); openWithFocusMemo(setShowDisclaimer)(e); }}
                  >
                    Disclaimer
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-12 col-md-3">
              <h6 className="mb-3">Follow</h6>
              <ul className="list-unstyled footer-links">
                <li>LinkedIn</li>
                <li>Twitter</li>
                <li>Instagram</li>
              </ul>
            </div>
          </div>

          <hr className="footer-hr my-4" />

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="text-white small">© {year} RecruiteMee. All rights reserved.</div>
            <div className="text-white small">Made with ♥ to help you get noticed.</div>
          </div>
        </div>
      </footer>

      {/* LEGAL MODALS */}
      {showPrivacy && (
        <div className="glass-backdrop" onClick={() => setShowPrivacy(false)}>
          <div
            ref={modalRef}
            className="glass-card glass-animate-in legal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onTrapKeyDown}
          >
            <div className="glass-head">
              <h4 className="glass-title" id="privacy-title">Privacy Policy – RecruiteMee</h4>
              <button
                ref={closeBtnRef}
                className="glass-close"
                onClick={() => setShowPrivacy(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="legal-body" id="privacy-body">
              <p>At RecruiteMee, we respect your privacy and are committed to protecting your personal information.</p>
              <h6>1. Information We Collect</h6>
              <ul>
                <li>Name, email, and contact details provided during sign-up or order.</li>
                <li>Resume content, career preferences, and LinkedIn details you share for service delivery.</li>
                <li>Payment information processed securely by Razorpay or PayPal (we do not store card details).</li>
              </ul>
              <h6>2. How We Use Your Information</h6>
              <ul>
                <li>To deliver resume-building and LinkedIn optimization services.</li>
                <li>To contact you regarding your order status or updates.</li>
                <li>To improve our services and user experience.</li>
              </ul>
              <h6>3. Data Retention</h6>
              <p>Resume and related data are stored for 1 month after service completion. After 1 month, all files are deleted from our system.</p>
              <h6>4. Data Sharing</h6>
              <p>We do not sell, rent, or share your personal data with third parties. Payment processing is handled by trusted providers (Razorpay, PayPal).</p>
              <h6>5. Your Rights</h6>
              <p>You can request data deletion anytime by contacting <a href="mailto:support@recruiteMee.com">support@recruiteMee.com</a>. You may also request a copy of the data we hold about you.</p>
            </div>
          </div>
        </div>
      )}

      {showTerms && (
        <div className="glass-backdrop" onClick={() => setShowTerms(false)}>
          <div
            ref={modalRef}
            className="glass-card glass-animate-in legal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onTrapKeyDown}
          >
            <div className="glass-head">
              <h4 className="glass-title" id="terms-title">Terms &amp; Conditions – RecruiteMee</h4>
              <button
                ref={closeBtnRef}
                className="glass-close"
                onClick={() => setShowTerms(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="legal-body">
              <h6>1. Services</h6>
              <p>We provide resume-building and LinkedIn optimization services as a freelancer-based platform. We do not guarantee a job, interview, or shortlisting — our services are intended to enhance your professional profile.</p>
              <h6>2. Payments</h6>
              <p>Payments are accepted via Razorpay and PayPal. We support INR and USD currencies.</p>
              <h6>3. Refunds</h6>
              <p>Refunds are only applicable if your order is in Queued status and work has not started. Once the order moves to In Progress or is delivered, refunds are not possible.</p>
              <h6>4. User Responsibilities</h6>
              <p>You must provide accurate and truthful information. You are responsible for ensuring the details reflect your actual experience.</p>
              <h6>5. Limitation of Liability</h6>
              <p>RecruiteMee is not responsible for job outcomes, hiring decisions, or third-party recruiter actions. Our liability is limited to the amount paid for the service.</p>
              <h6>6. Governing Law</h6>
              <p>These terms are governed by the laws of United States and India, depending on the client’s region.</p>
            </div>
          </div>
        </div>
      )}

      {showRefund && (
        <div className="glass-backdrop" onClick={() => setShowRefund(false)}>
          <div
            ref={modalRef}
            className="glass-card glass-animate-in legal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onTrapKeyDown}
          >
            <div className="glass-head">
              <h4 className="glass-title" id="refund-title">Refund &amp; Cancellation Policy – RecruiteMee</h4>
              <button
                ref={closeBtnRef}
                className="glass-close"
                onClick={() => setShowRefund(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="legal-body">
              <h6>Refund Eligibility</h6>
              <ul>
                <li>Refunds are allowed only when your order is in Pending status (before work has started).</li>
                <li>No refunds are issued once the service is marked In Progress or Completed.</li>
              </ul>
              <h6>Refund Process</h6>
              <ul>
                <li>Refunds are processed back to the original payment method (Razorpay or PayPal).</li>
                <li>Please allow 5–7 business days for the amount to reflect.</li>
              </ul>
              <h6>How to Request</h6>
              <p>Email us at <a href="mailto:support@recruiteMee.com">support@recruiteMee.com</a> with your order ID.</p>
            </div>
          </div>
        </div>
      )}

      {showDisclaimer && (
        <div className="glass-backdrop" onClick={() => setShowDisclaimer(false)}>
          <div
            ref={modalRef}
            className="glass-card glass-animate-in legal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disc-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onTrapKeyDown}
          >
            <div className="glass-head">
              <h4 className="glass-title" id="disc-title">Disclaimer – RecruiteMee</h4>
              <button
                ref={closeBtnRef}
                className="glass-close"
                onClick={() => setShowDisclaimer(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="legal-body">
              <p>RecruiteMee is a resume and LinkedIn optimization service. We help improve the presentation and ATS-friendliness of your documents, but we do not guarantee employment, interviews, or shortlisting.</p>
              <p>Clients are responsible for ensuring that all information provided is truthful and accurate. Use of our services is at your own discretion.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
