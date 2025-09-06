// Client/src/Components/CreateResume/createresume.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../Navbar/nav.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './createresume.css';
import { api } from '../../lib/api';

const emptyWork = { jobTitle: "", company: "", location: "", start: "", end: "", responsibilities: "" };
const emptyEdu = { degree: "", institution: "", location: "", start: "", end: "", major: "" };
const emptyProject = { name: "", desc: "", tech: "", role: "", link: "" };
const emptyCert = { name: "", org: "", date: "" };
const emptyLang = { name: "", level: "" };

const Req = () => <span className="text-danger ms-1">*</span>;

const ROLE_SUGGESTIONS = {
  "Computer Science / Software Engineering": [
    "Software Engineer", "Full Stack Developer", "Backend Engineer", "Frontend Developer",
    "Java Developer", "Mobile App Developer", "DevOps Engineer", "Cloud Engineer",
    "Site Reliability Engineer (SRE)", "Application Developer", "Systems Engineer",
    "QA/Automation Engineer", "Web Developer", "API Developer", "Release Engineer",
  ],
  "Information Technology": [
    "IT Support Specialist","Systems Administrator","Network Administrator",
    "Database Administrator","Cloud Support Engineer","IT Consultant","Helpdesk Engineer",
  ],
  "Data Science": [
    "Data Analyst","Data Scientist","Business Intelligence (BI) Analyst",
    "Quantitative Analyst","Research Scientist (Data)","Machine Learning Engineer",
  ],
  "Artificial Intelligence / Machine Learning": [
    "AI Engineer","Machine Learning Engineer","Deep Learning Engineer",
    "NLP Engineer","Computer Vision Engineer","AI Research Scientist",
  ],
  "Computer Applications": [
    "Application Support Engineer","Web Developer","Mobile App Developer",
    "Software Tester","Desktop Application Developer",
  ],
  "Electrical Engineering": [
    "Electrical Engineer","Power Systems Engineer","Control Systems Engineer",
    "Embedded Systems Engineer","Hardware Engineer",
  ],
  "Mechanical Engineering": [
    "Mechanical Engineer","Design Engineer (CAD/CAE)","Manufacturing Engineer",
    "Quality Assurance Engineer","Product Engineer",
  ],
  "Civil Engineering": [
    "Civil Engineer","Structural Engineer","Project Engineer (Civil)",
    "Construction Engineer","Transportation Engineer",
  ],
  "Business Administration": [
    "Business Analyst","Operations Manager","HR Specialist",
    "Product Manager","Project Coordinator",
  ],
  "Business Analytics": [
    "Business Analyst","Data Analyst","BI Analyst","Product Analyst","Market Research Analyst",
  ],
};

