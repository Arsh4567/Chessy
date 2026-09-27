import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { syncUserProfileToFirestore } from '../firebase/firestoreService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          await syncUserProfileToFirestore({
            uid: currentUser.uid,
            displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest Grandmaster' : 'Chess Player'),
            photoURL: currentUser.photoURL || '',
            email: currentUser.email || null,
          });
        } catch (e) {
          console.warn('Profile sync notice:', e);
        }
        setLoading(false);
      } else {
        // Automatically establish anonymous Firebase session for secure ABAC rule compliance
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn('Anonymous sign-in initial notice:', err);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-in error:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      // Re-sign in anonymously so user can continue uninterrupted
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAnonymous: Boolean(user?.isAnonymous), 
      signInWithGoogle, 
      signOutUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
