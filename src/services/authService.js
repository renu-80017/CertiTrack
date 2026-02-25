// src/services/authService.js

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  inMemoryPersistence,
  setPersistence,
  updateProfile,
  signOut,
} from "firebase/auth";

import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider, ADMIN_EMAILS } from "../firebase";

const GOOGLE_REDIRECT_FALLBACK_ERRORS = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/internal-error",
  "auth/network-request-failed",
]);

const shouldUseGoogleRedirectFallback = (err) => {
  const code = err?.code || "";
  if (GOOGLE_REDIRECT_FALLBACK_ERRORS.has(code)) return true;
  const message = (err?.message || "").toLowerCase();
  return message.includes("network request failed");
};

let persistenceInitPromise = null;

const ensureAuthPersistence = async () => {
  if (persistenceInitPromise) return persistenceInitPromise;

  persistenceInitPromise = (async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      return "local";
    } catch (localErr) {
      console.warn("Auth local persistence unavailable, trying session persistence", localErr);
    }

    try {
      await setPersistence(auth, browserSessionPersistence);
      return "session";
    } catch (sessionErr) {
      console.warn("Auth session persistence unavailable, falling back to in-memory", sessionErr);
    }

    await setPersistence(auth, inMemoryPersistence);
    return "memory";
  })();

  return persistenceInitPromise;
};

const buildLocalProfile = (firebaseUser, role = "user") => ({
  email: firebaseUser.email || "",
  name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
  role,
  createdAt: null,
});

const deriveRole = (email, existingRole = "user") => {
  if (ADMIN_EMAILS.includes((email || "").toLowerCase())) return "admin";
  return existingRole || "user";
};

export const ensureUserProfile = async (firebaseUser) => {
  const userRef = doc(db, "users", firebaseUser.uid);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    console.error('ensureUserProfile: failed to get user doc', err);
    // Keep auth session usable even when Firestore user doc is unavailable.
    if (
      err?.code === 'unavailable' ||
      err?.code === 'permission-denied' ||
      /client is offline/i.test(err?.message || '')
    ) {
      const role = deriveRole(firebaseUser.email, "user");
      return buildLocalProfile(firebaseUser, role);
    }
    throw err;
  }

  if (!snap.exists()) {
    const role = deriveRole(firebaseUser.email, "user");
    const payload = {
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
      role,
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(userRef, payload);
    } catch (err) {
      if (err?.code !== "permission-denied" && err?.code !== "unavailable") throw err;
      console.warn("ensureUserProfile: could not create user doc, using local profile", err);
      return buildLocalProfile(firebaseUser, role);
    }
    return payload;
  }

  const data = snap.data();
  const role = deriveRole(firebaseUser.email, data.role);
  if (role !== data.role) {
    try {
      await updateDoc(userRef, { role });
    } catch (err) {
      if (err?.code !== "permission-denied" && err?.code !== "unavailable") throw err;
      console.warn("ensureUserProfile: could not update role in Firestore, using local role", err);
    }
  }
  return { ...data, role };
};

export const signupEmail = async ({ name, email, password }) => {
  await ensureAuthPersistence();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });

  const profile = await ensureUserProfile({
    ...cred.user,
    displayName: name || cred.user.displayName,
  });

  return { user: cred.user, profile };
};

export const loginEmail = async ({ email, password }) => {
  await ensureAuthPersistence();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfile(cred.user);
  return { user: cred.user, profile };
};

// ✅ Google login (Popup + Redirect fallback)
export const loginGoogle = async () => {
  await ensureAuthPersistence();
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await ensureUserProfile(cred.user);
    return { user: cred.user, profile };
  } catch (err) {
    console.error("Google login error:", err?.code, err?.message, err);

    // Popup/cookie/network/internal errors -> fallback to redirect login.
    if (shouldUseGoogleRedirectFallback(err)) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null; // After redirect, handleGoogleRedirectResult() will finish login
      } catch (redirectErr) {
        console.error("Google redirect fallback failed:", redirectErr);
        throw redirectErr;
      }
    }

    throw err;
  }
};

// ✅ Handle redirect result (call once when app starts)
export const handleGoogleRedirectResult = async () => {
  await ensureAuthPersistence();
  const result = await getRedirectResult(auth);
  if (!result) return null;
  const profile = await ensureUserProfile(result.user);
  return { user: result.user, profile };
};

export const logoutUser = () => signOut(auth);
