import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/admin.css";

export default function AdminInfluencers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  /* ------------------- Load Influencers ------------------- */
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/admin/influencers", { params: { q } });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load influencers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ------------------- Create Influencer ------------------- */
  const createInfluencer = async () => {
    try {
      if (!form.name || !form.email || !form.password) return alert("Fill all fields");
      setCreating(true);
      await api.post("/admin/influencers", form);
      setForm({ name: "", email: "", password: "" });
      await load();
      alert("Influencer created");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create influencer");
    } finally {
      setCreating(false);
    }
  };

  /* ------------------- Update Password ------------------- */
  const updatePassword = async (id) => {
    const newPass = prompt("Enter new password:");
    if (!newPass) return;
    try {
      await api.patch(`/admin/influencers/${id}/password`, { password: newPass });
      await load();
      alert("Password updated");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update password");
    }
  };

  /* ------------------- Delete Influencer ------------------- */
  const deleteInfluencer = async (id) => {
    if (!window.confirm("Delete this influencer?")) return;
    try {
      await api.delete(`/admin/influencers/${id}`);
      await load();
      alert("Deleted");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete influencer");
    }
  };

  return (
    <div className="page-wrap">
      <h2 className="page-title text-white">Influencers</h2>

      {/* Search */}
      <div className="toolbar">
        <input
          className="input"
          placeholder="Search name / email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          Search
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* Create Form */}
      <div className="soft-card p-3 mb-4">
        <h4 className="text-dark">Create New Influencer</h4>
        <div className="d-flex gap-2 mt-2">
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button className="btn btn-primary" onClick={createInfluencer} disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th><span className="text-white">Name</span></th>
              <th><span className="text-white">Email</span></th>
              <th><span className="text-white">Password</span></th>
              <th><span className="text-white">Users Referred</span></th>
              <th><span className="text-white">Orders</span></th>
              <th><span className="text-white">Referral Link</span></th>
              <th><span className="text-white">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((inf) => (
              <tr key={inf._id}>
                <td>{inf.name}</td>
                <td>{inf.email}</td>
                <td>{inf.plainPassword || "—"}</td>
                <td>{inf.stats?.usersReferred ?? 0}</td>
                <td>{inf.stats?.orders ?? 0}</td>
                <td>
                  <a
                    href={`${window.location.origin}/register?ref=${inf.referralCode}`}
                    target="_blank" rel="noreferrer"
                  >
                    <span className="text-dark">{inf.referralCode}</span>
                  </a>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline text-dark"
                      onClick={() => updatePassword(inf._id)}
                    >
                      Update Password
                    </button>
                    <button
                      className="btn btn-sm btn-danger text-dark"
                      onClick={() => deleteInfluencer(inf._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan="7" className="empty">No influencers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
