// AdminInfluencerPayouts.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "../../styles/admin.css";

export default function AdminInfluencerPayouts() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const token = localStorage.getItem("token");
    const { data } = await api.get("/admin/influencer-payouts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.ok) setItems(data.items || []);
  };

  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");
    await api.patch(
      `/admin/influencer-payouts/${id}`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Influencer Payouts (Admin)</h2>
      <table className="inf-table">
        <thead>
          <tr>
            <th>Influencer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Requested At</th>
            <th>Payee Name</th>
            <th>Mobile</th>
            <th>Bank Name</th>
            <th>UPI ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p._id}>
              <td>{p.influencerId?.name} ({p.influencerId?.email})</td>
              <td>₹{p.amount}</td>
              <td>{p.status}</td>
              <td>{new Date(p.requestedAt).toLocaleString()}</td>
              <td>{p.payeeName || "-"}</td>
              <td>{p.mobile || "-"}</td>
              <td>{p.bankName || "-"}</td>
              <td>{p.upiId || "-"}</td>
              <td>
                <div className="inf-actions">
                  <button
                    className="btn-primary m-1 text-white"
                    title="Approve request"
                    onClick={() => updateStatus(p._id, "approved")}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn-success m-1 p-2"
                    title="Mark as paid"
                    onClick={() => updateStatus(p._id, "paid")}
                  >
                    ₹ Paid
                  </button>
                  <button
                    className="btn-danger m-1 p-2"
                    title="Reject request"
                    onClick={() => updateStatus(p._id, "rejected")}
                  >
                    ✕ Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
