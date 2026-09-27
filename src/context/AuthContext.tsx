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
import { clearUserSessionData, beginUserSession } from '../utils/storage';
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
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
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
  updateUserProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  // UID-specific and monotonic session tracker
  const authSessionCounterRef = useRef<number>(0);
  const currentSyncingUidRef = useRef<string | null>(null);

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
      authSessionCounterRef.current++;
      const currentSessionId = authSessionCounterRef.current;

      if (!currentUser) {
        currentSyncingUidRef.current = null;
        clearUserSessionData();
        setUser(null);
        setLoading(false);
        return;
      }

      // Isolate in-memory storage session for the new UID
      beginUserSession(currentUser.uid);
      currentSyncingUidRef.current = currentUser.uid;

      // Keep loading true until essential profile initialization is complete
      try {
        await syncUserProfileToFirestore({
          uid: currentUser.uid,
          displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest Grandmaster' : 'Chess Player'),
          photoURL: currentUser.photoURL || '',
          email: currentUser.email || null,
        });
      } catch (e) {
        console.warn('Profile sync notice during auth resolution:', e);
      } finally {
        // Only set state if this remains the latest session and UID
        if (currentSessionId === authSessionCounterRef.current) {
          setUser(currentUser);
          setLoading(false);
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
      clearUserSessionData();
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      closeAuthModal();
    } catch (error: any) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Registers a new account with Email and Password.
   * If current user is an anonymous guest, links the credentials so guest stats are preserved.
   * If email is already in use by another account, throws a clear error so guest data is never silently lost.
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

    const currentUser = auth.currentUser;

    if (currentUser && currentUser.isAnonymous) {
      try {
        const credential = EmailAuthProvider.credential(cleanEmail, password);
        const result = await linkWithCredential(currentUser, credential);
        if (cleanName) {
          await updateProfile(result.user, { displayName: cleanName });
        }
        await result.user.reload();
        const freshUser = auth.currentUser;
        setUser(freshUser ? Object.assign(Object.create(Object.getPrototypeOf(freshUser)), freshUser) : null);
        if (auth.currentUser) {
          await syncUserProfileToFirestore({
            uid: auth.currentUser.uid,
            displayName: cleanName,
            photoURL: auth.currentUser.photoURL || '',
            email: auth.currentUser.email || null,
          });
        }
        closeAuthModal();
        return;
      } catch (linkError: any) {
        const code = linkError?.code || '';
        if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
          throw new Error(
            'This email is already associated with an existing Grandmaster account. To preserve your current guest rating and history, please sign up with a new email address, or sign in directly to switch accounts.'
          );
        }
        throw new Error(getFriendlyAuthErrorMessage(linkError));
      }
    }

    try {
      clearUserSessionData();
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (cleanName) {
        await updateProfile(userCredential.user, { displayName: cleanName });
      }
      await userCredential.user.reload();
      const freshUser = auth.currentUser;
      setUser(freshUser ? Object.assign(Object.create(Object.getPrototypeOf(freshUser)), freshUser) : null);
      if (auth.currentUser) {
        await syncUserProfileToFirestore({
          uid: auth.currentUser.uid,
          displayName: cleanName,
          photoURL: auth.currentUser.photoURL || '',
          email: auth.currentUser.email || null,
        });
      }
      closeAuthModal();
    } catch (error: any) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Signs in with Google Popup.
   * If current user is an anonymous guest, links with Google to preserve guest progress.
   * If Google account already exists on another user, throws a clear error to avoid silently dropping guest progress.
   */
  const signInWithGoogle = async () => {
    const currentUser = auth.currentUser;

    if (currentUser && currentUser.isAnonymous) {
      try {
        await linkWithPopup(currentUser, googleProvider);
        closeAuthModal();
        return;
      } catch (linkError: any) {
        const code = linkError?.code || '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return;
        }
        if (code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential') {
          throw new Error(
            'This Google account is already linked to an existing profile. To preserve your current guest progress, link with a different account or sign in directly to switch.'
          );
        }
        throw new Error(getFriendlyAuthErrorMessage(linkError));
      }
    }

    try {
      clearUserSessionData();
      await signInWithPopup(auth, googleProvider);
      closeAuthModal();
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Explicit Guest sign-in.
   * Rejects if another authenticated (non-guest) session is already active.
   */
  const signInAsGuest = async () => {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      throw new Error('An authenticated account is already active. Please sign out first to play as guest.');
    }
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      closeAuthModal();
      return;
    }

    try {
      clearUserSessionData();
      await signInAnonymously(auth);
      closeAuthModal();
    } catch (error: any) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Sends password reset email with generic failure protection to prevent user enumeration
   */
  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address to receive a password reset link.');
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (error: any) {
      const code = (error?.code || '').toLowerCase();
      // Prevent user enumeration attacks!
      if (
        code.includes('user-not-found') ||
        code.includes('invalid-credential') ||
        code.includes('invalid-email')
      ) {
        return; // Silently succeed to prevent attackers from confirming account existence
      }
      throw new Error(getFriendlyAuthErrorMessage(error));
    }
  };

  /**
   * Updates user display name and/or photoURL and immediately synchronizes Firestore and auth state
   */
  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Unauthenticated');

    const cleanName = displayName.trim();
    if (!cleanName) throw new Error('Display name cannot be empty');

    const updatePayload: { displayName: string; photoURL?: string } = { displayName: cleanName };
    if (photoURL !== undefined) updatePayload.photoURL = photoURL;

    await updateProfile(current, updatePayload);
    await current.reload();
    const freshUser = auth.currentUser;
    setUser(freshUser ? Object.assign(Object.create(Object.getPrototypeOf(freshUser)), freshUser) : null);

    if (freshUser) {
      await syncUserProfileToFirestore({
        uid: freshUser.uid,
        displayName: cleanName,
        photoURL: freshUser.photoURL || '',
        email: freshUser.email || null,
      });
    }
  };

  /**
   * Genuinely signs out the user and clears in-memory session data atomically
   */
  const signOutUser = async () => {
    try {
      authSessionCounterRef.current++;
      currentSyncingUidRef.current = null;
      clearUserSessionData();
      await signOut(auth);
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
      signOutUser,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