const Createresume = () => {
  const [degreeLevel, setDegreeLevel] = useState("");
  const [majorPrimary, setMajorPrimary] = useState("");
  const [majorOther, setMajorOther] = useState("");

  // currency kept for payload
  const [currency] = useState("INR");

  // single-select role + "Other" free text
  const [selectedRole, setSelectedRole] = useState("");
  const [otherRoleText, setOtherRoleText] = useState("");

  const [pid, setPid] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");

  const [summary, setSummary] = useState("");

  const [work, setWork] = useState([{ ...emptyWork }]);
  const [edu, setEdu] = useState([{ ...emptyEdu }]);
  const [projects, setProjects] = useState([{ ...emptyProject }]);
  const [certs, setCerts] = useState([{ ...emptyCert }]);
  const [langs, setLangs] = useState([{ ...emptyLang }]);

  const [techSkills, setTechSkills] = useState("");
  const [softSkills, setSoftSkills] = useState("");

  // NEW: loading state
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const storedUser = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  useEffect(() => {
    if (storedUser?.id) setPid(storedUser.id);
    if (storedUser?.name) setFullName(storedUser.name);
    if (storedUser?.email) setEmail(storedUser.email);
  }, [storedUser]);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) navigate('/');
  }, [navigate]);

  const roleOptions = useMemo(() => {
    if (ROLE_SUGGESTIONS[majorPrimary]) return ROLE_SUGGESTIONS[majorPrimary];
    if (degreeLevel === "Diploma") return ["Trainee/Intern", "Junior Technician", "Support Engineer (Junior)"];
    if (degreeLevel === "PhD") return ["Research Assistant", "Research Engineer", "Data Scientist", "ML Engineer"];
    return [];
  }, [degreeLevel, majorPrimary]);

  useEffect(() => {
    if (selectedRole && !roleOptions.includes(selectedRole) && selectedRole !== "Other" && selectedRole !== "N/A") {
      setSelectedRole("");
    }
  }, [roleOptions, selectedRole]);

  useEffect(() => {
    if (selectedRole !== "Other") setOtherRoleText("");
  }, [selectedRole]);

  const onSubmit = async (e) => {
    e.preventDefault();

    let roleForPayload = "";
    if (!selectedRole) {
      alert("Please choose a target role (or pick N/A to skip).");
      return;
    }
    if (selectedRole === "Other") {
      const txt = otherRoleText.trim();
      if (!txt) {
        alert('Please type your role in "Other" (e.g., Analyst, Consultant, Associate).');
        return;
      }
      roleForPayload = txt.slice(0, 80);
    } else if (selectedRole === "N/A") {
      roleForPayload = "N/A";
    } else {
      roleForPayload = selectedRole;
    }

    const payload = {
      degreeLevel, majorPrimary, majorOther,
      targetRoles: [roleForPayload],
      personal: { pid, fullName, email, phone, address, linkedin, github },
      summary,
      work, edu,
      skills: { techSkills, softSkills },
      projects, certs, langs,
      currency,
    };

    try {
      setSaving(true); // start loader
      const { data } = await api.post('/resume', payload);

      alert(data.message || 'Saved!');

      // reset (keep PID/name/email from profile)
      setDegreeLevel(""); setMajorPrimary(""); setMajorOther("");
      setSelectedRole(""); setOtherRoleText("");
      setFullName(storedUser?.name || ""); setEmail(storedUser?.email || "");
      setPhone(""); setAddress(""); setLinkedin(""); setGithub("");
      setSummary("");
      setWork([{ ...emptyWork }]); setEdu([{ ...emptyEdu }]);
      setProjects([{ ...emptyProject }]); setCerts([{ ...emptyCert }]);
      setLangs([{ ...emptyLang }]); setTechSkills(""); setSoftSkills("");

      if (data?.orderId) navigate(`/checkout?orderId=${encodeURIComponent(data.orderId)}`);
    } catch (err) {
      console.error('POST /resume failed:', err);
      if (err.response) {
        alert(err.response.data?.message || 'Failed to save resume (server error)');
      } else if (err.request) {
        alert('Failed to save resume: No response from server');
      } else {
        alert('Failed to save resume: ' + err.message);
      }
    } finally {
      setSaving(false); // stop loader
    }
  };

  return (
    <div className="cr-page">
      <Nav />

      <header className="cr-hero">
        <div className="container py-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h1 className="display-6 text-white mb-1 font-weight-bold">Resume Builder</h1>
              <p className="text-white-50 mb-0">
                Craft an ATS-optimized resume for faster shortlisting.
              </p>
            </div>

            {/* optional live hint chip */}
            <div className="d-none d-md-flex align-items-center gap-2">
              <span className="chip" title="Auto-save on submit">
                <strong>Tip:</strong> Keep fields short; use N/A if not applicable.
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="home-cont-1">
        <div className="container my-4">
          <div className="alert alert-info small mb-0">
            <span className="text-white">
              Note: All fields are required. If a field doesn’t apply, type <strong>N/A</strong>.
            </span>
          </div>
        </div>

        {/* disable everything while saving */}
        <form onSubmit={onSubmit} className="cr-form">
          <fieldset disabled={saving} aria-busy={saving}>
            {/* Step 1: Degree + Role */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">1</div>
                  <div>
                    <h4 className="mb-0">
                      Degree Information
                      <span className="badge bg-accent text-dark ms-2">Required</span>
                    </h4>
                    <small className="text-muted">Choose degree level and primary major.</small>
                  </div>
                </div>

                <div className="row g-3 mt-2">
                  <div className="col-md-6">
                    <label className="form-label">Degree Level<Req /></label>
                    <select className="form-select" value={degreeLevel} onChange={(e) => setDegreeLevel(e.target.value)} required>
                      <option value="">Select degree level</option>
                      <option value="Bachelors">Bachelor’s</option>
                      <option value="Masters">Master’s</option>
                      <option value="Diploma">Diploma</option>
                      <option value="PhD">PhD</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Major (for selected degree)<Req /></label>
                    <select
                      className="form-select"
                      value={majorPrimary}
                      onChange={(e) => { setMajorPrimary(e.target.value); }}
                      required
                    >
                      <option value="">Select major</option>
                      {[
                        "Computer Science / Software Engineering",
                        "Information Technology",
                        "Data Science",
                        "Artificial Intelligence / Machine Learning",
                        "Computer Applications",
                        "Electrical Engineering",
                        "Mechanical Engineering",
                        "Civil Engineering",
                        "Business Administration",
                        "Business Analytics",
                        "Other",
                        "N/A",
                      ].map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                  </div>

                  {majorPrimary === "Other" && (
                    <div className="col-12">
                      <label className="form-label">If “Other”, specify major<Req /></label>
                      <input
                        className="form-control"
                        placeholder="If not applicable, type N/A"
                        value={majorOther}
                        onChange={(e) => setMajorOther(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Single-select Target Job Role */}
                <div className="mt-4 pt-3 border-top">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <div className="step-dot step-dot-sub">1b</div>
                    <h5 className="mb-0">
                      Target Job Role (Any related role) <span className="badge bg-accent text-dark ms-2">Required</span>
                    </h5>
                  </div>
                  <small className="text-muted d-block mb-2">
                    Based on your degree/major, select <strong>one</strong> role you’re aiming for. Choose <em>N/A</em> to skip.
                  </small>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Role<Req /></label>
                      <select
                        className="form-select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        required
                      >
                        <option value="">Select a role</option>
                        {(ROLE_SUGGESTIONS[majorPrimary] || []).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                        {(!ROLE_SUGGESTIONS[majorPrimary] && degreeLevel === "Diploma") && ["Trainee/Intern", "Junior Technician", "Support Engineer (Junior)"].map(r => <option key={r} value={r}>{r}</option>)}
                        {(!ROLE_SUGGESTIONS[majorPrimary] && degreeLevel === "PhD") && ["Research Assistant", "Research Engineer", "Data Scientist", "ML Engineer"].map(r => <option key={r} value={r}>{r}</option>)}
                        <option value="Other">Other (type below)</option>
                        <option value="N/A">N/A (skip)</option>
                      </select>
                    </div>

                    {selectedRole === "Other" && (
                      <div className="col-md-6">
                        <label className="form-label">Your Role (free text)<Req /></label>
                        <input
                          className="form-control"
                          value={otherRoleText}
                          onChange={(e) => setOtherRoleText(e.target.value)}
                          placeholder="e.g., Analyst, Consultant, Associate"
                          maxLength={80}
                          required
                        />
                        <div className="form-text">{otherRoleText.length}/80</div>
                      </div>
                    )}
                  </div>

                  {!ROLE_SUGGESTIONS[majorPrimary] && degreeLevel !== "Diploma" && degreeLevel !== "PhD" && (
                    <div className="alert alert-secondary small mt-2 mb-0">
                      Select a degree level and major to see suggested roles — or choose <strong>Other</strong>/<strong>N/A</strong>.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Step 2: Personal */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">2</div>
                  <div>
                    <h4 className="mb-0">Personal Information <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <small className="text-muted">Your contact and profile links.</small>
                  </div>
                </div>

                <div className="row g-3 mt-2">
                  <div className="col-md-4">
                    <label className="form-label">Profile ID<Req /></label>
                    <input className="form-control" value={pid} readOnly required placeholder="Auto-filled; if blank contact support" />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Full Name<Req /></label>
                    <input className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="If not applicable, type N/A" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email Address<Req /></label>
                    <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@email.com" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone Number<Req /></label>
                    <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="If not applicable, type N/A" />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Address<Req /></label>
                    <input className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="If not applicable, type N/A" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">LinkedIn<Req /></label>
                    <input className="form-control" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} required placeholder="https://www.linkedin.com/in/your-handle — or type N/A" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">GitHub / Portfolio<Req /></label>
                    <input className="form-control" value={github} onChange={(e) => setGithub(e.target.value)} required placeholder="https://your-site — or N/A" />
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Summary */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">3</div>
                  <div>
                    <h4 className="mb-0">Professional Summary <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <small className="text-muted">2–3 impact lines. If not applicable, type N/A.</small>
                  </div>
                </div>
                <textarea className="form-control mt-3" rows={3} placeholder="If not applicable, type N/A" value={summary} onChange={(e) => setSummary(e.target.value)} required />
                <div className="text-end small text-muted mt-1">{summary.length}/300</div>
              </div>
            </section>

            {/* Step 4: Work */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">4</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h4 className="mb-0">Work Experience <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <button type="button" className="btn btn-sm btn-accent ms-auto" onClick={() => setWork([...work, { ...emptyWork }])}>+ Add Entry</button>
                  </div>
                </div>

                {work.map((w, i) => (
                  <div key={i} className="entry-box">
                    <div className="entry-head">
                      <span className="entry-index">#{i + 1}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setWork(work.length > 1 ? work.filter((_, idx) => idx !== i) : work)}>Remove</button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Job Title<Req /></label>
                        <input className="form-control" value={w.jobTitle} onChange={(e) => setWork(work.map((it, idx) => idx === i ? { ...it, jobTitle: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Company<Req /></label>
                        <input className="form-control" value={w.company} onChange={(e) => setWork(work.map((it, idx) => idx === i ? { ...it, company: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Location<Req /></label>
                        <input className="form-control" value={w.location} onChange={(e) => setWork(work.map((it, idx) => idx === i ? { ...it, location: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>

                      <div className="col-md-3">
                        <label className="form-label">Start (YYYY-MM or N/A)<Req /></label>
                        <input className="form-control" value={w.start} onChange={(e) => setWork(work.map((it, idx) => idx === i ? { ...it, start: e.target.value } : it))} required placeholder="YYYY-MM or N/A" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">End / Present (YYYY-MM or N/A)<Req /></label>
                        <input className="form-control" value={w.end} onChange={(e) => setWork(work.map((it, idx) => idx === i ? { ...it, end: e.target.value } : it))} required placeholder="YYYY-MM or N/A" />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Responsibilities / Achievements<Req /></label>
                        <textarea className="form-control" rows={3} value={w.responsibilities} onChange={(e) => setWork(work.map((it, idx) => idx === i ? { ...it, responsibilities: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 5: Education */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">5</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h4 className="mb-0">Education <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <button type="button" className="btn btn-sm btn-accent ms-auto" onClick={() => setEdu([...edu, { ...emptyEdu }])}>+ Add Entry</button>
                  </div>
                </div>

                {edu.map((ed, i) => (
                  <div key={i} className="entry-box">
                    <div className="entry-head">
                      <span className="entry-index">#{i + 1}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setEdu(edu.length > 1 ? edu.filter((_, idx) => idx !== i) : edu)}>Remove</button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Degree / Qualification<Req /></label>
                        <input className="form-control" value={ed.degree} onChange={(e) => setEdu(edu.map((it, idx) => idx === i ? { ...it, degree: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Institution<Req /></label>
                        <input className="form-control" value={ed.institution} onChange={(e) => setEdu(edu.map((it, idx) => idx === i ? { ...it, institution: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Location<Req /></label>
                        <input className="form-control" value={ed.location} onChange={(e) => setEdu(edu.map((it, idx) => idx === i ? { ...it, location: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>

                      <div className="col-md-3">
                        <label className="form-label">Start (YYYY-MM or N/A)<Req /></label>
                        <input className="form-control" value={ed.start} onChange={(e) => setEdu(edu.map((it, idx) => idx === i ? { ...it, start: e.target.value } : it))} required placeholder="YYYY-MM or N/A" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">End (YYYY-MM or N/A)<Req /></label>
                        <input className="form-control" value={ed.end} onChange={(e) => setEdu(edu.map((it, idx) => idx === i ? { ...it, end: e.target.value } : it))} required placeholder="YYYY-MM or N/A" />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Major / Specialization<Req /></label>
                        <input className="form-control" value={ed.major} onChange={(e) => setEdu(edu.map((it, idx) => idx === i ? { ...it, major: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 6: Skills */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">6</div>
                  <div>
                    <h4 className="mb-0">Skills <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <small className="text-muted">Separate with commas. If not applicable, type N/A.</small>
                  </div>
                </div>

                <div className="row g-3 mt-1">
                  <div className="col-12">
                    <label className="form-label">Technical Skills<Req /></label>
                    <textarea className="form-control" rows={3} value={techSkills} onChange={(e) => setTechSkills(e.target.value)} required placeholder="e.g., React, Node.js — or N/A" />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Soft Skills<Req /></label>
                    <textarea className="form-control" rows={3} value={softSkills} onChange={(e) => setSoftSkills(e.target.value)} required placeholder="e.g., Communication — or N/A" />
                  </div>
                </div>
              </div>
            </section>

            {/* Step 7: Projects */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">7</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h4 className="mb-0">Projects <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <button type="button" className="btn btn-sm btn-accent ms-auto" onClick={() => setProjects([...projects, { ...emptyProject }])}>+ Add Entry</button>
                  </div>
                </div>

                {projects.map((p, i) => (
                  <div key={i} className="entry-box">
                    <div className="entry-head">
                      <span className="entry-index">#{i + 1}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setProjects(projects.length > 1 ? projects.filter((_, idx) => idx !== i) : projects)}>Remove</button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Project Name<Req /></label>
                        <input className="form-control" value={p.name} onChange={(e) => setProjects(projects.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Technologies<Req /></label>
                        <input className="form-control" value={p.tech} onChange={(e) => setProjects(projects.map((it, idx) => idx === i ? { ...it, tech: e.target.value } : it))} required placeholder="e.g., React, Node — or N/A" />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Description<Req /></label>
                        <textarea className="form-control" rows={3} value={p.desc} onChange={(e) => setProjects(projects.map((it, idx) => idx === i ? { ...it, desc: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Your Role<Req /></label>
                        <textarea className="form-control" rows={2} value={p.role} onChange={(e) => setProjects(projects.map((it, idx) => idx === i ? { ...it, role: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Project Link<Req /></label>
                        <input className="form-control" value={p.link} onChange={(e) => setProjects(projects.map((it, idx) => idx === i ? { ...it, link: e.target.value } : it))} required placeholder="https:// — or type N/A" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 8: Certifications */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">8</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h4 className="mb-0">Certifications <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <button type="button" className="btn btn-sm btn-accent ms-auto" onClick={() => setCerts([...certs, { ...emptyCert }])}>+ Add Entry</button>
                  </div>
                </div>

                {certs.map((c, i) => (
                  <div key={i} className="entry-box">
                    <div className="entry-head">
                      <span className="entry-index">#{i + 1}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setCerts(certs.length > 1 ? certs.filter((_, idx) => idx !== i) : certs)}>Remove</button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Certification Name<Req /></label>
                        <input className="form-control" value={c.name} onChange={(e) => setCerts(certs.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Issuing Organization<Req /></label>
                        <input className="form-control" value={c.org} onChange={(e) => setCerts(certs.map((it, idx) => idx === i ? { ...it, org: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Date (YYYY-MM or N/A)<Req /></label>
                        <input className="form-control" value={c.date} onChange={(e) => setCerts(certs.map((it, idx) => idx === i ? { ...it, date: e.target.value } : it))} required placeholder="YYYY-MM or N/A" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 9: Languages */}
            <section className="card soft-card mb-4">
              <div className="card-body">
                <div className="section-head">
                  <div className="step-dot">9</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h4 className="mb-0">Languages <span className="badge bg-accent text-dark ms-2">Required</span></h4>
                    <button type="button" className="btn btn-sm btn-accent ms-auto" onClick={() => setLangs([...langs, { ...emptyLang }])}>+ Add Entry</button>
                  </div>
                </div>

                {langs.map((l, i) => (
                  <div key={i} className="entry-box">
                    <div className="entry-head">
                      <span className="entry-index">#{i + 1}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setLangs(langs.length > 1 ? langs.filter((_, idx) => idx !== i) : langs)}>Remove</button>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Language<Req /></label>
                        <input className="form-control" value={l.name} onChange={(e) => setLangs(langs.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} required placeholder="If not applicable, type N/A" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Proficiency<Req /></label>
                        <select className="form-select" value={l.level} onChange={(e) => setLangs(langs.map((it, idx) => idx === i ? { ...it, level: e.target.value } : it))} required>
                          {["", "Beginner", "Intermediate", "Advanced", "Native", "N/A"].map((lev) => <option key={lev} value={lev}>{lev || "Select proficiency"}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </fieldset>

          {/* Desktop/Tablet actions */}
          <div className="d-none d-sm-flex flex-wrap gap-2 justify-content-end mb-5">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top
            </button>
            <button type="submit" className="btn btn-primary px-4" disabled={saving}>
              {saving ? "Saving…" : "Submit"}
            </button>
          </div>

          {/* Sticky mobile actions */}
          <div className="cr-mobile-actions d-sm-none">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              disabled={saving}
            >
              Top
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Submit"}
            </button>
          </div>
        </form>
      </main>

      {/* Loading overlay */}
      {saving && (
        <div className="cr-loading" role="alert" aria-live="assertive" aria-busy="true">
          <div className="cr-loader">
            <div className="spinner" aria-hidden="true" />
            <div className="msg">Saving your details…</div>
            <div className="sub">Please keep this tab open.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Createresume;
