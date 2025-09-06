import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../Navbar/nav.jsx";
import "./orders.css";
import { api } from "../../lib/api";

const StatusBadge = ({ status = "" }) => {
  const s = String(status).toLowerCase();
  const map = {
    pending: "badge-warning",
    processing: "badge-info",
    completed: "badge-success",
    failed: "badge-danger",
    cancelled: "badge-danger",
    refunded: "badge-secondary",
  };
  const cls = map[s] || "badge-secondary";
  return <span className={`order-badge ${cls}`}>{status || "—"}</span>;
};

const normalizeStatus = (o = {}) => {
  const s = String(o.status || "").toLowerCase();
  if (s === "paid" || !s) return "pending";
  return s;
};

const ensureRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });

const backdropStyles = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};
const modalStyles = {
  background: "#ffffff",
  color: "#111111",
  width: "min(820px, 92vw)",
  maxHeight: "80vh",
  overflow: "auto",
  borderRadius: 12,
  padding: "18px 20px",
  boxShadow: "0 12px 40px rgba(0,0,0,.25)",
};
const mutedSmall = { color: "#555" };
const suggestionsBoxStyles = {
  background: "#f7f8fa",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  maxHeight: "60vh",
  overflow: "auto",
};
const preStyles = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  lineHeight: 1.5,
  fontSize: "0.95rem",
  color: "#111111",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [view, setView] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [payingId, setPayingId] = useState("");

  const [suggModalOpen, setSuggModalOpen] = useState(false);
  const [suggText, setSuggText] = useState("");
  const [suggOrderId, setSuggOrderId] = useState("");
  const [suggLoading, setSuggLoading] = useState(false);
  const [suggErr, setSuggErr] = useState("");

  const navigate = useNavigate();

  const userString = sessionStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { id: "", email: "", name: "" };
  const email = (user.email || "").toLowerCase();
  const token = sessionStorage.getItem("token") || "";

  const fetchOrders = async () => {
    if (!email) {
      setOrders([]);
      setPendingDrafts([]);
      setLoading(false);
      setErrMsg("Please log in to view your orders.");
      return;
    }
    try {
      setErrMsg("");
      setLoading(true);
      const { data } = await api.get(`/orders/history/${encodeURIComponent(email)}`);
      const raw = Array.isArray(data.orders) ? data.orders : [];

      const paidOnly = raw.filter((o) => String(o.paymentStatus || "unpaid").toLowerCase() === "paid");
      const unpaid   = raw.filter((o) => String(o.paymentStatus || "unpaid").toLowerCase() !== "paid");

      unpaid.sort((a, b) => {
        const getTime = (x) => Math.max(
          x?.date ? new Date(x.date).getTime() : 0,
          x?.createdAt ? new Date(x.createdAt).getTime() : 0
        );
        return getTime(b) - getTime(a);
      });

      setOrders(paidOnly);
      setPendingDrafts(unpaid);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || "Failed to load orders.");
      setOrders([]);
      setPendingDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const startPayment = async (order) => {
    try {
      if (!token) {
        alert("Please log in again.");
        return;
      }
      setPayingId(order.id);
      await ensureRazorpay();

      const { data } = await api.post("/payments/checkout", { orderId: order.id });
      const rp = data?.razorpay || {};
      if (!rp.order_id || !rp.key) throw new Error(data?.message || "Could not start payment");

      const opts = {
        key: rp.key,
        amount: rp.amount,
        currency: rp.currency,
        name: "RecruiteMee",
        description: rp.description || "Service payment",
        order_id: rp.order_id,
        prefill: { email: rp.prefill?.email || email },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", {
              orderId: rp.orderRef || order.id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            alert("Payment successful!");
            fetchOrders();
          } catch (e) {
            alert(e?.response?.data?.message || "Payment verification failed");
          }
        },
        modal: { ondismiss: () => {} },
      };

      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (e) {
      alert(e?.message || "Unable to start payment");
    } finally {
      setPayingId("");
    }
  };

  const filtered = useMemo(() => {
    if (view === "all") return orders;
    if (view === "pending") return orders.filter((o) => normalizeStatus(o) === "pending");
    if (view === "processing") return orders.filter((o) => normalizeStatus(o) === "processing");
    if (view === "completed") return orders.filter((o) => normalizeStatus(o) === "completed");
    return orders;
  }, [orders, view]);

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "—";
    }
  };

  const viewSuggestions = async (orderId) => {
    setSuggOrderId(orderId);
    setSuggText("");
    setSuggErr("");
    setSuggModalOpen(true);
    setSuggLoading(true);
    try {
      const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}/suggestions`);
      setSuggText(data?.reviewSuggestions || "");
      if (!data?.reviewSuggestions) setSuggErr("No suggestions yet.");
    } catch (e) {
      setSuggErr(e?.response?.data?.message || "Unable to load suggestions.");
      setSuggText("");
    } finally {
      setSuggLoading(false);
    }
  };

  return (
    <div className="orders-page">
      <Navbar />
      <header className="orders-hero">
        <div className="container py-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h1 className="text-white mb-1">Order History</h1>
            <p className="text-white-50 mb-0">Track your purchases and statuses here.</p>
          </div>
          <div className="btn-group order-filters" role="group" aria-label="Filter orders">
            <button
              type="button"
              className={`btn btn-sm ${view === "all" ? "btn-accent" : "btn-outline-light"}`}
              onClick={() => setView("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`btn btn-sm ${view === "pending" ? "btn-accent" : "btn-outline-light"}`}
              onClick={() => setView("pending")}
            >
              Pending
            </button>
            <button
              type="button"
              className={`btn btn-sm ${view === "processing" ? "btn-accent" : "btn-outline-light"}`}
              onClick={() => setView("processing")}
            >
              Processing
            </button>
            <button
              type="button"
              className={`btn btn-sm ${view === "completed" ? "btn-accent" : "btn-outline-light"}`}
              onClick={() => setView("completed")}
            >
              Completed
            </button>
          </div>
        </div>
      </header>

      <main className="orders-main">
        <div className="container my-4">

          {/* ---- PENDING CHECKOUTS BANNER (not part of history table) ---- */}
          {!loading && pendingDrafts.length > 0 && (
            <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div>
                <strong>{pendingDrafts.length}</strong> order{pendingDrafts.length > 1 ? "s" : ""} pending payment.
              </div>
              <div className="d-flex flex-wrap gap-2">
                {pendingDrafts.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    to={`/checkout?orderId=${encodeURIComponent(o.id)}`}
                    className="btn btn-sm btn-primary"
                  >
                    Resume Checkout #{o.id}
                  </Link>
                ))}
                {pendingDrafts.length > 3 && (
                  <Link to={`/checkout`} className="btn btn-sm btn-outline-primary">
                    See all pending
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="card soft-card border-0">
            <div className="card-body p-0">
              {loading && (
                <div className="p-4">
                  <div className="skeleton-row" />
                  <div className="skeleton-row" />
                  <div className="skeleton-row" />
                </div>
              )}

              {!loading && errMsg && (
                <div className="p-4">
                  <div className="alert alert-danger d-flex align-items-center justify-content-between">
                    <span>{errMsg}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchOrders}>
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {!loading && !errMsg && filtered.length === 0 && (
                <div className="p-4 text-center">
                  <h5 className="mb-1">No paid orders yet</h5>
                  <p className="text-muted mb-3">Complete a payment to see it here.</p>
                  <a className="btn btn-primary" href="/createresume">
                    Create Resume
                  </a>
                </div>
              )}

              {!loading && !errMsg && filtered.length > 0 && (
                <div className="table-responsive orders-table">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Order ID</th>
                        <th>Service</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Ordered Time</th>
                        <th>Uploads</th>
                        <th>Admin Attachments / Suggestions</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((order) => {
                        const wfStatus = normalizeStatus(order);
                        const isReview = String(order.service) === "resume_review";
                        return (
                          <tr key={order.id}>
                            <td className="fw-semibold">{order.id || "—"}</td>
                            <td>
                              <div className="small">
                                <div className="fw-semibold">
                                  {order.planName || order.service || "—"}
                                </div>
                                {order.description ? (
                                  <div className="text-muted">{order.description}</div>
                                ) : null}
                                {order?.inputs?.linkedinUrl ? (
                                  <div className="text-muted">
                                    <a
                                      href={order.inputs.linkedinUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      LinkedIn URL
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                            <td><StatusBadge status={wfStatus} /></td>
                            <td><span className="badge bg-success">paid</span></td>
                            <td>{formatDate(order.date || order.createdAt)}</td>
                            <td>
                              {Array.isArray(order.customerUploads) && order.customerUploads.length > 0 ? (
                                <div className="d-flex flex-column gap-1">
                                  {order.customerUploads.map((f, idx) => (
                                    <a
                                      key={idx}
                                      className="btn btn-sm btn-outline-secondary file-link"
                                      href={f.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {f.name || "File"}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td>
                              {isReview ? (
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => viewSuggestions(order.id)}
                                  title="View admin suggestions"
                                >
                                  View Suggestions
                                </button>
                              ) : Array.isArray(order.attachments) && order.attachments.length > 0 ? (
                                <div className="d-flex flex-column gap-1">
                                  {order.attachments.map((a, idx) => (
                                    <a
                                      key={idx}
                                      className="btn btn-sm btn-outline-primary"
                                      href={a.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {a.name || "Attachment"}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-inline-flex gap-2">
                                {order.invoiceUrl ? (
                                  <a
                                    className="btn btn-sm btn-outline-primary"
                                    href={order.invoiceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Receipt
                                  </a>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-muted small mt-3">
            Need help? Reach us via the Contact form—include your Order ID for faster support.
          </div>
        </div>
      </main>

      {/* Suggestions viewer modal */}
      {suggModalOpen && (
        <div
          className="orders-modal-backdrop"
          onClick={() => setSuggModalOpen(false)}
          style={backdropStyles}
        >
          <div
            className="orders-modal"
            onClick={(e) => e.stopPropagation()}
            style={modalStyles}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-suggestions-title"
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 id="review-suggestions-title" className="mb-0" style={{ color: "#111" }}>
                Review Suggestions
              </h5>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSuggModalOpen(false)}
                style={{ color: "#333", borderColor: "#ccc" }}
              >
                Close
              </button>
            </div>

            <div className="small mb-2" style={mutedSmall}>
              Order ID: {suggOrderId}
            </div>

            {suggLoading ? (
              <div>Loading…</div>
            ) : suggErr ? (
              <div className="alert alert-secondary" style={{ color: "#111" }}>
                {suggErr}
              </div>
            ) : (
              <div className="suggestions-box" style={suggestionsBoxStyles}>
                {suggText?.trim() ? (
                  <pre style={preStyles}>{suggText}</pre>
                ) : (
                  <div className="text-muted" style={{ color: "#444" }}>
                    No suggestions yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
