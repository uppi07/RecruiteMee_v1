import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/influencer.css";

export default function AdminInfluencerQueries() {
  const [queries, setQueries] = useState([]);
  const [replyMsg, setReplyMsg] = useState({});
  const [status, setStatus] = useState({});

  const load = async () => {
    const token = localStorage.getItem("token");
    const { data } = await api.get("/admin/influencer-queries", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.ok) setQueries(data.items || []);
  };

  const sendReply = async (id) => {
    const token = localStorage.getItem("token");
    await api.put(
      `/admin/influencer-queries/${id}/reply`,
      { reply: replyMsg[id], status: status[id] || "resolved" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setReplyMsg((p) => ({ ...p, [id]: "" }));
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Influencer Queries</h2>
      <div className="queries-grid">
        {queries.map((q) => (
          <div key={q._id} className="query-card">
            <div className="query-header">
              <h4>{q.subject} — {q.influencerId?.name}</h4>
              <span className={`status ${q.status}`}>{q.status}</span>
            </div>

            <p><strong>Message:</strong> {q.message}</p>

            {q.replies?.length > 0 && (
              <div className="query-reply-list">
                {q.replies.map((r, i) => (
                  <div key={i} className="query-reply">
                    <small>{new Date(r.at).toLocaleString()} by {r.by}</small>
                    <p>{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            <textarea
              placeholder="Type admin reply..."
              value={replyMsg[q._id] || ""}
              onChange={(e) =>
                setReplyMsg((p) => ({ ...p, [q._id]: e.target.value }))
              }
            />

            <select
              value={status[q._id] || q.status}
              onChange={(e) =>
                setStatus((p) => ({ ...p, [q._id]: e.target.value }))
              }
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <button onClick={() => sendReply(q._id)}>Send Reply</button>
          </div>
        ))}
      </div>
    </div>
  );
}
