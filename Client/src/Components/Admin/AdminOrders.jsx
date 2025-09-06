import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/admin.css";

export default function AdminOrders() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState({});
  const [showDetails, setShowDetails] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState("");
  const [deleting, setDeleting] = useState({});

  // suggestions modal state
  const [showSuggModal, setShowSuggModal] = useState(false);
  const [suggText, setSuggText] = useState("");
  const [suggLoading, setSuggLoading] = useState(false);
  const [suggSaving, setSuggSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/admin/orders", {
        params: { q: q.trim(), status, page: 1, limit: 50 },
      });
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list.filter((o) => (o?.paymentStatus || "").toLowerCase() === "paid"));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q, status]);

  const openDetailsByEmail = async (email, orderId) => {
    setShowSuggModal(false);

    setDetailLoading(true);
    setDetailErr("");
    setDetail(null);
    setDetailOrderId(orderId);
    setShowDetails(true);
    try {
      const { data } = await api.get(`/orders/history/${encodeURIComponent(email)}`);
      const ord = (data?.orders || []).find((o) => o.id === orderId);
      if (!ord) setDetailErr("Order details not found.");
      else setDetail(ord);
    } catch (e) {
      setDetailErr(e?.response?.data?.message || "Failed to load order details");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateOrder = async (orderId, newStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}`, { status: newStatus });
      await load();
      const row = items.find((i) => i.orderId === orderId);
      if (row) await openDetailsByEmail(row.userEmail, orderId);
    } catch (e) {
      alert(e?.response?.data?.message || "Update failed");
    }
  };

  const onAttach = async (orderId) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setUploading((u) => ({ ...u, [orderId]: true }));
        const form = new FormData();
        form.append("file", file);
        await api.post(`/admin/orders/${orderId}/attachments`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        await load();
        const row = items.find((i) => i.orderId === orderId);
        if (row) await openDetailsByEmail(row.userEmail, orderId);
        alert("Attachment uploaded");
      } catch (e) {
        alert(e?.response?.data?.message || "Upload failed");
      } finally {
        setUploading((u) => ({ ...u, [orderId]: false }));
      }
    };
    input.click();
  };

  const onDeleteAttachment = async (orderId, filename, userEmail) => {
    const key = `${orderId}|${filename}`;
    if (!filename) return alert("Missing filename.");
    if (!confirm("Delete this attachment? This cannot be undone.")) return;

    try {
      setDeleting((d) => ({ ...d, [key]: true }));
      await api.delete(`/admin/orders/${orderId}/attachments/${encodeURIComponent(filename)}`);
      await load();
      await openDetailsByEmail(userEmail, orderId);
    } catch (e) {
      alert(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting((d) => ({ ...d, [key]: false }));
    }
  };

  // open modal to write suggestions (resume_review only)
  const openSuggestionsModal = async (orderId, userEmail) => {
    setShowDetails(false);

    setSuggText("");
    setShowSuggModal(true);
    setDetailOrderId(orderId);
    setSuggLoading(true);
    try {
      const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`);
      if (!data?.order || data.order.service !== "resume_review") {
        setSuggText("");
      } else {
        const got = await api.get(`/orders/${encodeURIComponent(orderId)}/suggestions`);
        setSuggText(got?.data?.reviewSuggestions || "");
      }
    } catch {
      setSuggText("");
    } finally {
      setSuggLoading(false);
    }
  };

  const saveSuggestions = async () => {
    try {
      setSuggSaving(true);
      await api.put(`/admin/orders/${encodeURIComponent(detailOrderId)}/suggestions`, { text: suggText });
      alert("Suggestions saved");
      setShowSuggModal(false);
      const row = items.find((i) => i.orderId === detailOrderId);
      if (row) await openDetailsByEmail(row.userEmail, detailOrderId);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to save suggestions");
    } finally {
      setSuggSaving(false);
    }
  };

  const statuses = ["", "pending", "processing", "completed", "failed", "cancelled", "refunded"];
  const labelize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "All statuses");
  const statusClass = (s = "") => `chip status-${(s || "pending").toLowerCase()}`;

  return (
    <div className="page-wrap">
      <h2 className="page-title text-white">Orders</h2>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search email / orderId / plan"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => (
            <option key={s || "all"} value={s}>{labelize(s)}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          Filter
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="table-wrap table-wrap--raised">
        <table className="table table--pretty table--cards">
          <thead>
            <tr>
              <th><span className="text-white">OrderID</span></th>
              <th><span className="text-white">User</span></th>
              <th><span className="text-white">Status</span></th>
              <th><span className="text-white">Created</span></th>
              <th className="th-actions"><span className="text-white">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.orderId}>
                <td className="mono" data-label="OrderID">{o.orderId}</td>
                <td data-label="User">
                  <div className="stack">
                    <div>{o.userEmail}</div>
                    {o.planName ? <div className="dim small">{o.planName}</div> : null}
                  </div>
                </td>
                <td data-label="Status">
                  <span className={statusClass(o.status)}>{o.status || "pending"}</span>
                </td>
                <td className="mono" data-label="Created">
                  {o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}
                </td>
                <td data-label="Actions">
                  <div className="row-actions">
                    <button
                      className="btn btn-pill btn-outline text-dark"
                      onClick={() => updateOrder(o.orderId, "pending")}
                    >
                      Pending
                    </button>
                    <button
                      className="btn btn-pill btn-outline text-dark"
                      onClick={() => updateOrder(o.orderId, "processing")}
                    >
                      Processing
                    </button>
                    <button
                      className="btn btn-pill btn-outline text-dark"
                      onClick={() => updateOrder(o.orderId, "completed")}
                    >
                      Complete
                    </button>

                    <button
                      className="btn btn-pill btn-chip-light"
                      onClick={() => openDetailsByEmail(o.userEmail, o.orderId)}
                      title="View order details"
                    >
                      View Details
                    </button>

                    <button
                      className="btn btn-pill btn-chip-light"
                      onClick={() => onAttach(o.orderId)}
                      disabled={!!uploading[o.orderId]}
                      title="Upload delivery file"
                    >
                      {uploading[o.orderId] ? "Attaching…" : "Attach"}
                    </button>

                    {o.service === "resume_review" && (
                      <button
                        className="btn btn-pill btn-chip-light"
                        title="Write or edit review suggestions"
                        onClick={() => openSuggestionsModal(o.orderId, o.userEmail)}
                      >
                        Suggestions
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="empty">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Drawer (right side) */}
      {showDetails && (
        <div className="admin-drawer-backdrop" onClick={() => setShowDetails(false)}>
          <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <div className="drawer-title">Order Details</div>
                <div className="drawer-sub mono">{detailOrderId}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowDetails(false)}>✕</button>
            </div>

            {detailLoading && <div className="p-3">Loading…</div>}
            {!detailLoading && detailErr && <div className="alert alert-danger m-3">{detailErr}</div>}

            {!detailLoading && !detailErr && detail && (
              <div className="drawer-body">
                <div className="drawer-block">
                  <div className="label">Service</div>
                  <div>{detail.planName || detail.service || "—"}</div>
                </div>

                {detail.description ? (
                  <div className="drawer-block">
                    <div className="label">Description</div>
                    <div className="dim">{detail.description}</div>
                  </div>
                ) : null}

                {detail?.inputs?.linkedinUrl ? (
                  <div className="drawer-block">
                    <div className="label">LinkedIn URL</div>
                    <a href={detail.inputs.linkedinUrl} target="_blank" rel="noreferrer">
                      {detail.inputs.linkedinUrl}
                    </a>
                  </div>
                ) : null}

                <div className="drawer-block">
                  <div className="label">Customer Uploads</div>
                  {Array.isArray(detail.customerUploads) && detail.customerUploads.length > 0 ? (
                    <div className="stack-v">
                      {detail.customerUploads.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                          {f.name || "File"}
                        </a>
                      ))}
                    </div>
                  ) : <div className="dim">—</div>}
                </div>

                <div className="drawer-block">
                  <div className="label">Admin Attachments</div>
                  {Array.isArray(detail.attachments) && detail.attachments.length > 0 ? (
                    <div className="stack-v">
                      {detail.attachments.map((a, i) => {
                        const key = `${detailOrderId}|${a.filename}`;
                        const userEmail =
                          items.find(x => x.orderId === detailOrderId)?.userEmail || "";
                        return (
                          <div key={i} className="attach-row">
                            <a href={a.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline primary">
                              {a.name || a.filename || "Attachment"}
                            </a>
                            {a.filename ? (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => onDeleteAttachment(detailOrderId, a.filename, userEmail)}
                                disabled={!!deleting[key]}
                                title="Delete attachment"
                              >
                                {deleting[key] ? "Deleting…" : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="dim">—</div>}
                </div>

                {detail.service === "resume_review" && (
                  <div className="drawer-block">
                    <div className="label">Review Suggestions</div>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() =>
                        openSuggestionsModal(
                          detailOrderId,
                          items.find(x => x.orderId === detailOrderId)?.userEmail || ""
                        )
                      }
                    >
                      {detail.hasReviewSuggestions ? "Edit Suggestions" : "Add Suggestions"}
                    </button>
                  </div>
                )}

                <div className="drawer-note dim small">
                  You can upload more files with <strong>Attach</strong> and remove any using <strong>Delete</strong>.
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Suggestions Panel (right side) */}
      {showSuggModal && (
        <div className="admin-drawer-backdrop" onClick={() => setShowSuggModal(false)}>
          <div className="suggestion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <div className="drawer-title">Review Suggestions</div>
                <div className="drawer-sub mono">{detailOrderId}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowSuggModal(false)}>✕</button>
            </div>
            <div className="p-3">
              {suggLoading ? (
                <div>Loading…</div>
              ) : (
                <>
                  <textarea
                    className="input"
                    style={{ width: "100%", minHeight: 200 }}
                    placeholder="Write your resume review suggestions here…"
                    value={suggText}
                    onChange={(e) => setSuggText(e.target.value)}
                  />
                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-primary" onClick={saveSuggestions} disabled={suggSaving}>
                      {suggSaving ? "Saving…" : "Save"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowSuggModal(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
