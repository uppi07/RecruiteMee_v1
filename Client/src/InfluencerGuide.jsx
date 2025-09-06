import React, { useEffect } from "react";

export default function InfluencerGuide() {
  useEffect(() => {
    const css = `
    :root{
      --bg:#0b0a06;            /* deep noir */
      --bg2:#121008;           /* panel */
      --ink:#fff8e6;           /* warm ivory */
      --ink-dim:#f3e1b2;       /* muted ivory */
      --ink-soft:#e8cc85;      /* soft gold text */
      --gold:#f5c451;          /* primary gold */
      --gold-2:#e0b03a;        /* secondary */
      --gold-3:#8c6b1f;        /* dark gold */
      --line:#3a2c12;
      --radius:18px;
      --shadow:0 12px 32px rgba(0,0,0,.5);
    }
    .igold{
      min-height:100vh;
      color:var(--ink);
      background:
        radial-gradient(120% 70% at 65% -10%, #1a1409 0%, var(--bg) 55%),
        linear-gradient(180deg, #0d0a06, #0b0a06);
      font-family: Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Arial;
      padding:32px 18px 60px;
    }
    .ig-max{ max-width: 980px; margin:0 auto; }

    .ig-title{
      margin:0 0 14px;
      font-weight:900;
      letter-spacing:.2px;
      font-size:clamp(1.6rem, 1.2rem + 2vw, 2.4rem);
      background: linear-gradient(92deg, #fff3c8, var(--gold), var(--gold-2));
      -webkit-background-clip:text; background-clip:text; color:transparent;
      text-shadow: 0 0 0 rgba(0,0,0,0); /* crisp gradient text */
    }

    .ig-card{
      background:
        linear-gradient(180deg, rgba(255,226,157,.10), rgba(240,196,92,.08)) border-box,
        linear-gradient(180deg, var(--bg2), var(--bg2)) padding-box;
      border:1px solid rgba(245,196,81,.30);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      overflow:hidden;
    }

    .ig-headerbar{
      padding:14px 18px;
      border-bottom:1px solid rgba(245,196,81,.25);
      background:linear-gradient(180deg, rgba(245,196,81,.08), rgba(245,196,81,.03));
      color:var(--ink-dim);
      font-weight:700;
      letter-spacing:.3px;
    }

    .ig-doc{
      padding:22px 22px 28px;
      line-height:1.65;
      font-size:1.02rem;
    }

    .ig-doc h2, .ig-doc h3, .ig-doc h4{
      color:var(--ink);
      margin:18px 0 8px;
      font-weight:800;
    }
    .ig-doc h2{
      font-size:1.35rem;
      border-left:4px solid var(--gold);
      padding-left:10px;
    }
    .ig-doc h3{ font-size:1.12rem; color:#ffe9b5; }
    .ig-doc h4{ font-size:1rem; color:#ffe2a2; }

    .ig-doc p{ margin:10px 0; color:var(--ink); }
    .ig-doc .dim{ color:var(--ink-dim); }

    .ig-doc ul{ margin:8px 0 12px 0; padding-left:0; list-style:none; }
    .ig-doc li{
      margin:6px 0; padding-left:26px; position:relative; color:var(--ink);
    }
    .ig-doc li::before{
      content:"";
      position:absolute; left:6px; top:.62em;
      width:8px; height:8px; border-radius:999px;
      background: radial-gradient(circle at 30% 30%, #fff3c8, var(--gold));
      box-shadow:0 0 0 2px rgba(245,196,81,.22);
    }

    .ig-callout{
      margin:14px 0;
      padding:12px 14px;
      border-left:4px solid var(--gold-2);
      background:linear-gradient(180deg, rgba(245,196,81,.10), rgba(245,196,81,.06));
      border-radius:12px;
      color:#fff2c6;
      font-weight:700;
    }

    .ig-doc a{ color:#ffe08a; text-decoration:underline dotted; }
    .ig-doc hr{
      border:0; height:1px; margin:18px 0;
      background:linear-gradient(90deg, rgba(245,196,81,0), rgba(245,196,81,.45), rgba(245,196,81,0));
    }
    `;
    const el = document.createElement("style");
    el.id = "influencer-gold-styles";
    el.textContent = css;
    document.head.appendChild(el);
    return () => document.getElementById("influencer-gold-styles")?.remove();
  }, []);

  return (
    <div className="igold">
      <div className="ig-max">
        <h1 className="ig-title">RecruiteMee — Influencer Kit ✨</h1>

        <div className="ig-card">
          <article className="ig-doc">

            <h2>1. About RecruiteMee</h2>
            <p>
              RecruiteMee is a human-crafted resume and ATS optimization service. Unlike
              AI-driven resume generators, every resume is carefully built and reviewed by experts,
              ensuring recruiters can’t reject and ATS systems can’t block your profile due to
              keyword gaps or poor formatting.
            </p>
            <p className="dim">
              Our mission is simple: Help students and professionals land more interviews with
              personalized, recruiter-friendly resumes.
            </p>

            <h3>📊 Current Stats</h3>
            <ul>
              <li><strong>218+ Resumes Created</strong> — Across multiple domains (tech, finance, design, civil, mechanical, business, electrical).</li>
              <li><strong>170+ Interviews Scheduled</strong> — Thanks to recruiter-friendly keywords and ATS-optimized resumes.</li>
              <li><strong>85% Avg. ATS Score</strong> — Verified across common Applicant Tracking Systems.</li>
              <li><strong>99% Satisfaction Rate</strong> — Measured from post-delivery client feedback.</li>
            </ul>

            <h3>Placements Impact</h3>
            <ul>
              <li>Students using RecruiteMee resumes got <strong>3–4x more interview shortlists</strong> compared to their old resumes.</li>
              <li>Many cracked campus placements in top IT &amp; core firms like <strong>TCS, Infosys, Accenture, Capgemini, Cognizant, Zoho, Amazon, HCL, Airtel, L&amp;T</strong>, and more.</li>
              <li>Freshers from <strong>MCA, B.Tech, B.Com, MBA</strong> backgrounds reported faster shortlisting and smoother interview calls.</li>
              <li>Tailored resumes + recruiter keywords → higher success in both campus &amp; off-campus drives.</li>
            </ul>

            <div className="ig-callout">
              👉 RecruiteMee resumes = better visibility, more interviews, and higher placement chances.
            </div>

            <h2>2. Role of an Influencer</h2>
            <p>As a RecruiteMee Influencer, you play a key role in:</p>
            <ul>
              <li>Sharing RecruiteMee’s services with students, job seekers, and professionals.</li>
              <li>Guiding your audience to use your unique referral link to sign up.</li>
              <li>Building trust and awareness through authentic promotion.</li>
            </ul>
            <p className="dim">
              You can feel proud knowing that every referral you make contributes to someone’s job journey. 🎓✨
            </p>
            <p>And the best part?</p>
            <ul>
              <li>You can proudly suggest our services to students without hesitation.</li>
              <li>
                After joining us, you have the full right to ask students for feedback and reviews about RecruiteMee
                anytime — because we believe in full transparency.
              </li>
            </ul>
            <p>👉 This isn’t just a referral program, it’s about impacting lives while you earn.</p>

            <h3>🚀 How to Join Our Referral Program</h3>
            <p>If you’re interested in becoming a RecruiteMee Influencer:</p>
            <ul>
              <li>Send us an email with the following details:</li>
              <li>Your Full Name</li>
              <li>Your Contact Number / Email ID</li>
              <li>Your Followers Count (Instagram, LinkedIn, YouTube, WhatsApp Groups, etc.)</li>
              <li>Your Audience Reach / Engagement info</li>
            </ul>
            <p>Mail to: 📩 <a href="mailto:support@recruitemee.com">support@recruitemee.com</a></p>
            <p>
              Once we receive your request, we will get back to you with your official influencer
              credentials (referral link + dashboard access).
            </p>

            <h3>📈 Influencer Stats (as of now)</h3>
            <ul>
              <li><strong>Active Influencers:</strong> 8</li>
              <li><strong>Users Reached / Registered:</strong> 3,000+</li>
              <li><strong>Orders Generated:</strong> 200+ successful resume services</li>
              <li><strong>Payouts:</strong> ₹1,50,000+ distributed (every ~3 weeks cycle)</li>
            </ul>
            <p>
              👉 These numbers show that even with a small group of influencers, RecruiteMee has been able to
              reach thousands of students, create hundreds of resumes, and pay out lakhs in commissions.
              As we grow, you too can be part of this success story.
            </p>

            <h2>3. Policies &amp; Guidelines</h2>
            <h3>✅ Do’s:</h3>
            <ul>
              <li>Share only your official referral link (found in your dashboard).</li>
              <li>Promote honestly — highlight real benefits (ATS-friendly, human-crafted resumes, higher interview chances).</li>
              <li>Use approved creatives (images, posts, WhatsApp/Instagram captions) provided by RecruiteMee.</li>
              <li>Maintain professionalism in tone and approach.</li>
            </ul>

            <h3>❌ Don’ts:</h3>
            <ul>
              <li>Do not spam links or mislead users.</li>
              <li>Do not make false guarantees about job placements.</li>
              <li>Do not copy or resell our services outside the official platform.</li>
              <li>Do not misuse influencer access or data.</li>
            </ul>
            <p className="dim">
              Violations may lead to temporary suspension or permanent removal from the program.
            </p>

            <h2>4. Payouts &amp; Rewards</h2>
            <ul>
              <li><strong>One successful referral:</strong> Registration + Resume Review.</li>
              <li><strong>Per Successful Referral: </strong> Earn ₹50 per valid referral (amount may increase in the future).</li>
              <li><strong>Per Successful Order:</strong> For services like Create Resume from Scratch or Resume Rewrite, you will earn ₹150 – ₹200 per order.</li>
              <li><strong>Bonuses:</strong> Special monthly rewards for top-performing influencers.</li>
            </ul>

            <h4>Payout Conditions:</h4>
            <ul>
              <li>You must refer at least 50+ users.</li>
              <li>You must generate at least 10+ orders.</li>
              <li>Only if these conditions are met, you are eligible for payouts.</li>
            </ul>

            <h4>Payout Cycle:</h4>
            <ul>
              <li>Payments will be processed within 7 days of payout request (once eligibility conditions are met).</li>
              <li>Minimum payout threshold: ₹2500.</li>
              <li>Payment Mode: UPI / Bank Transfer / Paytm / Other wallet (as per availability).</li>
            </ul>

            <h4>Negotiations:</h4>
            <p className="dim">
              We value our influencers and their efforts. Payout amounts may be negotiable based on your reach,
              engagement, and performance. Special terms can be discussed individually for influencers with large
              audiences or strong conversions.
            </p>

            <h2>5. Tracking &amp; Dashboard</h2>
            <p>Your Influencer Dashboard shows:</p>
            <ul>
              <li>Registrations via your link</li>
              <li>Resume rewrite / form orders booked</li>
              <li>Total earnings &amp; payout status</li>
              <li>Unique referral link for promotions</li>
            </ul>

            <h2>6. Support</h2>
            <p>If you face any issue (tracking, payouts, link errors): <br />
              📩 Contact: <a href="mailto:support@recruitemee.com">support@recruitemee.com</a>
            </p>

          </article>
        </div>
      </div>
    </div>
  );
}
