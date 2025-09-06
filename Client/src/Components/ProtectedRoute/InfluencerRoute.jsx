import { Navigate, Outlet } from "react-router-dom";

export default function InfluencerRoute({ redirectTo = "/influencer/login" }) {
  const token = localStorage.getItem("inf_token");
  return token ? <Outlet /> : <Navigate to={redirectTo} replace />;
}
