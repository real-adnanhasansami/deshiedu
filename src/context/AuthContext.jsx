import { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { isAdminUser } from '../utils/admin';

const AuthContext = createContext(null);

// পার্মানেন্ট এডমিন ইমেইল লিস্ট (ইনভাইরনমেন্ট ভ্যারিয়েবল কাজ না করলেও এরা এডমিন এক্সেস পাবে)
const ADMIN_EMAILS = [
  'dreamcanvasacademy@gmail.com',
  'adnansite01@gmail.com'
];

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

  // Google Sign-In is the ONLY auth method
  async function loginWithGoogle() {
    const { user } = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(user);
    return user;
  }

  function logout() {
    return signOut(auth);
  }

  // এডমিন চেক: সরাসরি ইমেইল লিস্ট এবং utils/admin দুটোতেই মিলিয়ে দেখা হচ্ছে
  const userEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
  const isAdmin = Boolean(
    currentUser && (ADMIN_EMAILS.includes(userEmail) || isAdminUser(currentUser))
  );

  const value = {
    currentUser,
    loading,
    loginWithGoogle,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}