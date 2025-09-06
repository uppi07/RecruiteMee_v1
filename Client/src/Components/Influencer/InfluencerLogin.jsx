// Components/Influencer/InfluencerLogin.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "../../styles/influencer.css";

export default function InfluencerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // If we already have an influencer token, make sure axios uses it
  useEffect(() => {
    const t = localStorage.getItem("inf_token") || sessionStorage.getItem("infToken");
    if (t) {
      api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
      // optional: auto-redirect
      // nav("/influencer/dashboard", { replace: true });
    }
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      const { data } = await api.post("/influencer/login", {
        email: String(email || "").trim().toLowerCase(),
        password,
      });

      if (!data?.ok || !data?.token) {
        throw new Error(data?.message || "Invalid login");
      }

      // persist session (both, for safety) + prime axios auth header
      localStorage.setItem("inf_token", data.token);
      sessionStorage.setItem("infToken", data.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

      // Save influencer profile bits (unchanged keys)
      if (data.influencer) {
        localStorage.setItem("inf_id", data.influencer.id || "");
        localStorage.setItem("inf_name", data.influencer.name || "");
        localStorage.setItem("inf_email", data.influencer.email || "");
      }

      nav("/influencer/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <h2 className="title">Influencer Login</h2>

        {err && <div className="alert alert-danger">{err}</div>}

        <form onSubmit={submit} aria-busy={loading}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        {/* subtle inline spinner */}
        {loading && (
          <div className="mt-2 small text-muted" role="status">
            Authenticating…
          </div>
        )}
      </div>
    </div>
  );
}
