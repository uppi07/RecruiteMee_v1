import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../Navbar/nav.jsx";
import { api } from "../../lib/api";
import "./pricing.css";

// Helpers to read env with fallbacks
const envNum = (key, fallback) => {
  const v = import.meta.env[key];
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

// Public prices (offer) – INR
const FORM_PRICE_INR = envNum("VITE_FORM_PRICE_INR", 850);       // From-scratch
const REWRITE_PRICE_INR = envNum("VITE_REWRITE_PRICE_INR", 800);  // Rewrite
const REVIEW_PRICE_INR = envNum("VITE_REVIEW_PRICE_INR", 200);    // Review

// Public prices (offer) – USD
const FORM_PRICE_USD = envNum("VITE_FORM_PRICE_USD", 17);
const REWRITE_PRICE_USD = envNum("VITE_REWRITE_PRICE_USD", 14);
const REVIEW_PRICE_USD = envNum("VITE_REVIEW_PRICE_USD", 3);

// MRPs to strike through – INR
const FORM_MRP_INR = envNum("VITE_FORM_MRP_INR", 3000);
const REWRITE_MRP_INR = envNum("VITE_REWRITE_MRP_INR", 2700);
// MRPs to strike through – USD
const FORM_MRP_USD = envNum("VITE_FORM_MRP_USD", 39);
const REWRITE_MRP_USD = envNum("VITE_REWRITE_MRP_USD", 35);

export default function Pricing() {
  const navigate = useNavigate();
  const location = useLocation();

  // auth + user
  const token = sessionStorage.getItem("token");
  const authed = !!token;
  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  // currency toggle (persist in URL + localStorage)
  const initialCurrency = (() => {
    const p = new URLSearchParams(location.search).get("currency");
    return (p || localStorage.getItem("currency") || "INR").toUpperCase();
  })();
  const [currency, setCurrency] = useState(initialCurrency);

  useEffect(() => {
    localStorage.setItem("currency", currency);
    const params = new URLSearchParams(location.search);
    params.set("currency", currency);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  // modals
  const [showRewrite, setShowRewrite] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const anyOpen = showRewrite || showReview;

  // modal state
  const [busy, setBusy] = useState(false);
  const [rewriteFile, setRewriteFile] = useState(null);
  const [rewriteNotes, setRewriteNotes] = useState("");
  const [reviewFile, setReviewFile] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // open a modal via query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const open = params.get("open");
    if (open === "resume_rewrite") setShowRewrite(true);
    if (open === "resume_review") setShowReview(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // esc + body scroll lock
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) {
        setShowRewrite(false);
        setShowReview(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [anyOpen, busy]);

  // helpers
  const goLoginNext = (openKey) =>
    navigate(`/login?next=${encodeURIComponent(`/pricing?open=${openKey}&currency=${currency}`)}`);

  const ensureAuthedThen = (openKey, fn) => {
    if (!authed) return goLoginNext(openKey);
    return fn();
  };

  // currency helpers
  const isUSD = currency === "USD";
  const sym = isUSD ? "$" : "₹";

  const PRICES = useMemo(() => {
    if (isUSD) {
      return {
        nowForm: FORM_PRICE_USD,
        nowRewrite: REWRITE_PRICE_USD,
        nowReview: REVIEW_PRICE_USD,
        mrpForm: FORM_MRP_USD,
        mrpRewrite: REWRITE_MRP_USD,
        code: "USD",
      };
    }
    return {
      nowForm: FORM_PRICE_INR,
      nowRewrite: REWRITE_PRICE_INR,
      nowReview: REVIEW_PRICE_INR,
      mrpForm: FORM_MRP_INR,
      mrpRewrite: REWRITE_MRP_INR,
      code: "INR",
    };
  }, [isUSD]);

  // unified redirect helper → always send to checkout
  const goCheckout = (data) => {
    const absOrPath =
      data?.redirect ||
      (data?.orderId ? `/checkout?orderId=${encodeURIComponent(data.orderId)}` : null);

    if (!absOrPath) return;

    if (/^https?:\/\//i.test(absOrPath)) {
      // backend gave full URL (cross-origin safe)
      window.location.assign(absOrPath);
    } else {
      // same-app route
      navigate(absOrPath, { replace: true });
    }
  };

  // actions
  const submitRewrite = async () => {
    if (!authed) return goLoginNext("resume_rewrite");
    if (!rewriteFile) return alert("Please upload a PDF/DOC/DOCX");
    try {
      setBusy(true);
      const form = new FormData();
      form.append("service", "resume_rewrite");
      form.append("description", rewriteNotes || "ATS rewrite requested");
      form.append("file", rewriteFile);
      form.append("currency", PRICES.code.toLowerCase()); // chosen currency
      const { data } = await api.post("/orders/service", form);
      setShowRewrite(false);
      setRewriteFile(null);
      setRewriteNotes("");
      goCheckout(data);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Failed to create order");
    } finally {
      setBusy(false);
    }
  };

  const submitResumeReview = async () => {
    if (!authed) return goLoginNext("resume_review");
    if (!reviewFile) return alert("Please upload a PDF/DOC/DOCX");
    try {
      setBusy(true);
      const form = new FormData();
      form.append("service", "resume_review");
      form.append("description", reviewNotes || "Resume review requested");
      form.append("file", reviewFile);
      form.append("currency", PRICES.code.toLowerCase()); // chosen currency
      const { data } = await api.post("/orders/service", form);
      setShowReview(false);
      setReviewFile(null);
      setReviewNotes("");
      // ✅ ALWAYS redirect to checkout after creating review order
      goCheckout(data);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Failed to create order");
    } finally {
      setBusy(false);
    }
  };

  // buttons
  const handleCreateResume = () => navigate(`/createresume?currency=${PRICES.code.toLowerCase()}`);
  const handleRewriteResume = () => ensureAuthedThen("resume_rewrite", () => setShowRewrite(true));
  const handleFreeReview = () => ensureAuthedThen("resume_review", () => setShowReview(true));

  // price render
  const renderPrice = (amt) => (amt > 0 ? `${sym}${amt}` : "Free");

  /** ---------- sale countdown ---------- */
  const [remaining, setRemaining] = useState("00:00:00");
  useEffect(() => {
    const KEY = "saleEndsAt";
    let endsAt = Number(sessionStorage.getItem(KEY));
    if (!Number.isFinite(endsAt) || endsAt < Date.now()) {
      endsAt = Date.now() + 48 * 60 * 60 * 1000;
      sessionStorage.setItem(KEY, String(endsAt));
    }
    const tick = () => {
      const diff = Math.max(0, endsAt - Date.now());
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setRemaining(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const saveForm = Math.max(0, PRICES.mrpForm - PRICES.nowForm);
  const saveRewrite = Math.max(0, PRICES.mrpRewrite - PRICES.nowRewrite);

  return (
    <>
      <Navbar />
      <div className="pricing-page">
        <div className="container py-4">
          <h2 className="pricing-title">Choose your plan</h2>
          <p className="pricing-subtitle text-white">
            From quick ATS tuning to a full rewrite — pick what fits your timeline.
          </p>

          {/* Sale banner – mobile-first layout */}
          <div className="sale-banner" role="region" aria-label="Limited-time sale">
            <div className="sale-left">
              <span className="sale-badge">Limited-time</span>
              <span className="sale-text">
                <strong>Sale live now</strong> • From-Scratch{" "}
                <b>{sym}{PRICES.nowForm}</b>{" "}
                <span className="muted">(was <del>{sym}{PRICES.mrpForm}</del>)</span> · Rewrite{" "}
                <b>{sym}{PRICES.nowRewrite}</b>{" "}
                <span className="muted">(was <del>{sym}{PRICES.mrpRewrite}</del>)</span>
              </span>
            </div>
            <div className="sale-timer">
              Ends in <span className="timer-chip">{remaining}</span>
            </div>
          </div>

          {/* Currency line with tiny toggle */}
          <div className="currency-line">
            Currency:&nbsp;{PRICES.code} {sym}
            <span className="ms-2">
              <button
                type="button"
                className={`btn btn-sm ${!isUSD ? "btn-primary" : "btn-outline-primary"} me-1`}
                onClick={() => setCurrency("INR")}
              >
                INR ₹
              </button>
              <button
                type="button"
                className={`btn btn-sm ${isUSD ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setCurrency("USD")}
              >
                USD $
              </button>
            </span>
          </div>

          <div className="pricing-cards">
            {/* ATS Resume from Scratch */}
            <div className="pricing-card">
              <div className="card-head">
                <h3>ATS – Resume (from Scratch)</h3>
              </div>

              <p className="card-desc">
                Professionally crafted ATS-optimized resume built from zero.
              </p>

              <div className="price">
                <del className="mrp">{sym}{PRICES.mrpForm}</del>
                <span className="now">{renderPrice(PRICES.nowForm)}</span>
                <span className="unit">/ one-time</span>
              </div>
              <p className="save">You save {sym}{saveForm}</p>

              <div className="actions">
                <button className="btn btn-primary primary-cta" onClick={handleCreateResume}>
                  Create Resume
                </button>
              </div>
            </div>

            {/* Rewrite existing */}
            <div className="pricing-card">
              <div className="card-head">
                <h3>ATS Resume – Rewrite (existing)</h3>
              </div>

              <p className="card-desc">
                Upload your current resume and we’ll rewrite and optimize it for ATS.
              </p>

              <div className="price">
                <del className="mrp">{sym}{PRICES.mrpRewrite}</del>
                <span className="now">{renderPrice(PRICES.nowRewrite)}</span>
                <span className="unit">/ one-time</span>
              </div>
              <p className="save">You save {sym}{saveRewrite}</p>

              <div className="actions">
                <button className="btn btn-outline-primary primary-cta" onClick={handleRewriteResume}>
                  Start Rewrite
                </button>
              </div>
            </div>

            {/* Review (env-driven) */}
            <div className="pricing-card">
              <div className="card-head">
                <h3>Resume Review</h3>
              </div>
              <p className="card-desc">Quick expert audit with actionable tips.</p>

              <div className="price">
                <span className={`now ${PRICES.nowReview > 0 ? "" : "free"}`}>
                  {renderPrice(PRICES.nowReview)}
                </span>
                {PRICES.nowReview > 0 && <span className="unit">/ one-time</span>}
              </div>

              <div className="actions">
                <button className="btn btn-outline-primary primary-cta" onClick={handleFreeReview}>
                  {PRICES.nowReview > 0 ? "Get Review" : "Get Free Review"}
                </button>
              </div>
            </div>
          </div>

          {/* CTA row */}
          <div className="post-cta">
            <div className="post-cta-text">
              <span className="strong">Lock today’s offer pricing</span>
              <span className="sub">Prices revert after the timer hits zero.</span>
            </div>
            <div className="post-cta-actions">
              <button className="btn btn-primary rounded-pill px-3" onClick={handleCreateResume}>Create Resume</button>
              <button className="btn btn-outline-primary rounded-pill px-3" onClick={handleRewriteResume}>Start Rewrite</button>
            </div>
          </div>

          <div className="contact-cta">
            <p className="text-white">Questions? Need a custom plan?</p>
            <button onClick={() => navigate("/contact")}>Contact us</button>
          </div>
        </div>

        {/* Rewrite Modal */}
        {showRewrite && (
          <div className="glass-backdrop" onClick={() => !busy && setShowRewrite(false)}>
            <div
              className="glass-card glass-animate-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rewrite-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-head">
                <h4 className="glass-title" id="rewrite-title">ATS Resume – Rewrite</h4>
                <button className="glass-close" onClick={() => setShowRewrite(false)} aria-label="Close">✕</button>
              </div>
              <p className="dim small mb-3">Upload PDF/DOC/DOCX. Please do not upload from google drive.</p>
              <div className="mb-3">
                <input
                  type="file"
                  className="glass-input file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setRewriteFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="mb-3">
                <textarea
                  className="glass-input"
                  rows={4}
                  placeholder="Any notes or target role (optional)"
                  value={rewriteNotes}
                  onChange={(e) => setRewriteNotes(e.target.value)}
                />
              </div>
              <div className="actions">
                <button className="btn-ghost" disabled={busy} onClick={() => setShowRewrite(false)}>Cancel</button>
                <button className="btn btn-primary rounded-pill px-4" disabled={busy} onClick={submitRewrite}>
                  {busy ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReview && (
          <div className="glass-backdrop" onClick={() => !busy && setShowReview(false)}>
            <div
              className="glass-card glass-animate-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-head">
                <h4 className="glass-title" id="review-title">Resume Review</h4>
                <button className="glass-close" onClick={() => setShowReview(false)} aria-label="Close">✕</button>
              </div>
              <p className="dim small mb-3">Upload PDF/DOC/DOCX. Please do not upload from google drive.</p>
              <div className="mb-3">
                <input
                  type="file"
                  className="glass-input file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setReviewFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="mb-3">
                <textarea
                  className="glass-input"
                  rows={4}
                  placeholder="Any notes or target role (optional)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
              <div className="actions">
                <button className="btn-ghost" disabled={busy} onClick={() => setShowReview(false)}>Cancel</button>
                <button className="btn btn-primary rounded-pill px-4" disabled={busy} onClick={submitResumeReview}>
                  {busy ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
