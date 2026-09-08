import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, firestore } from "../firebase.js";

const AuthContext = createContext(null);

// This Firebase project is shared with the separate Argus manufacturing app, which
// has its own accounts (manufacturingUsers) in the same Auth pool. Someone signed
// in there could otherwise sign into this consumer app too, since Firebase Auth
// alone doesn't know which app an account "belongs" to. Only accounts with a
// users/{email} profile — created by this app's own Register flow — are let in.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const registeringRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      // register() is mid-flight: it just created this Firebase Auth account and
      // is about to write its users/{email} profile doc a moment later. Don't
      // gate on that doc's existence yet — it doesn't exist for a few ms by design.
      if (registeringRef.current) {
        setUser(firebaseUser);
        setAuthLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(firestore, "users", firebaseUser.email));
        if (!profileSnap.exists()) {
          setAuthError("This account isn't registered for Argus. Please create an account first.");
          await signOut(auth);
          setUser(null);
          setAuthLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to verify account:", err);
        setAuthError("Couldn't verify your account. Please try signing in again.");
        await signOut(auth);
        setUser(null);
        setAuthLoading(false);
        return;
      }

      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const register = async ({ name, company, email, phone, password }) => {
    registeringRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      await setDoc(doc(firestore, "users", email), {
        name,
        company,
        email,
        phone,
        createdAt: serverTimestamp(),
      });
      return cred.user;
    } finally {
      registeringRef.current = false;
    }
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const clearAuthError = () => setAuthError("");

  return (
    <AuthContext.Provider value={{ user, authLoading, authError, clearAuthError, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
