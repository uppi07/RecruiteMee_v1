import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Nav from "../Navbar/nav.jsx";
import { api } from "../../lib/api";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./checkout.css";

function useQuery() {
  const { search } = useLocation();
  return Object.fromEntries(new URLSearchParams(search));
}

async function ensureRazorpay() {
  if (window.Razorpay) return true;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

const symbol = (c) => (String(c || "INR").toUpperCase() === "USD" ? "$" : "₹");

export default function Checkout() {
  const q = useQuery();
  const navigate = useNavigate();
  const location = useLocation();

  const orderId = q.orderId || "";

  // preferred currency toggle (also switches single unpaid order)
  const initialCurrency = (() => {
    const p = new URLSearchParams(location.search).get("currency");
    return (p || localStorage.getItem("currency") || "INR").toUpperCase();
  })();
  const [prefCurrency, setPrefCurrency] = useState(initialCurrency);
  const isUSD = prefCurrency === "USD";
  const prefSym = isUSD ? "$" : "₹";

  useEffect(() => {
    localStorage.setItem("currency", prefCurrency);
    const params = new URLSearchParams(location.search);
    params.set("currency", prefCurrency);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefCurrency]);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [switching, setSwitching] = useState(false);

  // ✅ show this ONLY after payment is completed / order becomes paid
  const [createdModal, setCreatedModal] = useState(false);

  // when orderId is missing → show pending (unpaid) list
  const [pendingList, setPendingList] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const userString = sessionStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { id: "", email: "", name: "" };
  const email = (user.email || "").toLowerCase();

  const mounted = useRef(true);
  const payNowLock = useRef(false);

  // track payment status transitions to trigger the modal exactly once
  const prevPaymentStatus = useRef(null);
  const placedPopShown = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const setSafe = (setter) => (val) => mounted.current && setter(val);

  const fetchOrder = async () => {
    if (!orderId) {
      setSafe(setOrder)(null);
      setSafe(setLoading)(false);
      return;
    }
    try {
      setSafe(setLoading)(true);
      const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`);
      setSafe(setOrder)(data?.order || null);
      setSafe(setMsg)("");
    } catch (e) {
      setSafe(setMsg)(e?.response?.data?.message || "Failed to load checkout.");
      setSafe(setOrder)(null);
    } finally {
      setSafe(setLoading)(false);
    }
  };

  const fetchPendingList = async () => {
    if (!email) return;
    try {
      setSafe(setPendingLoading)(true);
      const { data } = await api.get(`/orders/history/${encodeURIComponent(email)}`);
      const raw = Array.isArray(data?.orders) ? data.orders : [];
      const unpaid = raw.filter((o) => String(o.paymentStatus || "unpaid").toLowerCase() !== "paid");
      unpaid.sort((a, b) => {
        const getTime = (x) =>
          Math.max(
            x?.date ? new Date(x.date).getTime() : 0,
            x?.createdAt ? new Date(x.createdAt).getTime() : 0
          );
        return getTime(b) - getTime(a);
      });
      setSafe(setPendingList)(unpaid);
    } catch {
      setSafe(setPendingList)([]);
    } finally {
      setSafe(setPendingLoading)(false);
    }
  };

  useEffect(() => {
    const t = sessionStorage.getItem("token");
    if (!t) {
      navigate("/");
      return;
    }
    if (orderId) {
      fetchOrder();
      // ❌ removed: showing modal when `?created=1`
    } else {
      setSafe(setLoading)(false);
      fetchPendingList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, email]);

  // 🔔 Open "Order placed" only when the order transitions to PAID
  useEffect(() => {
    if (!orderId || !order) return;

    const isPaid = String(order.paymentStatus || "").toLowerCase() === "paid";
    const becamePaid = isPaid && prevPaymentStatus.current !== "paid";

    if (becamePaid && !placedPopShown.current) {
      setCreatedModal(true);
      placedPopShown.current = true;
    }

    prevPaymentStatus.current = order.paymentStatus;
  }, [orderId, order]);

  const refreshUntilPaid = async (tries = 6, delayMs = 800) => {
    if (!orderId) return null;
    for (let i = 0; i < tries; i++) {
      try {
        const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`);
        const fresh = data?.order;
        if (fresh?.paymentStatus === "paid") return fresh;
      } catch {}
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  };

  const deleteOrder = async (targetOrderId) => {
    const target = targetOrderId || orderId;
    if (!target) return;
    if (!window.confirm("Delete this order? This cannot be undone.")) return;
    try {
      await api.delete(`/orders/${encodeURIComponent(target)}`);
      if (orderId) {
        setSafe(setMsg)("Order deleted.");
        navigate("/checkout");
      } else {
        setSafe(setMsg)("Order deleted.");
        fetchPendingList();
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete order.");
    }
  };

  const switchOrderCurrency = async (nextCur) => {
    if (!orderId || !order) return;
    const nextU = String(nextCur || "").toUpperCase();
    const curU = String(order.currency || "INR").toUpperCase();
    if (nextU === curU) return;

    const unpaid = String(order.paymentStatus || "").toLowerCase() !== "paid";
    if (!unpaid) return;

    try {
      setSafe(setSwitching)(true);
      const { data } = await api.patch(`/orders/${encodeURIComponent(orderId)}/currency`, {
        currency: nextU.toLowerCase(),
      });
      if (data?.order) {
        setSafe(setOrder)(data.order);
        setSafe(setMsg)(`Currency updated to ${nextU}.`);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to switch currency.");
    } finally {
      setSafe(setSwitching)(false);
    }
  };

  const payNow = async (targetOrderId) => {
    if (payNowLock.current) return;
    const target = targetOrderId || orderId;
    if (!target) return;

    try {
      payNowLock.current = true;
      const { data } = await api.post(`/payments/checkout`, { orderId: target });
      if (!data?.razorpay) {
        alert(data?.message || "Unable to start checkout.");
        return;
      }
      await ensureRazorpay();

      setSafe(setVerifying)(true);

      const opts = {
        key: data.razorpay.key,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: "RecruiteMee",
        description: data.razorpay.description || "Order payment",
        order_id: data.razorpay.order_id,
        prefill: data.razorpay.prefill || {},
        method: { upi: true, card: true, netbanking: true, wallet: true, emi: false, paylater: false },
        config: {
          display: {
            hide: [{ method: "paylater" }, { method: "emi" }, { method: "cardless_emi" }],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (resp) => {
          try {
            await api.post(`/payments/verify`, {
              orderId: target,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });

            if (orderId) {
              setSafe(setOrder)((o) => (o ? { ...o, paymentStatus: "paid" } : o));
              const fresh = await refreshUntilPaid();
              if (fresh) setSafe(setOrder)(fresh);
              // ✅ show “Order placed” AFTER successful payment
              setSafe(setCreatedModal)(true);
              placedPopShown.current = true;
            } else {
              setSafe(setCreatedModal)(true);
              placedPopShown.current = true;
              fetchPendingList();
            }
          } catch (e) {
            alert(e?.response?.data?.message || "Payment verification failed.");
          } finally {
            setSafe(setVerifying)(false);
            payNowLock.current = false;
          }
        },
        modal: {
          ondismiss: () => {
            setSafe(setVerifying)(false);
            payNowLock.current = false;
          },
        },
      };

      const rzp = new window.Razorpay(opts);
      rzp.on && rzp.on("payment.failed", () => {
        setSafe(setVerifying)(false);
        payNowLock.current = false;
      });
      rzp.open();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to start checkout.");
      setSafe(setVerifying)(false);
      payNowLock.current = false;
    }
  };

  const goOrders = () => navigate("/orders");

  const needsPayment = (amount, paymentStatus) =>
    Number(amount || 0) > 0 && String(paymentStatus || "").toLowerCase() !== "paid";

  const canSwitchThisOrder =
    !!orderId && !!order && needsPayment(order.amount, order.paymentStatus);

  return (
    <div className="checkout-page">
      <Nav />
      <main className="checkout-main">
        <div className="container py-4" style={{ maxWidth: 720 }}>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-3">Checkout</h1>

            {/* Currency toggle */}
            <div className="currency-line text-end">
              <span className="me-2">Currency: {prefCurrency} {prefSym}</span>
              <button
                type="button"
                className={`btn btn-sm ${!isUSD ? "btn-primary" : "btn-outline-primary"} me-1`}
                disabled={switching}
                onClick={async () => {
                  setPrefCurrency("INR");
                  if (canSwitchThisOrder) await switchOrderCurrency("INR");
                }}
              >
                INR ₹
              </button>
              <button
                type="button"
                className={`btn btn-sm ${isUSD ? "btn-primary" : "btn-outline-primary"}`}
                disabled={switching}
                onClick={async () => {
                  setPrefCurrency("USD");
                  if (canSwitchThisOrder) await switchOrderCurrency("USD");
                }}
              >
                USD $
              </button>
            </div>
          </div>

          {/* No orderId → list view */}
          {!orderId && (
            <>
              {msg && <div className="alert alert-info">{msg}</div>}
              {pendingLoading && <div className="alert alert-info">Loading pending orders…</div>}

              {!pendingLoading && pendingList.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon" aria-hidden>🧾</div>
                  <h5 className="empty-title">No pending orders</h5>
                  <p className="empty-desc">Start a fresh request and proceed to checkout.</p>
                  <Link
                    to={`/createresume?currency=${prefCurrency.toLowerCase()}`}
                    className="btn btn-accent btn-lg empty-cta"
                  >
                    <span className="text-white">Create Resume</span>
                  </Link>
                </div>
              )}

              {!pendingLoading && pendingList.length > 0 && (
                <div className="d-flex flex-column gap-3">
                  {pendingList.map((o) => {
                    const showPay = needsPayment(o.amount, o.paymentStatus);
                    const s = symbol(o.currency);
                    return (
                      <div key={o.id} className="card shadow-sm soft-card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">{o.planName || o.service || "Service"}</h5>
                            <span className="badge bg-warning text-dark">{o.paymentStatus || "unpaid"}</span>
                          </div>
                          <div className="small text-muted mb-1">Order ID: {o.id}</div>

                          {o.amount != null && (
                            <div className="small mb-2">
                              <strong>Amount:</strong> {s}{o.amount}{" "}
                              <span className="text-muted">({String(o.currency || "INR").toUpperCase()})</span>
                            </div>
                          )}

                          {o.description && <p className="mb-3">{o.description}</p>}

                          <div className="d-flex gap-2">
                            {showPay ? (
                              <button
                                className="btn btn-primary"
                                onClick={() => payNow(o.id)}
                                disabled={verifying || payNowLock.current}
                              >
                                {verifying && payNowLock.current ? "Verifying…" : "Pay Now"}
                              </button>
                            ) : (
                              <span className="badge bg-success align-self-center">No payment required</span>
                            )}
                            <Link className="btn btn-outline-secondary" to={`/checkout?orderId=${encodeURIComponent(o.id)}`}>
                              Open Details
                            </Link>
                            <button className="btn btn-outline-danger" onClick={() => deleteOrder(o.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* orderId → single order view */}
          {orderId && (
            <>
              {loading && <div className="alert alert-info">Loading…</div>}
              {!loading && msg && <div className="alert alert-secondary">{msg}</div>}

              {!loading && order && (
                <div className="card shadow-sm soft-card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="mb-0">{order.planName || order.service || "Service"}</h5>
                      <span className={`badge ${order.paymentStatus === "paid" ? "bg-success" : "bg-warning text-dark"}`}>
                        {order.paymentStatus || "unpaid"}
                      </span>
                    </div>

                    <div className="small text-muted mb-1">Order ID: {order.orderId || order.id}</div>
                    <div className="small mb-3">
                      <strong>Amount:</strong> {symbol(order.currency)}{order.amount}{" "}
                      <span className="text-muted">({String(order.currency || "INR").toUpperCase()})</span>
                    </div>

                    {order.description && <p className="mb-3">{order.description}</p>}

                    {needsPayment(order.amount, order.paymentStatus) ? (
                      <>
                        <div className="alert alert-warning mb-3">
                          Payment pending. Click <strong>Pay Now</strong> to complete your order.
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => payNow()}
                          disabled={verifying || payNowLock.current}
                        >
                          {verifying && payNowLock.current ? "Verifying…" : "Pay Now"}
                        </button>
                        <button className="btn btn-outline-danger ms-2" onClick={() => deleteOrder()}>
                          Delete Order
                        </button>
                      </>
                    ) : (
                      <div className="d-flex gap-2 flex-wrap">
                        {order.receiptUrl ? (
                          <a className="btn btn-outline-primary" href={order.receiptUrl} target="_blank" rel="noreferrer">
                            View Receipt
                          </a>
                        ) : null}
                        <button className="btn btn-success" onClick={goOrders}>
                          Back to Orders
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!loading && !order && !msg && <div className="alert alert-secondary">No order to display.</div>}
            </>
          )}

          {/* ✅ Order Placed (now shown only AFTER payment) */}
          {createdModal && (
            <>
              <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                  <div className="modal-content soft-card">
                    <div className="modal-header border-0">
                      <h5 className="modal-title" style={{ color: "#111" }}>Order placed 🎉</h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => {
                          setCreatedModal(false);
                          navigate("/orders");
                        }}
                        aria-label="Close"
                      />
                    </div>
                    <div className="modal-body">
                      <p className="mb-2">
                        Your order{orderId ? <> (<code>{orderId}</code>)</> : null} has been paid successfully.
                      </p>
                      <p className="mb-0">
                        <strong>Next:</strong> check your Orders to track progress or add any notes for the team.
                      </p>
                    </div>
                    <div className="modal-footer border-0">
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => {
                          setCreatedModal(false);
                          navigate("/orders");
                        }}
                      >
                        Go to Orders
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-backdrop fade show" />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
