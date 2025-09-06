import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "../../styles/admin.css";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  const isActiveExact = (p) => pathname === p;
  const isActiveUnder = (p) => pathname === p || pathname.startsWith(p + "/");

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/");
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <span>RecruiteMee</span>
          <span className="brand-faint">Admin</span>
        </div>

        <nav className="menu">
          <Link className={`menu-link ${isActiveExact("/admin") ? "active" : ""}`} to="/admin">
            Dashboard
          </Link>
          <Link className={`menu-link ${isActiveUnder("/admin/orders") ? "active" : ""}`} to="/admin/orders">
            Orders
          </Link>
          <Link className={`menu-link ${isActiveUnder("/admin/users") ? "active" : ""}`} to="/admin/users">
            Users
          </Link>
          <Link className={`menu-link ${isActiveUnder("/admin/queries") ? "active" : ""}`} to="/admin/queries">
            Queries
          </Link>
          <Link className={`menu-link ${isActiveUnder("/admin/influencers") ? "active" : ""}`} to="/admin/influencers">
            Influencers
          </Link>
          <Link className={`menu-link ${isActiveUnder("/admin/influencer-queries") ? "active" : ""}`} to="/admin/influencer-queries">
            Influencer Queries
          </Link>
          <Link className={`menu-link ${isActiveUnder("/admin/influencer-payouts") ? "active" : ""}`} to="/admin/influencer-payouts">
          Influencer Payouts
          </Link>
        </nav>

        <div className="menu-bottom">
          <Link className="btn-ghost w-full block mb-2" to="/home">← Back to app</Link>
          <button className="btn-danger w-full" onClick={logout}>Logout</button>
        </div>
      </aside>

      <section className="admin-main">
        <div className="admin-topbar">
          <div className="title text-white">Control Panel</div>
          <div className="crumbs">
            <Link className="crumb" to="/home">Home</Link>
            <span className="sep">/</span>
            <span className="crumb active">Admin</span>
          </div>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
