import { Routes, Route } from 'react-router-dom';
import InfluencerGuide from "./InfluencerGuide.jsx";
import Maintenance from "./Maintenance.jsx";
import NotFound from "./NotFound.jsx";


import Home from './Components/Home/home.jsx';
import Login from './Components/Login/login.jsx';
import Register from './Components/Register/register.jsx';
import Createresume from './Components/CreateResume/createresume.jsx';
import Profile from './Components/Profile/profile.jsx';
import Orders from './Components/Orders/orders.jsx';
import About from './Components/About/about.jsx';
import Contact from './Components/Contact/contact.jsx';
import Pricing from './Components/Pricing/pricing.jsx';
import Checkout from './Components/Checkout/checkout.jsx';
import Forgot from './Components/Forgotpassword/forgot.jsx';

import Privacy from "./Components/Legal/Privacy.jsx";
import Terms from "./Components/Legal/Terms.jsx";
import Refund from "./Components/Legal/Refund.jsx";
import Disclaimer from "./Components/Legal/Disclaimer.jsx";
import Footer from "./Components/Layout/SiteFooter.jsx";

import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';
import AdminRoute from './Components/ProtectedRoute/AdminRoute.jsx';

import AdminLayout from './Components/Admin/AdminLayout.jsx';
import AdminDashboard from './Components/Admin/AdminDashboard.jsx';
import AdminOrders from './Components/Admin/AdminOrders.jsx';
import AdminUsers from './Components/Admin/AdminUsers.jsx';
import AdminQueries from './Components/Admin/AdminQueries.jsx';
import AdminInfluencers from './Components/Admin/AdminInfluencers.jsx';
import AdminInfluencerQueries from "./Components/Admin/AdminInfluencerQueries.jsx";
import AdminInfluencerPayouts from "./Components/Admin/AdminInfluencerPayouts";

import InfluencerRoute from "./Components/ProtectedRoute/InfluencerRoute.jsx";
import InfluencerLogin from "./Components/Influencer/InfluencerLogin.jsx";
import InfluencerLayout from "./Components/Influencer/InfluencerLayout.jsx";
import InfluencerDashboard from "./Components/Influencer/InfluencerDashboard.jsx";
import InfluencerOrders from "./Components/Influencer/InfluencerOrders.jsx";
import InfluencerQueries from "./Components/Influencer/InfluencerQueries.jsx";
import InfluencerPayouts from "./Components/Influencer/InfluencerPayouts.jsx";


import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// 🔧 maintenance flag (build-time via Vite)
const MAINTENANCE =
  String(import.meta.env.VITE_MAINTENANCE ?? '0') === '1';

const App = () => {
  // When maintenance is ON: expose only influencer kit & a maintenance route.
  if (MAINTENANCE) {
    return (
      <>
        <Routes>
          <Route path="/influencer-kit" element={<InfluencerGuide />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="*" element={<Maintenance />} />
        </Routes>
        <Footer />
      </>
    );
  }

  // Normal app when maintenance is OFF
  return (
    <>
      <Routes>
        <Route path="/influencer-kit" element={<InfluencerGuide />} />

        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Legal */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/disclaimer" element={<Disclaimer />} />

        {/* User-protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/createresume" element={<Createresume />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
        </Route>

        {/* Admin-protected */}
        <Route element={<AdminRoute redirectTo="/login" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="queries" element={<AdminQueries />} />
            <Route path="influencers" element={<AdminInfluencers />} />
            <Route path="influencer-queries" element={<AdminInfluencerQueries />} />
            <Route path="influencer-payouts" element={<AdminInfluencerPayouts />} />
          </Route>
        </Route>

        {/* Influencer (already gated in layout/routes if needed) */}
        <Route path="/influencer" element={<InfluencerLayout />}>
          <Route path="dashboard" element={<InfluencerDashboard />} />
          <Route path="orders" element={<InfluencerOrders />} />
          <Route path="queries" element={<InfluencerQueries />} />
          <Route path="payouts" element={<InfluencerPayouts />} />
        </Route>

        {/* Influencer login */}
        <Route path="/influencer/login" element={<InfluencerLogin />} />

        {/* Fallback → NotFound */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </>
  );
};

export default App;
