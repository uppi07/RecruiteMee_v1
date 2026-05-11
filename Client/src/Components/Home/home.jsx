import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect, useRef } from "react";
import Nav from "../Navbar/nav";
import { api } from "../../lib/api";
import { AUTH_DISABLED, PAYMENTS_DISABLED, OPEN_MODE } from "../../lib/featureFlags";
import "./home.css";

// helper for static template path
const pub = (f) => `${import.meta.env.BASE_URL}Resumes_Templetes/${f}`;

/* ---------------- SERVICES ---------------- */
const SERVICES = [
  {
    key: "resume_rewrite",
    title: "ATS Resume – Rewrite (existing)",
    desc: "Upload your current resume. We rewrite and optimize it for ATS.",
    badge: "Popular",
  },
  {
    key: "resume_review",
    title: "Resume Review", // 👈 UPDATED (removed "(Free)")
    desc: "Line-by-line feedback and impact-focused suggestions.",
  },
  {
    key: "linkedin_opt",
    title: "LinkedIn Optimization",
    desc: "Profile headline, About and Experience tuned for recruiter searches.",
    comingSoon: true,
  },
];

/* ---------------- RESUME TEMPLATES ---------------- */
const TEMPLATES = [
  { id: "modern-blue",  name: "Modern Blue",  img: pub("R1.jpg"), tags: ["ATS-Safe","Tech","Clean"], companies: ["Google","Microsoft","Swiggy"] },
  { id: "elegant-slate", name: "Elegant Slate", img: pub("R2.jpg"), tags: ["Management","Minimal"], companies: ["Deloitte","Accenture","KPMG"] },
  { id: "grid-pro", name: "Grid Pro", img: pub("R3.jpg"), tags: ["Designer","Visual"], companies: ["Adobe","Zomato","Meesho"] },
  { id: "classic-ivy", name: "Classic Ivy", img: pub("R4.jpg"), tags: ["Conservative","Banking"], companies: ["JPMorgan","Goldman Sachs","HDFC Bank"] },
  { id: "mono-bold", name: "Mono Bold", img: pub("R5.jpg"), tags: ["Developer","ATS"], companies: ["Amazon","Flipkart","Paytm"] },
  { id: "aurora", name: "Aurora", img: pub("R6.jpg"), tags: ["Fresh","Graduate"], companies: ["TCS","Infosys","L&T"] },
];

/* ---------------- HEADLINES ---------------- */
const HEADLINES = [
  "Amazon hired 15+ students through our resumes 🎉",
  "45+ OPT students converted internships into full-time offers",
  "25+ CPT students landed internships at Tesla, Intel & Honeywell",
  "40+ students secured H1B sponsorships at Amazon, Microsoft & Deloitte",
  "200+ Indian students placed at TCS, Infosys, Wipro & L&T",
  "120+ students placed across CS, Business, Civil & Mechanical",
  "Tesla & Intel offered internships to CPT students from top universities",
  "Deloitte, PwC & KPMG placed 8 students in consulting roles",
  "Infosys, TCS & Wipro hired 25+ Indian students across majors",
  "JPMorgan, Goldman Sachs & Morgan Stanley gave offers to Finance grads",
  "Siemens, L&T & Bosch recruited Civil & Mechanical Engineers",
  "Google & Microsoft selected 10+ OPT students for full-time roles",
];

/* ---------------- UTILS ---------------- */
const getCurrency = () =>
  (sessionStorage.getItem("currency") || "INR").toLowerCase();

