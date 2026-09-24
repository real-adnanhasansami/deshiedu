import { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { isAdminUser } from '../utils/admin';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Creates (or refreshes) the user's Firestore profile doc.
  async function ensureUserDoc(user) {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        name: user.displayName || '',
        email: user.email,
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Google Sign-In is the ONLY auth method — simplifies the UI and
  // means every account's email is provider-verified, which is also
  // what lets firestore.rules trust request.auth.token.email for the
  // admin check without a separate custom-claims setup.
  async function loginWithGoogle() {
    const { user } = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(user);
    return user;
  }

  function logout() {
    return signOut(auth);
  }

  const value = {
    currentUser,
    loading,
    loginWithGoogle,
    logout,
    isAdmin: isAdminUser(currentUser),
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
