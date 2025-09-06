import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/influencer.css";

export default function InfluencerQueries() {
  const [queries, setQueries] = useState([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const token = localStorage.getItem("inf_token");
    const id = localStorage.getItem("inf_id");
    const { data } = await api.get(`/influencer/queries/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.ok) setQueries(data.items || []);
  };

  const submit = async () => {
    if (!msg.trim()) return alert("Enter your issue");
    const token = localStorage.getItem("inf_token");
    const id = localStorage.getItem("inf_id");
    await api.post(
      "/influencer/queries",
      { influencerId: id, subject: "General Issue", message: msg },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setMsg("");
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Queries</h2>

      <div className="query-box">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type your issue..."
        />
        <button onClick={submit}>Submit</button>
      </div>

      <div className="queries-grid">
        {queries.length ? (
          queries.map((q) => (
            <div key={q._id} className="query-card">
              <div className="query-header">
                <h4>{q.subject}</h4>
                <span className={`status ${q.status}`}>{q.status}</span>
              </div>

              <p>{q.message}</p>

              {q.replies?.length > 0 && (
                <div className="query-reply-list">
                  {q.replies.map((r, i) => (
                    <div key={i} className="query-reply">
                      <strong>Admin Reply:</strong>
                      <p>{r.body}</p>
                      <small>{new Date(r.at).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              )}

              <small>{new Date(q.createdAt).toLocaleString()}</small>
            </div>
          ))
        ) : (
          <p className="empty-msg">No queries yet.</p>
        )}
      </div>
    </div>
  );
}
