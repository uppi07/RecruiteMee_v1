import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/influencer.css";

export default function InfluencerPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [regs, setRegs] = useState(0);
  const [eligible, setEligible] = useState(false);

  // 👇 modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    payeeName: "",
    mobile: "",
    bankName: "",
    upiId: "",
  });
  const canSubmit = form.payeeName && form.mobile && form.bankName && form.upiId;

  const load = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("inf_token");

      const { data } = await api.get("/influencer/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.ok) {
        setBalance(data.stats?.balance || 0);
        setRegs(data.stats?.registrations || 0);
        setEligible(data.stats?.eligible || false);
      }

      const { data: payoutData } = await api.get("/influencer/payouts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (payoutData.ok) setPayouts(payoutData.items || []);
    } catch (err) {
      console.error("Failed to load payouts", err);
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    // open modal instead of sending immediately
    setShowModal(true);
  };

  const submitPayout = async () => {
    try {
      setRequesting(true);
      const token = localStorage.getItem("inf_token");
      await api.post(
        "/influencer/payouts/request",
        { ...form },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Payout request sent!");
      setShowModal(false);
      setForm({ payeeName: "", mobile: "", bankName: "", upiId: "" });
      load();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to request payout");
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderStatus = (status) => {
    switch (status) {
      case "requested":
        return <span className="status-badge requested">Requested</span>;
      case "approved":
        return <span className="status-badge approved">Approved</span>;
      case "paid":
        return <span className="status-badge paid">Paid</span>;
      case "rejected":
        return <span className="status-badge rejected">Rejected</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div>
      <h2 className="section-title">💰 Payouts</h2>

      <div className="payout-box">
        <h3>
          Available Balance: <span style={{ color: "#7aa5ff" }}>₹{balance}</span>
        </h3>
        <p>Registrations: {regs} (min 50 required)</p>
        <p>Balance Required: ₹2500 minimum</p>
        <p>Eligibility: {eligible ? "✅ Eligible" : "❌ Not Eligible"}</p>
        <div className="inf-note" style={{
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "rgba(122,165,255,0.08)",
  border: "1px dashed rgba(122,165,255,0.35)",
  lineHeight: 1.4
}}>
  <strong>Note:</strong> Registration alone doesn’t earn ₹50. The referred user must
  <em> submit a Resume for Review</em> once. After their first review is submitted,
  ₹50 will be added to your balance automatically.
</div>
        <button
          onClick={requestPayout}
          disabled={requesting || !eligible}
          className={requesting || !eligible ? "btn-disabled" : ""}
        >
          Request Payout
        </button>
      </div>

      <div className="table-wrapper">
        <table className="inf-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Processed At</th>
              <th>Txn Ref</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length ? (
              payouts.map((p) => (
                <tr key={p._id}>
                  <td>₹{p.amount}</td>
                  <td>{renderStatus(p.status)}</td>
                  <td>{new Date(p.requestedAt || p.createdAt).toLocaleString()}</td>
                  <td>{p.processedAt ? new Date(p.processedAt).toLocaleString() : "-"}</td>
                  <td>{p.txnId || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  {loading ? "Loading..." : "No payout records yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="inf-modal-overlay" onClick={() => !requesting && setShowModal(false)}>
          <div className="inf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inf-modal-header">
              <h3>Payment Details</h3>
              <button className="inf-modal-close" onClick={() => !requesting && setShowModal(false)}>×</button>
            </div>
            <div className="inf-modal-body">
              <div className="inf-row">
                <label>Full Name</label>
                <input
                  type="text"
                  value={form.payeeName}
                  onChange={(e) => setForm({ ...form, payeeName: e.target.value })}
                  placeholder="e.g., Rahul Sharma"
                />
              </div>
              <div className="inf-row">
                <label>Mobile</label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit mobile"
                />
              </div>
              <div className="inf-row">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g., HDFC Bank"
                />
              </div>
              <div className="inf-row">
                <label>UPI ID</label>
                <input
                  type="text"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="e.g., name@bank"
                />
              </div>
              <p className="inf-hint">We’ll share these with admin for your payout.</p>
            </div>
            <div className="inf-modal-footer">
              <button
                className={`inf-btn ${!canSubmit || requesting ? "btn-disabled" : ""}`}
                disabled={!canSubmit || requesting}
                onClick={submitPayout}
              >
                {requesting ? "Submitting..." : "Submit Request"}
              </button>
              <button className="inf-btn-secondary" onClick={() => !requesting && setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
