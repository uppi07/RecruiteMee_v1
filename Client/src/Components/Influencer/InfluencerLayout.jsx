import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import "../../styles/influencer.css";

export default function InfluencerLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("inf_token");
    localStorage.removeItem("inf_name");
    navigate("/influencer/login");
  };

  return (
    <div className="inf-layout">
      {/* Sidebar */}
      <aside className="inf-sidebar">
        <h2 className="inf-logo">Influencer</h2>
        <nav>
          <button onClick={() => navigate("/influencer/dashboard")}>Dashboard</button>
          <button onClick={() => navigate("/influencer/orders")}>Orders</button>
          <button onClick={() => navigate("/influencer/queries")}>Queries</button>
          <button onClick={() => navigate("/influencer/payouts")}>Payouts</button>
          <button onClick={logout} className="logout">Logout</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="inf-main">
        <header className="inf-header">
          <h1>Influencer Panel</h1>
        </header>
        <section className="inf-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
