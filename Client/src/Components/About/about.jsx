// Client/src/Components/About/about.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Navbar/nav.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './about.css';

/* --------------------------- Success Stories Data --------------------------- */
const STORIES = [
  { name: "Ananya Gupta", title: "AI Research Intern", outcome: "Shortlisted @ Meta",
    quote: "As a fresher in AI, I needed my projects to shine. RecruiteMee polished my resume so well that Meta shortlisted me for an internship." },
  { name: "Priya Desai", title: "Business Analytics", outcome: "Shortlisted @ KPMG",
    quote: "I wanted a role in analytics but my resume looked too generic. Thanks to RecruiteMee, I got shortlisted at KPMG. The keyword optimization really works!" },
  { name: "Fatima Noor", title: "Civil Engineer", outcome: "Shortlisted @ L&T",
    quote: "As a Civil Engineering graduate, I wasn’t sure how to present my projects. RecruiteMee gave me a professional, ATS-friendly resume and I got shortlisted at L&T." },
  { name: "Neha Kulkarni", title: "Cloud Engineer", outcome: "Shortlisted @ Microsoft",
    quote: "RecruiteMee made my resume stand out by aligning it with the Cloud Engineer role. Within a week, I got a shortlist from Microsoft." },
  { name: "Karthik Reddy", title: "Mechanical Engineer", outcome: "Shortlisted @ Siemens",
    quote: "They highlighted my projects and internships professionally, and I was soon shortlisted at Siemens." },
  { name: "Emily Johnson", title: "IT Support Specialist", outcome: "Shortlisted @ IBM",
    quote: "Role-based suggestions + ATS resume = shortlist at IBM. Smooth and fast." },
  { name: "Rahul Verma", title: "AI/ML Engineer", outcome: "Shortlisted @ NVIDIA",
    quote: "My ML projects were showcased perfectly. Got calls from NVIDIA and two startups." },
  { name: "Sofia Alvarez", title: "Business Analyst", outcome: "Shortlisted @ Accenture",
    quote: "Went from generic to sharp. Landed a BA shortlist at Accenture." },
  { name: "Aditi Sharma", title: "Software Engineer", outcome: "Interview @ Amazon",
    quote: "Within two weeks of the rewrite, I landed an Amazon interview. ATS optimization really works." },
  { name: "Carlos Mendes", title: "Mechanical Design Engineer", outcome: "Interview @ Bosch",
    quote: "They brought out my CAD/CAE skills. Interview at Bosch within two weeks." },
  { name: "Rohit Nair", title: "Software Developer", outcome: "Shortlisted @ Infosys",
    quote: "My resume wasn’t getting parsed. After optimization, I got shortlisted at Infosys." },
  { name: "Aditya Mehta", title: "Systems Engineer", outcome: "Shortlisted @ Wipro",
    quote: "Clean, professional resume → shortlist at Wipro." },
  { name: "Mohammed Ali", title: "IT Support Specialist", outcome: "Shortlisted @ Tech Mahindra",
    quote: "Troubleshooting + networking skills emphasized; quick shortlist at Tech Mahindra." },
  { name: "Shruti Rao", title: "Cybersecurity Analyst", outcome: "Shortlisted @ Mphasis",
    quote: "SOC training and certs highlighted; got shortlisted at Mphasis." }
];

/* --------------------------- Developers/Creators Data --------------------------- */
const CREATORS = [
  {
    name: "R*** Mehta",
    role: "Software Engineer at Google",
    bullets: [
      "Works on scalable backend systems and algorithms that handle millions of users daily.",
      "Helps you highlight coding projects, system design skills, and technical achievements that recruiters at big tech value."
    ]
  },
  {
    name: "P*** Sharma",
    role: "Data Scientist at Microsoft",
    bullets: [
      "Builds ML models for cloud services, focusing on prediction and optimization.",
      "Guides you to present AI/ML projects with measurable results and clear technical depth."
    ]
  },
  {
    name: "A*** Nair",
    role: "Software Development Engineer at Amazon",
    bullets: [
      "Designs distributed systems for e-commerce and optimizes backend performance.",
      "Teaches you how to showcase problem-solving, coding efficiency, and impact in software roles."
    ]
  },
  {
    name: "S*** Reddy",
    role: "Structural Engineer at Larsen & Toubro (L&T)",
    bullets: [
      "Manages design and analysis of large-scale infrastructure projects like bridges and metros.",
      "Helps you structure resumes with project details, tools used (AutoCAD, STAAD, etc.), and quantifiable contributions."
    ]
  },
  {
    name: "V*** Sharma",
    role: "Project Engineer at Tata Projects",
    bullets: [
      "Oversees on-site execution, quality control, and coordination with multiple stakeholders.",
      "Guides you in presenting fieldwork, safety standards, and leadership in civil projects clearly."
    ]
  },
  {
    name: "D*** Menon",
    role: "Engineering Manager at Infosys",
    bullets: [
      "Leads cross-functional teams, manages client deliverables, and ensures on-time project delivery.",
      "Helps you highlight leadership, stakeholder management, and business outcomes in your resume."
    ]
  },
  {
    name: "A*** Kulkarni",
    role: "Project Manager at Wipro",
    bullets: [
      "Drives technology projects for global clients, focusing on efficiency and delivery excellence.",
      "Teaches you how to emphasize team leadership, KPIs, and execution in engineering management resumes."
    ]
  },
  {
    name: "N*** Reddy",
    role: "Product Manager at Meta (Information Systems)",
    bullets: [
      "Owns product features, runs experiments, and works closely with engineers and designers.",
      "Helps you show impact through metrics, product launches, and cross-team collaboration."
    ]
  },
  {
    name: "A*** Patel",
    role: "Healthcare Consultant at Johnson & Johnson (Biomedical Engineering)",
    bullets: [
      "Advises on medical devices and clinical process improvements.",
      "Guides you to present technical + healthcare achievements in a way that resonates with both recruiters and HR."
    ]
  },
  {
    name: "V*** Iyer",
    role: "Biotech Researcher at Pfizer (Biotech Major)",
    bullets: [
      "Conducts R&D in drug discovery and publishes scientific findings.",
      "Helps you frame research projects, patents, and technical skills in recruiter-friendly language."
    ]
  }
];

