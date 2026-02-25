import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { ensureUserProfile, logoutUser } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastUidRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (import.meta.env.DEV) {
        console.info('[Auth] onAuthStateChanged:', firebaseUser?.uid || null);
      }
      if (!firebaseUser && lastUidRef.current && import.meta.env.DEV) {
        console.warn('[Auth] Session dropped after being signed in. Check browser storage/cookies and Firebase Auth domain settings.');
      }
      lastUidRef.current = firebaseUser?.uid || null;
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          try {
            const userProfile = await ensureUserProfile(firebaseUser);
            setProfile(userProfile);
          } catch (err) {
            console.error('AuthContext: profile load failed, using fallback profile', err);
            setProfile({
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: 'user',
              createdAt: null,
            });
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      role: profile?.role || null,
      logout: logoutUser,
      setSession: (nextUser, nextProfile) => {
        setUser(nextUser || null);
        setProfile(nextProfile || null);
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
