import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { loginEmail, signupEmail, loginGoogle } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";

// If you already have AuthContext with setUser/setProfile, import and use it here.
// Example:
// import { useAuth } from "../context/AuthContext";

const I18N_TEXT = {
  title: "CertiTrack",
  subtitle: "Login / Signup",
  nameLabel: "Name",
  emailLabel: "Email",
  passwordLabel: "Password",
  loginFailed: "Login failed",
  googleLoginFailed: "Google login failed",
  pleaseWait: "Please wait...",
  createAccount: "Create account",
  login: "Login",
  or: "OR",
  continueWithGoogle: "Continue with Google",
  alreadyHaveAccount: "Already have an account?",
  newHere: "New here?",
};

const t = (key) => I18N_TEXT[key] || key;
const AUTH_BYPASS = import.meta.env.VITE_BYPASS_AUTH === "true";

const mapFirebaseAuthErrorToMessage = (err) => {
  const code = err?.code || "";
  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in was cancelled before completing.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup was blocked by the browser. Allow popups and try again.";
  }
  if (code === "auth/unauthorized-domain") {
    return `Domain "${window.location.hostname}" is not in Firebase authorized domains.`;
  }
  if (code === "auth/internal-error") {
    return "Google sign-in failed. Check Firebase Authentication: Google provider enabled, support email set, and current domain authorized.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error during sign-in. Check connection and try again.";
  }
  return err?.message || t("googleLoginFailed");
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, setSession } = useAuth();
  const activeUser = user || auth.currentUser;
  // const { setUser, setProfile } = useAuth(); // optional if you have

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const isSignup = useMemo(() => mode === "signup", [mode]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const routeByRole = (role) => {
    if (role === "admin") navigate("/admin/dashboard", { replace: true });
    else navigate("/dashboard", { replace: true });
  };

  if (AUTH_BYPASS) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!authLoading && activeUser) {
    const target = profile?.role === "admin" ? "/admin/dashboard" : "/dashboard";
    return <Navigate to={target} replace />;
  }

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);
    try {
      const res = isSignup
        ? await signupEmail({ name, email, password })
        : await loginEmail({ email, password });
      if (!res?.user) throw new Error("Authentication succeeded but no user session was returned.");
      setSession(res.user, res.profile);
      // wait briefly for Firebase auth to report currentUser to avoid redirect race
      const ok = await (async () => {
        const start = Date.now();
        while (Date.now() - start < 3000) {
          if (auth.currentUser) return true;
          // small sleep
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 150));
        }
        return !!auth.currentUser;
      })();
      if (!ok) console.warn('Login succeeded but auth.currentUser not available yet');
      routeByRole(res?.profile?.role);
    } catch (e2) {
      console.error(e2);
      // Friendly handling for common Firebase auth errors
      const code = e2?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErrMsg('This email is already registered. Please login or reset your password.');
        // switch to login mode and keep the email entered so user can sign in
        setMode('login');
      } else if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        setErrMsg('Invalid email or password. Please check and try again.');
      } else if (code === 'auth/too-many-requests') {
        setErrMsg('Too many attempts. Wait a few minutes and try again.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrMsg('Email/password login is not enabled in Firebase Authentication settings.');
      } else if (code === 'auth/wrong-password') {
        setErrMsg('Incorrect password. Try again or reset your password.');
      } else if (code === 'auth/user-not-found') {
        setErrMsg('No account found with this email. Create an account to continue.');
        setMode('signup');
      } else {
        setErrMsg(e2?.message || t("loginFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setErrMsg("");
    setLoading(true);
    try {
      const res = await loginGoogle();

      // If redirect flow started, res will be null. App.jsx will handle it after redirect.
      if (!res) return;
      if (!res?.user) throw new Error("Google sign-in completed but no user session was returned.");
      setSession(res.user, res.profile);
      // wait for auth.currentUser to avoid redirect race
      const start = Date.now();
      while (Date.now() - start < 3000) {
        if (auth.currentUser) break;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 150));
      }
      routeByRole(res?.profile?.role);
    } catch (e2) {
      console.error(e2);
      setErrMsg(mapFirebaseAuthErrorToMessage(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>{t("title")}</h2>
        <p style={styles.sub}>{t("subtitle")}</p>

        {errMsg ? <div style={styles.error}>{errMsg}</div> : null}

        <form onSubmit={onSubmitEmail} style={styles.form}>
          {isSignup ? (
            <div style={styles.field}>
              <label style={styles.label}>{t("nameLabel")}</label>
              <input
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
                autoComplete="name"
              />
            </div>
          ) : null}

          <div style={styles.field}>
            <label style={styles.label}>{t("emailLabel")}</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              autoComplete="email"
              type="email"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t("passwordLabel")}</label>
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              type="password"
              required
            />
          </div>

          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? t("pleaseWait") : isSignup ? t("createAccount") : t("login")}
          </button>
        </form>

        <div style={styles.dividerRow}>
          <div style={styles.divider} />
          <span style={styles.or}>{t("or")}</span>
          <div style={styles.divider} />
        </div>

        <button type="button" style={styles.googleBtn} onClick={onGoogle} disabled={loading}>
          {t("continueWithGoogle")}
        </button>

        <div style={styles.switchRow}>
          {isSignup ? (
            <>
              <span>{t("alreadyHaveAccount")}</span>
              <button style={styles.linkBtn} onClick={() => setMode("login")} type="button">
                {t("login")}
              </button>
            </>
          ) : (
            <>
              <span>{t("newHere")}</span>
              <button style={styles.linkBtn} onClick={() => setMode("signup")} type="button">
                {t("createAccount")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f3f6ff",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
  },
  title: { margin: 0, fontSize: 28 },
  sub: { marginTop: 6, marginBottom: 16, color: "#555" },
  error: {
    background: "#ffe9e9",
    border: "1px solid #ffbcbc",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    color: "#7a1010",
    fontSize: 14,
  },
  form: { display: "grid", gap: 12 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 13, color: "#333" },
  input: {
    height: 42,
    borderRadius: 10,
    border: "1px solid #d7dbe7",
    padding: "0 12px",
    outline: "none",
  },
  primaryBtn: {
    height: 44,
    borderRadius: 10,
    border: "none",
    background: "#4f7cff",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 6,
  },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, margin: "16px 0" },
  divider: { flex: 1, height: 1, background: "#e7e9f2" },
  or: { color: "#777", fontSize: 12 },
  googleBtn: {
    height: 44,
    borderRadius: 10,
    border: "1px solid #d7dbe7",
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  switchRow: {
    marginTop: 14,
    display: "flex",
    justifyContent: "center",
    gap: 8,
    fontSize: 14,
    color: "#444",
  },
  linkBtn: {
    border: "none",
    background: "transparent",
    color: "#4f7cff",
    fontWeight: 800,
    cursor: "pointer",
  },
};