/* --------------------------------- Helpers --------------------------------- */
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};
const getInitials = (name = '') =>
  name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

/* ------------------------------ Component ---------------------------------- */
export default function About() {
  // slides
  const storySlides = useMemo(() => chunk(STORIES, 3), []);
  const creatorSlides = useMemo(() => chunk(CREATORS, 3), []);

  // creators carousel state
  const [devIndex, setDevIndex] = useState(0);
  const devTotal = creatorSlides.length;
  const devTimerRef = useRef(null);
  const devWrapRef = useRef(null);

  // stories carousel state (same style)
  const [storyIndex, setStoryIndex] = useState(0);
  const storyTotal = storySlides.length;
  const storyTimerRef = useRef(null);
  const storyWrapRef = useRef(null);

  // Auto-advance (Creators)
  useEffect(() => {
    const start = () => {
      if (devTimerRef.current) return;
      devTimerRef.current = setInterval(() => {
        setDevIndex(i => (i + 1) % devTotal);
      }, 5500);
    };
    const stop = () => {
      if (devTimerRef.current) {
        clearInterval(devTimerRef.current);
        devTimerRef.current = null;
      }
    };
    start();
    const wrap = devWrapRef.current;
    wrap?.addEventListener('mouseenter', stop);
    wrap?.addEventListener('mouseleave', start);
    return () => {
      stop();
      wrap?.removeEventListener('mouseenter', stop);
      wrap?.removeEventListener('mouseleave', start);
    };
  }, [devTotal]);

  // Auto-advance (Stories)
  useEffect(() => {
    const start = () => {
      if (storyTimerRef.current) return;
      storyTimerRef.current = setInterval(() => {
        setStoryIndex(i => (i + 1) % storyTotal);
      }, 6000);
    };
    const stop = () => {
      if (storyTimerRef.current) {
        clearInterval(storyTimerRef.current);
        storyTimerRef.current = null;
      }
    };
    start();
    const wrap = storyWrapRef.current;
    wrap?.addEventListener('mouseenter', stop);
    wrap?.addEventListener('mouseleave', start);
    return () => {
      stop();
      wrap?.removeEventListener('mouseenter', stop);
      wrap?.removeEventListener('mouseleave', start);
    };
  }, [storyTotal]);

  // nav handlers
  const goPrevDev = () => setDevIndex(i => (i - 1 + devTotal) % devTotal);
  const goNextDev = () => setDevIndex(i => (i + 1) % devTotal);
  const goPrevStory = () => setStoryIndex(i => (i - 1 + storyTotal) % storyTotal);
  const goNextStory = () => setStoryIndex(i => (i + 1) % storyTotal);

  return (
    <div className="about-page">
      <Navbar />

      {/* Hero / About Intro */}
      <section className="about-hero py-5">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <h1 className="display-5 fw-bold text-white mb-3">About Us</h1>
              <p className="lead text-white-50 mb-4">
                We help candidates get <span className="text-accent">shortlisted</span>—faster.
                From ATS-ready resumes to interview prep, we focus on outcomes:
                more recruiter calls, more interviews, more offers.
              </p>
              <div className="d-flex gap-3">
                <Link to="/contact" className="btn btn-light btn-lg rounded-pill px-4">
                  <span className="text-white">Contact us</span>
                </Link>
                <Link to="/pricing" className="btn btn-outline-light btn-lg rounded-pill px-4">
                  <span className="text-white">View Pricing</span>
                </Link>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="about-blob shadow-lg">
                <div className="about-stats">
                  <div><h3 className="mb-0">95%</h3><small>Clients report higher shortlist rates</small></div>
                  <div><h3 className="mb-0">48h</h3><small>Typical turnaround</small></div>
                  <div><h3 className="mb-0">+Keywords</h3><small>Role-aligned, ATS-friendly</small></div>
                </div>
              </div>
            </div>
          </div>

          {/* Resume Creators Carousel (above Mission; same style as Stories) */}
          <div className="row mt-5">
            <div className="col-12">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h3 fw-bold mb-0">Meet Our Resume Creators</h2>
                <div className="d-none d-md-flex gap-2">
                  <button className="btn btn-outline-light btn-sm rounded-pill px-3" onClick={goPrevDev}>‹ Prev</button>
                  <button className="btn btn-light btn-sm rounded-pill px-3" onClick={goNextDev}>Next ›</button>
                </div>
              </div>

              <div className="dev-carousel-wrap" ref={devWrapRef}>
                <div
                  className="dev-track"
                  style={{ transform: `translateX(-${devIndex * 100}%)` }}
                >
                  {creatorSlides.map((group, slideIdx) => (
                    <div className="dev-slide" key={slideIdx}>
                      <div className="row g-4">
                        {group.map((c, cardIdx) => (
                          <div className="col-12 col-md-6 col-lg-4" key={`${slideIdx}-${cardIdx}`}>
                            {/* Reuse story-card styles for identical look */}
                            <article className="story-card h-100 glow-on-hover">
                              <div className="d-flex align-items-center gap-3">
                                <div className="story-avatar">{getInitials(c.name)}</div>
                                <div className="flex-grow-1">
                                  <div className="fw-semibold">{c.name}</div>
                                  <div className="text-white small">{c.role}</div>
                                </div>
                              </div>
                              <ul className="dev-points mt-3">
                                {c.bullets.map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            </article>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile controls */}
                <button className="dev-nav dev-prev d-md-none" onClick={goPrevDev} aria-label="Previous creators">‹</button>
                <button className="dev-nav dev-next d-md-none" onClick={goNextDev} aria-label="Next creators">›</button>

                {/* Dots */}
                <div className="dev-dots">
                  {Array.from({ length: devTotal }).map((_, i) => (
                    <button
                      key={i}
                      className={`dev-dot ${i === devIndex ? 'active' : ''}`}
                      onClick={() => setDevIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <p className="privacy-note mt-3">
                * Names are partially hidden to respect privacy. Profiles represent real backgrounds across top companies and industries.
              </p>
            </div>
          </div>
          {/* /Resume Creators */}

          {/* Mission */}
          <div className="row mt-5">
            <div className="col-12 col-lg-10 mx-auto">
              <div className="card soft-card border-0 p-4 p-md-5">
                <h2 className="h3 mb-3">Our Mission</h2>
                <p className="mb-0">
                  Transform your experience into clear, measurable impact. We structure your story,
                  align it to target roles, and optimize across resume, LinkedIn, and interviews—so
                  recruiters immediately see your fit.
                </p>
              </div>
            </div>
          </div>

          {/* Success Stories Carousel (same custom carousel style) */}
          <div className="row mt-5">
            <div className="col-12">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h3 fw-bold mb-0">Success Stories</h2>
                <div className="d-none d-md-flex gap-2">
                  <button className="btn btn-outline-light btn-sm rounded-pill px-3" onClick={goPrevStory}>‹ Prev</button>
                  <button className="btn btn-light btn-sm rounded-pill px-3" onClick={goNextStory}>Next ›</button>
                </div>
              </div>

              <div className="dev-carousel-wrap" ref={storyWrapRef}>
                <div
                  className="dev-track"
                  style={{ transform: `translateX(-${storyIndex * 100}%)` }}
                >
                  {storySlides.map((group, slideIdx) => (
                    <div className="dev-slide" key={slideIdx}>
                      <div className="row g-4">
                        {group.map((s, j) => (
                          <div className="col-12 col-md-6 col-lg-4" key={`${slideIdx}-${j}`}>
                            <article className="story-card h-100 glow-on-hover fade-in-up">
                              <div className="story-quote">“{s.quote}”</div>
                              <div className="d-flex align-items-center mt-3">
                                <div className="story-avatar" aria-hidden="true">{getInitials(s.name)}</div>
                                <div className="ms-3">
                                  <div className="fw-semibold">{s.name}</div>
                                  <div className="text-white small">{s.title}</div>
                                </div>
                                <span className="ms-auto badge bg-accent text-dark rounded-pill">{s.outcome}</span>
                              </div>
                            </article>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile controls */}
                <button className="dev-nav dev-prev d-md-none" onClick={goPrevStory} aria-label="Previous stories">‹</button>
                <button className="dev-nav dev-next d-md-none" onClick={goNextStory} aria-label="Next stories">›</button>

                {/* Dots */}
                <div className="dev-dots">
                  {Array.from({ length: storyTotal }).map((_, i) => (
                    <button
                      key={i}
                      className={`dev-dot ${i === storyIndex ? 'active' : ''}`}
                      onClick={() => setStoryIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* /Success Stories */}
        </div>
      </section>
    </div>
  );
}
