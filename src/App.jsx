import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminOnlyRoute, ProtectedRoute, UserOnlyRoute } from "./components/RouteGuards";
import Loader from "./components/Loader";
import { useAuth } from "./contexts/AuthContext";
import { auth } from "./firebase";

import { handleGoogleRedirectResult } from "./services/authService";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const AppLayout = lazy(() => import("./layouts/AppLayout"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const CertificatesPage = lazy(() => import("./pages/user/CertificatesPage"));
const RenewalsPage = lazy(() => import("./pages/user/RenewalsPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCertificates = lazy(() => import("./pages/admin/AdminCertificates"));
const AdminRenewals = lazy(() => import("./pages/admin/AdminRenewals"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ChatbotWidget = lazy(() => import("./components/ChatbotWidget"));
const AUTH_BYPASS = import.meta.env.VITE_BYPASS_AUTH === "true";

function RootRoute() {
  if (AUTH_BYPASS) return <Navigate to="/dashboard" replace />;
  const { user, role, loading } = useAuth();
  const activeUser = user || auth.currentUser;
  if (loading) return <Loader text="Checking session..." />;
  if (!activeUser) return <Navigate to="/login" replace />;
  return <Navigate to={role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />;
}

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await handleGoogleRedirectResult();
      } catch (e) {
        console.error("Google redirect login failed:", e);
      }
    })();
  }, []);

  return (
    <Suspense fallback={<Loader text="Loading page..." />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<UserOnlyRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/renewals" element={<RenewalsPage />} />
            </Route>
          </Route>

          <Route element={<AdminOnlyRoute />}>
            <Route element={<AppLayout admin />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/certificates" element={<AdminCertificates />} />
              <Route path="/admin/renewals" element={<AdminRenewals />} />
              <Route path="/admin/panel" element={<AdminPanel />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<RootRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <ChatbotWidget />
    </Suspense>
  );
}
