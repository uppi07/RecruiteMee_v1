import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function InfluencerOrders() {
  const [orders, setOrders] = useState([]);

  const load = async () => {
    try {
      const token = localStorage.getItem("inf_token");
      const { data } = await api.get("/influencer/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.ok) setOrders(data.orders || []);
    } catch (e) {
      console.error("Orders error", e);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Referred Orders</h2>
      <table className="inf-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>User Email</th>
            <th>Service</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? (
            orders.map((o) => (
              <tr key={o.orderId}>
                <td>{o.orderId}</td>
                <td>{o.userEmail}</td>
                <td>{o.service}</td>
                <td>{o.status}</td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center" }}>No orders yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
