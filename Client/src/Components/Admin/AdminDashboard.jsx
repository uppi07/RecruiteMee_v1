import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/admin.css";

const Kpi = ({ label, value }) => (
  <div className="kpi-card">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{Number.isFinite(value) ? value : 0}</div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");

        // Base counts (users, resumes) from /admin/stats
        const base = await api.get("/admin/stats");
        const baseStats = base?.data || {};

        // Orders endpoint already filters to paid only (server does paymentStatus:'paid')
        // Use limit=1 to only fetch metadata (total) and keep bandwidth tiny.
        const [allPaid, p, pr, c, f] = await Promise.all([
          api.get("/admin/orders", { params: { page: 1, limit: 1 } }),
          api.get("/admin/orders", { params: { status: "pending", page: 1, limit: 1 } }),
          api.get("/admin/orders", { params: { status: "processing", page: 1, limit: 1 } }),
          api.get("/admin/orders", { params: { status: "completed", page: 1, limit: 1 } }),
          api.get("/admin/orders", { params: { status: "failed", page: 1, limit: 1 } }),
        ]);

        setStats({
          users: baseStats.users ?? 0,
          resumes: baseStats.resumes ?? 0,
          // paid-only totals
          orders: allPaid?.data?.total ?? 0,
          ordersByStatus: {
            pending: p?.data?.total ?? 0,
            processing: pr?.data?.total ?? 0,
            completed: c?.data?.total ?? 0,
            failed: f?.data?.total ?? 0,
          },
        });
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load stats");
      }
    })();
  }, []);

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!stats) return <div>Loading…</div>;

  const s = stats.ordersByStatus || {};

  return (
    <div className="page-wrap">
      <h2 className="page-title text-white">Dashboard</h2>

      <div className="kpis">
        <Kpi label="Total Users" value={stats.users} />
        <Kpi label="Total Orders" value={stats.orders} /> {/* paid-only */}
        <Kpi label="Total Resumes" value={stats.resumes} />
      </div>

      <div className="kpis kpis-small mt-3">
        <Kpi label="Pending"    value={s.pending ?? 0} />
        <Kpi label="Processing" value={s.processing ?? 0} />
        <Kpi label="Completed"  value={s.completed ?? 0} />
        <Kpi label="Failed"     value={s.failed ?? 0} />
      </div>
    </div>
  );
}
