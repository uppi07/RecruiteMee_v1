import React, { useEffect, useState, useRef } from "react";
import { api } from "../../lib/api";

export default function InfluencerDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState("");
  const abortRef = useRef(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setErr("");

      const token = localStorage.getItem("inf_token");
      if (!token) {
        setErr("Please log in to view your dashboard.");
        setData(null);
        return;
      }

      abortRef.current?.abort?.();
      abortRef.current = new AbortController();

      const resp = await api.get("/influencer/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (resp?.data?.ok) {
        setData(resp.data);
      } else {
        setErr(resp?.data?.message || "Failed to load dashboard");
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) setErr("Unauthorized. Please log in again.");
      else if (status === 403) setErr("Access denied.");
      else setErr(e?.response?.data?.message || "Server error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => abortRef.current?.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Skeleton = () => (
    <div>
      <div className="inf-stats" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-card" style={{ opacity: 0.6 }}>
            <div style={{ height: 20, width: 140, marginBottom: 6, borderRadius: 6, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ height: 28, width: 70, borderRadius: 6, background: "rgba(255,255,255,0.12)" }} />
          </div>
        ))}
      </div>
      <div className="referral-box" style={{ marginTop: 18 }}>
        <div style={{ height: 18, width: 320, borderRadius: 6, background: "rgba(255,255,255,0.08)" }} />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        <h2>Influencer Panel</h2>
        <Skeleton />
      </div>
    );
  }

  if (err) {
    return (
      <div>
        <h2>Influencer Panel</h2>
        <div className="alert alert-danger" style={{ marginTop: 12 }}>{err}</div>
        <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={load}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h2>Influencer Panel</h2>
        <div className="alert alert-secondary" style={{ marginTop: 12 }}>No data to display.</div>
      </div>
    );
  }

  const regs = data.stats?.registrations ?? data.stats?.usersReferred ?? 0;
  const orders = data.stats?.orders ?? 0;
  const balance = data.stats?.balance ?? 0;

  return (
    <div>
      <h2>Welcome, {data.influencer?.name}</h2>

      <div className="inf-stats" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="stat-card">
          <h3>Users Referred</h3>
          <p>{regs}</p>
        </div>
        <div className="stat-card">
          <h3>Orders</h3>
          <p>{orders}</p>
        </div>
        <div className="stat-card">
          <h3>Balance</h3>
          <p>₹{balance}</p>
        </div>
      </div>

      <div className="referral-box" style={{ marginTop: 18 }}>
        Referral Link:&nbsp;
        {data.influencer?.referralLink ? (
          <a href={data.influencer.referralLink} target="_blank" rel="noreferrer">
            {data.influencer.referralLink}
          </a>
        ) : <span>-</span>}
      </div>
      <div className="inf-note" style={{
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "rgba(122,165,255,0.08)",
  border: "1px dashed rgba(122,165,255,0.35)",
  lineHeight: 1.4
}}>
  <strong>Note:</strong> Registration alone doesn’t earn ₹50. The referred user must
  <em> submit a Resume for Review</em> once. After their first review is submitted,
  ₹50 will be added to your balance automatically.
</div>

    </div>
  );
}
