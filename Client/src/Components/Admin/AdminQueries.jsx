import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/admin.css";

export default function AdminQueries() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // drawer/modal state
  const [active, setActive] = useState(null); // full query doc
  const [subj, setSubj] = useState("Re: your message to RecruiteMee");
  const [msg, setMsg] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [info, setInfo] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/admin/queries", {
        params: { q: q.trim(), page: 1, limit: 50, sort: "-createdAt" },
      });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load queries");
    } finally {
      setLoading(false);
    }
  };

  const openQuery = async (id) => {
    setErr("");
    setInfo("");
    try {
      const { data } = await api.get(`/admin/queries/${id}`);
      setActive(data.item);
      setSubj(`Re: your message to RecruiteMee`);
      setMsg("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to open query");
    }
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q]);

  const onReply = async (close = false) => {
    if (!active) return;
    setSendBusy(true);
    setErr("");
    setInfo("");
    try {
      const { data } = await api.post(`/admin/queries/${active._id}/reply`, {
        subject: subj.trim(),
        body: msg.trim(),
        close,
      });
      setInfo(data?.message || "Reply sent.");
      setActive(data.item);
      setMsg("");
      // refresh list to reflect status/lastRepliedAt
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to send reply");
    } finally {
      setSendBusy(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this query?")) return;
    try {
      await api.delete(`/admin/queries/${id}`);
      if (active?._id === id) setActive(null);
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  };

  const statusChip = (s = "open") => (
    <span className={`chip ${s === "closed" ? "role-admin" : "role-user"}`}>{s}</span>
  );

  return (
    <div className="page-wrap">
      <h2 className="page-title text-white">Queries</h2>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search PID / email / message"
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
                <span className="text-white">Date</span>
              </th>
              <th>
                <span className="text-white">PID</span>
              </th>
              <th>
                <span className="text-white">Email</span>
              </th>
              <th>
                <span className="text-white">Status</span>
              </th>
              <th>
                <span className="text-white">Message</span>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r._id}>
                <td className="mono" title={r.createdAt}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                </td>
                <td className="mono">{r.pid || "-"}</td>
                <td>{r.email}</td>
                <td>{statusChip(r.status || "open")}</td>
                <td
                  title={r.message}
                  style={{
                    maxWidth: 420,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.message}
                </td>
                <td className="mono">
                  <button className="btn btn-sm btn-primary" onClick={() => openQuery(r._id)}>
                    Reply
                  </button>{" "}
                  <button className="btn btn-sm btn-danger" onClick={() => onDelete(r._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="empty">
                  No queries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reply drawer */}
      {active && (
        <div className="soft-card reply-drawer">
          <div className="reply-head">
            <h4 className="reply-title">Reply to {active.email}</h4>
            <button className="btn btn-sm btn-secondary reply-close" onClick={() => setActive(null)}>
              Close
            </button>
          </div>

          <div className="reply-body">
            <div className="reply-meta mono">
              Query ID: {active._id} · Created: {new Date(active.createdAt).toLocaleString()}
            </div>

            <div className="reply-original-wrap">
              <strong>Original message</strong>
              <div className="reply-original">{active.message || "-"}</div>
            </div>

            <div className="reply-editor">
              <label className="text-white">Subject</label>
              <input className="input reply-input" value={subj} onChange={(e) => setSubj(e.target.value)} />
            </div>

            <div className="reply-editor">
              <label className="text-white">Message</label>
              <textarea
                className="input reply-input"
                rows={6}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Type your reply…"
              />
            </div>

            {info && <div className="alert alert-info mt-2">{info}</div>}
            {err && <div className="alert alert-danger mt-2">{err}</div>}

            <div className="reply-actions">
              <button
                className="btn btn-primary reply-send"
                disabled={sendBusy || !msg.trim()}
                onClick={() => onReply(false)}
              >
                {sendBusy ? "Sending…" : "Send reply"}
              </button>
              <button
                className="btn btn-secondary reply-send"
                disabled={sendBusy || !msg.trim()}
                onClick={() => onReply(true)}
              >
                {sendBusy ? "Sending…" : "Send & Close"}
              </button>
            </div>

            <div className="reply-history">
              <strong className="text-white">History</strong>
              {(active.replies || []).length === 0 && <div className="text-muted">No previous replies.</div>}
              {(active.replies || [])
                .slice()
                .reverse()
                .map((r, i) => (
                  <div key={i} className="reply-history-item">
                    <div className="mono text-muted reply-history-meta">
                      {new Date(r.at).toLocaleString()} · by {r.by} · to {r.to} · {r.sendOk ? "sent" : "send failed"}
                    </div>
                    <div className="reply-history-subject">
                      <strong>{r.subject}</strong>
                    </div>
                    <div className="reply-history-body">{r.body}</div>
                    {r.previewUrl && (
                      <div className="reply-history-preview">
                        <a href={r.previewUrl} target="_blank" rel="noreferrer">
                          Dev preview
                        </a>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
