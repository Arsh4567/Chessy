import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { syncUserProfileToFirestore } from '../firebase/firestoreService';
import { clearUserSessionData } from '../utils/storage';
import { getFriendlyAuthErrorMessage } from '../firebase/authErrors';

export type AuthModalMode = 'login' | 'signup' | 'forgot';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: false,
  authModalOpen: false,
  authModalMode: 'login',
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  resetPassword: async () => {},
  signOutUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const isSyncingRef = useRef<boolean>(false);

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser && !isSyncingRef.current) {
        isSyncingRef.current = true;
        try {
          await syncUserProfileToFirestore({
            uid: currentUser.uid,
            displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest Grandmaster' : 'Chess Player'),
            photoURL: currentUser.photoURL || '',
            email: currentUser.email || null,
          });
        } catch (e) {
          console.warn('Profile sync notice:', e);
        } finally {
          isSyncingRef.current = false;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Signs in with Email and Password
   */
  const signInWithEmail = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      closeAuthModal();
    } catch (error: any) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Registers a new account with Email and Password.
   * If current user is an anonymous guest, links the credentials so guest stats are preserved.
   */
  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const cleanEmail = email.trim();
    const cleanName = displayName?.trim() || 'Grandmaster Player';

    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    try {
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.isAnonymous) {
        // Upgrade / link anonymous session to preserve guest history
        try {
          const credential = EmailAuthProvider.credential(cleanEmail, password);
          const result = await linkWithCredential(currentUser, credential);
          if (cleanName) {
            await updateProfile(result.user, { displayName: cleanName });
          }
          closeAuthModal();
          return;
        } catch (linkError: any) {
          // If already in use, fall back to standard create / sign in
          const code = linkError?.code || '';
          if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') {
            throw linkError;
          }
        }
      }

      // Standard new user registration
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (cleanName) {
        await updateProfile(userCredential.user, { displayName: cleanName });
      }
      closeAuthModal();
    } catch (error: any) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Signs in with Google Popup.
   * If current user is an anonymous guest, links with Google to preserve guest progress.
   */
  const signInWithGoogle = async () => {
    try {
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.isAnonymous) {
        try {
          await linkWithPopup(currentUser, googleProvider);
          closeAuthModal();
          return;
        } catch (linkError: any) {
          const code = linkError?.code || '';
          if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') {
            if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
              return;
            }
            throw linkError;
          }
        }
      }

      await signInWithPopup(auth, googleProvider);
      closeAuthModal();
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return; // User intentionally closed popup, suppress error
      }
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Explicit Guest sign-in (only called when user clicks "Continue as Guest")
   */
  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
      closeAuthModal();
    } catch (error: any) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Sends password reset email
   */
  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address to receive a password reset link.');
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (error: any) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Genuinely signs out the user and clears in-memory session data
   */
  const signOutUser = async () => {
    try {
      await signOut(auth);
      clearUserSessionData();
      setUser(null);
    } catch (error: any) {
      console.error('Sign-out error:', error);
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAnonymous: Boolean(user?.isAnonymous),
      authModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInAsGuest,
      resetPassword,
      signOutUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