const ROTATE_WORDS = ["Shortlisted", "Hired", "Selected", "Interviewed", "Noticed"];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* ---------------- HOOK: COUNT-UP ---------------- */
function useSyncedCountUp({ start = 0, end = 100, duration = 1600, active = false, startTimeRef }) {
  const [val, setVal] = useState(start);
  useEffect(() => {
    if (!active) return;
    if (!startTimeRef.current) startTimeRef.current = performance.now();

    let raf;
    const animate = (t) => {
      const p = Math.min(1, (t - startTimeRef.current) / duration);
      const eased = easeOut(p);
      setVal(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => raf && cancelAnimationFrame(raf);
  }, [active, start, end, duration, startTimeRef]);
  return val;
}

/* ---------------- COMPONENT ---------------- */
export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = sessionStorage.getItem("token");
  const authed = AUTH_DISABLED ? true : !!token;

  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);
  const userName = (sessionUser?.name || "").trim() || "there";

  /* ---- TYPEWRITER ---- */
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState(0);
  const [del, setDel] = useState(false);
  const [blink, setBlink] = useState(true);

  const word = ROTATE_WORDS[idx];
  const shown = word.slice(0, sub);

  useEffect(() => {
    const typing = del ? 40 : 80;
    const pauseEnd = 900;
    const pauseEmpty = 300;

    if (!del && sub === word.length) {
      const t = setTimeout(() => setDel(true), pauseEnd);
      return () => clearTimeout(t);
    }
    if (del && sub === 0) {
      const t = setTimeout(() => {
        setDel(false);
        setIdx((i) => (i + 1) % ROTATE_WORDS.length);
      }, pauseEmpty);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSub((s) => s + (del ? -1 : 1)), typing);
    return () => clearTimeout(t);
  }, [sub, del, word]);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(t);
  }, []);

  /* ---- MODALS ---- */
  const params = new URLSearchParams(location.search);
  const openParam = params.get("open");

  const [showRewrite, setShowRewrite] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const [rewriteFile, setRewriteFile] = useState(null);
  const [rewriteNotes, setRewriteNotes] = useState("");
  const [reviewFile, setReviewFile] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (PAYMENTS_DISABLED) return;
    if (openParam === "resume_rewrite") setShowRewrite(true);
    if (openParam === "resume_review") setShowReview(true);
  }, [openParam]);

  const goLogin = (next = "/home") =>
    AUTH_DISABLED
      ? navigate("/home")
      : navigate(`/login?next=${encodeURIComponent(next)}`);

  const goTo = (target) => (authed ? navigate(target) : goLogin(target));

  const openServiceModal = (serviceKey) => {
    if (PAYMENTS_DISABLED) {
      alert("Payments and bookings are temporarily disabled.");
      return;
    }
    if (!authed) {
      const next = `/home?open=${encodeURIComponent(serviceKey)}`;
      return goLogin(next);
    }
    if (serviceKey === "resume_rewrite") setShowRewrite(true);
    if (serviceKey === "resume_review") setShowReview(true);
  };

  const anyOpen = showRewrite || showReview;
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

  /* ---- SUBMIT ---- */
  const submitRewrite = async () => {
    if (PAYMENTS_DISABLED) return alert("Payments and bookings are temporarily disabled.");
    if (!authed) return goLogin("/home?open=resume_rewrite");
    if (!rewriteFile) return alert("Please upload a PDF/DOC/DOCX");

    try {
      setBusy(true);
      const form = new FormData();
      form.append("service", "resume_rewrite");
      form.append("description", rewriteNotes || "ATS rewrite requested");
      form.append("file", rewriteFile);
      form.append("currency", getCurrency());

      const { data } = await api.post("/orders/service", form);
      setShowRewrite(false);
      setRewriteFile(null);
      setRewriteNotes("");
      if (data?.orderId)
        navigate(`/checkout?orderId=${encodeURIComponent(data.orderId)}`);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Failed to create order");
    } finally {
      setBusy(false);
    }
  };

  const submitResumeReview = async () => {
    if (PAYMENTS_DISABLED) return alert("Payments and bookings are temporarily disabled.");
    if (!authed) return goLogin("/home?open=resume_review");
    if (!reviewFile) return alert("Please upload a PDF/DOC/DOCX");

    try {
      setBusy(true);
      const form = new FormData();
      form.append("service", "resume_review");
      form.append("description", reviewNotes || "Resume review requested");
      form.append("file", reviewFile);
      form.append("currency", getCurrency());

      const { data } = await api.post("/orders/service", form);
      setShowReview(false);
      setReviewFile(null);
      setReviewNotes("");
      if (data?.orderId)
        navigate(`/checkout?orderId=${encodeURIComponent(data.orderId)}`);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Failed to create order");
    } finally {
      setBusy(false);
    }
  };

  /* ---- STATS ---- */
  const createResumeHref = `/createresume?currency=${getCurrency()}`;

  const statsRef = useRef(null);
  const [statsActive, setStatsActive] = useState(false);
  const statsStartRef = useRef(null);

  useEffect(() => {
    const node = statsRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          statsStartRef.current = performance.now();
          setStatsActive(true);
          obs.unobserve(node);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const DASHBOARD_DURATION = 1600;
  const v1 = useSyncedCountUp({ start: 0, end: 218, duration: DASHBOARD_DURATION, active: statsActive, startTimeRef: statsStartRef });
  const v2 = useSyncedCountUp({ start: 0, end: 170, duration: DASHBOARD_DURATION, active: statsActive, startTimeRef: statsStartRef });
  const v3 = useSyncedCountUp({ start: 0, end: 85, duration: DASHBOARD_DURATION, active: statsActive, startTimeRef: statsStartRef });
  const v4 = useSyncedCountUp({ start: 0, end: 99, duration: DASHBOARD_DURATION, active: statsActive, startTimeRef: statsStartRef });

  /* ---------------- JSX ---------------- */
  return (
    <>
      <Nav />
      <div className="home-page">
        {/* HERO */}
        <header className="home-hero">
          <div className="container py-5 text-center">
            <h1 className="display-5 fw-bold mb-2 hero-heading">
              Get{" "}
              <span className="tw-word">
                {shown}
                <span className={`tw-cursor ${blink ? "on" : ""}`}>|</span>
              </span>{" "}
              Faster, {userName}!
            </h1>
            <p className="lead text-white-50 mb-4">
              ATS-optimized resumes and LinkedIn polish — built to get results.
            </p>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <button
                className="btn btn-primary px-4"
                onClick={() => {
                  if (OPEN_MODE) return alert("Auth and payments are temporarily disabled.");
                  return authed ? navigate("/createresume") : navigate("/login");
                }}
              >
                Create Resume
              </button>
              {OPEN_MODE ? (
                <button type="button" className="btn btn-outline-light px-4" onClick={() => navigate("/about")}>
                  <span className="text-white">Learn More</span>
                </button>
              ) : (
                <Link to="/orders" className="btn btn-outline-light px-4">
                  <span className="text-white">View Orders</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* STATS */}
        <section className="stats-section" ref={statsRef}>
          <div className="container">
            <div className="stats-grid">
              <article className="stat-card"><h3 className="stat-value">{v1}+</h3><p className="stat-label">Resumes Created</p></article>
              <article className="stat-card"><h3 className="stat-value">{v2}+</h3><p className="stat-label">Interviews Scheduled</p></article>
              <article className="stat-card"><h3 className="stat-value">{v3}%</h3><p className="stat-label">Avg. ATS Score</p></article>
              <article className="stat-card"><h3 className="stat-value">{v4}%</h3><p className="stat-label">Satisfaction Rate</p></article>
            </div>
          </div>
        </section>

        {/* HEADLINES */}
        <section className="headlines-section py-3 mt-3">
          <div className="container d-flex align-items-center gap-3 overflow-hidden">
            <div className="headline-ticker">
              <div className="headline-track">
                {HEADLINES.map((h, i) => (
                  <span key={i} className="headline-item">{h}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="home-services py-5">
          <div className="container">
            <div className="d-flex align-items-end justify-content-between mb-4 services-header">
              <div>
                <h2 className="h1 fw-bold mb-1">Services</h2>
                <p className="text-white mb-0">
                  Everything you need to get noticed and shortlisted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openServiceModal("resume_rewrite")}
                className="btn btn-primary rounded-pill px-4 header-cta"
                disabled={PAYMENTS_DISABLED}
              >
                {PAYMENTS_DISABLED ? "Services Paused" : authed ? "Book a Service" : "Sign in to Book"}
              </button>
            </div>

            <div className="row g-4">
              {SERVICES.map((s) => (
                <div className="col-12 col-md-6 col-xl-4" key={s.key}>
                  <div
                    className={`card service-card h-100 border-0 shadow-sm ${s.comingSoon ? "" : "clickable"}`}
                    role={s.comingSoon ? "article" : "button"}
                    tabIndex={s.comingSoon ? -1 : 0}
                    onClick={() => !s.comingSoon && !PAYMENTS_DISABLED && openServiceModal(s.key)}
                  >
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between">
                        <h3 className="h5">{s.title}</h3>
                        {s.comingSoon ? (
                          <span className="badge bg-warning text-dark">Coming soon</span>
                        ) : (
                          s.badge && <span className="badge bg-accent">{s.badge}</span>
                        )}
                      </div>
                      <p className="text-muted mb-4">{s.desc}</p>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openServiceModal(s.key); }}
                          className="btn btn-outline-primary btn-sm rounded-pill px-3"
                          disabled={!!s.comingSoon || PAYMENTS_DISABLED}
                        >
                          {s.comingSoon ? "Coming soon" : PAYMENTS_DISABLED ? "Paused" : authed ? "Get Started" : "Sign in"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TEMPLATES */}
        <section className="templates-section py-5">
          <div className="container">
            <h2 className="h1 fw-bold mb-1">Resume Templates</h2>
            <p className="text-white mb-0">All ATS-safe and recruiter-friendly.</p>

            <div className="tc-viewport">
              <div className="tc-track">
                {[...TEMPLATES, ...TEMPLATES].map((t, i) => (
                  <article key={`${t.id}-${i}`} className="tc-card">
                    <div className="tc-imgwrap">
                      <img src={t.img} alt={t.name} loading="lazy" />
                    </div>
                    <div className="tc-meta">
                      <h3 className="tc-name">{t.name}</h3>
                      <div className="tc-tags">
                        {t.tags?.map((tag) => (
                          <span key={tag} className="tc-tag">{tag}</span>
                        ))}
                      </div>
                      <div className="tc-companies">
                        <span className="tc-companies-label">Liked by recruiters at:</span>
                        <div className="tc-companies-list">
                          {t.companies?.map((c) => (
                            <span key={c} className="tc-company">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="text-center mt-5">
              <div className="card border-0 shadow-sm p-4 cta-card">
                <h3 className="fw-bold mb-2 text-white">Ready to get shortlisted?</h3>
                <p className="text-muted mb-3">Create your resume now — optimize for ATS.</p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-primary" onClick={() => goTo(createResumeHref)}>
                    Create Resume
                  </button>
                  <button className="btn btn-outline-primary" onClick={() => goTo("/about")}>
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MODALS */}
        {showRewrite && (
          <div className="glass-backdrop" onClick={() => !busy && setShowRewrite(false)}>
            <div className="glass-card" onClick={(e) => e.stopPropagation()}>
              <div className="glass-head">
                <h4 className="glass-title">ATS Resume – Rewrite</h4>
                <button className="glass-close" onClick={() => !busy && setShowRewrite(false)} aria-label="Close">✕</button>
              </div>

              <label className="visually-hidden" htmlFor="rw-notes">Notes</label>
              <textarea
                id="rw-notes"
                className="glass-input"
                rows={4}
                placeholder="Add any specific role/notes (optional)"
                value={rewriteNotes}
                onChange={(e) => setRewriteNotes(e.target.value)}
              />

              <label htmlFor="rw-file" className="file-label">Upload PDF/DOC/DOCX. Please do not upload from google drive.</label>
              <input
                id="rw-file"
                className="glass-input file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setRewriteFile(e.target.files?.[0] || null)}
              />

              <div className="actions">
                <button className="btn-ghost" onClick={() => setShowRewrite(false)} disabled={busy}>Cancel</button>
                <button className="btn btn-primary rounded-pill px-4" onClick={submitRewrite} disabled={busy}>
                  {busy ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showReview && (
          <div className="glass-backdrop" onClick={() => !busy && setShowReview(false)}>
            <div className="glass-card" onClick={(e) => e.stopPropagation()}>
              <div className="glass-head">
                <h4 className="glass-title">Resume Review</h4>
                <button className="glass-close" onClick={() => !busy && setShowReview(false)} aria-label="Close">✕</button>
              </div>

              <label htmlFor="rv-file" className="file-label">Upload PDF/DOC/DOCX. Please do not upload from google drive.</label>
              <input
                id="rv-file"
                className="glass-input file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setReviewFile(e.target.files?.[0] || null)}
              />

              <label className="visually-hidden" htmlFor="rv-notes">Notes</label>
              <textarea
                id="rv-notes"
                className="glass-input"
                rows={4}
                placeholder="Tell us about your target role (optional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />

              <div className="actions">
                <button className="btn-ghost" onClick={() => setShowReview(false)} disabled={busy}>Cancel</button>
                <button className="btn btn-primary rounded-pill px-4" onClick={submitResumeReview} disabled={busy}>
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
