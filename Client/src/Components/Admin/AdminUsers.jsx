// src/Components/Admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/admin.css";

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/admin/users", {
        params: { q: q.trim(), page: 1, limit: 50 },
      });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q]);

  const titleize = (s = "") =>
    s
      .replace(/[_\.\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");

  const displayName = (u = {}) => {
    if (u.name && u.name.trim()) return u.name;
    if (u.fullName && u.fullName.trim()) return u.fullName;
    if (u.firstName || u.lastName) return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    if (u.username && u.username.trim()) return titleize(u.username);
    if (u.email) return titleize(u.email.split("@")[0]);
    return "—";
  };

  return (
    <div className="page-wrap">
      <h2 className="page-title text-white">Users</h2>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search name / email / id"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          Search
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>
                <span className="text-white">ID</span>
              </th>
              <th>
                <span className="text-white">Name</span>
              </th>
              <th>
                <span className="text-white">Email</span>
              </th>
              <th>
                <span className="text-white col-role">Role</span>
              </th>
              <th>
                <span className="text-white">Created</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const name = displayName(u);
              const role = (u.role || "user").toLowerCase();
              return (
                <tr key={u._id || u.id}>
                  <td className="mono">{u.id}</td>
                  <td title={name}>{name}</td>
                  <td title={u.email}>{u.email}</td>
                  <td className="col-role">
                    <span className={`chip ${role === "admin" ? "role-admin" : "role-user"}`}>{role}</span>
                  </td>
                  <td className="mono">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan="5" className="empty">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
