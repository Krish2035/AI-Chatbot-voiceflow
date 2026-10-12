import { useState, useEffect, useCallback } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  authWithGoogle,
  fetchCurrentUser,
  clearAuthToken,
  getAuthToken
} from '../services/api.js';
import { signInWithGooglePopup, signOutFirebase } from '../services/firebase.js';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' | 'signup'

  // Load user profile on startup if JWT exists
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await fetchCurrentUser();
        if (profile) {
          setUser(profile);
        } else {
          clearAuthToken();
        }
      } catch (err) {
        console.warn('Auth check error:', err);
        clearAuthToken();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const openAuthModal = useCallback((mode = 'signin') => {
    setError(null);
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setError(null);
    setIsAuthModalOpen(false);
  }, []);

  /**
   * Log in with Email & Password
   */
  const login = useCallback(async (email, password) => {
    setError(null);
    setAuthActionLoading(true);
    try {
      const data = await loginWithEmail({ email, password });
      setUser(data.user);
      setIsAuthModalOpen(false);
      return data.user;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  /**
   * Sign up with Email, Password & Display Name
   */
  const register = useCallback(async (email, password, displayName) => {
    setError(null);
    setAuthActionLoading(true);
    try {
      const data = await registerWithEmail({ email, password, displayName });
      setUser(data.user);
      setIsAuthModalOpen(false);
      return data.user;
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  /**
   * Continue with Google (Firebase popup + backend JWT verification)
   */
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setAuthActionLoading(true);
    try {
      // 1. Trigger Firebase Google Popup
      const googleUser = await signInWithGooglePopup();

      // 2. Send token to backend to create/authenticate user
      const data = await authWithGoogle({
        email: googleUser.email,
        displayName: googleUser.displayName,
        photoUrl: googleUser.photoUrl,
        firebaseUid: googleUser.firebaseUid,
        idToken: googleUser.idToken
      });

      setUser(data.user);
      setIsAuthModalOpen(false);
      return data.user;
    } catch (err) {
      const msg = err.code === 'auth/popup-closed-by-user'
        ? 'Sign-in cancelled'
        : (err.message || 'Google sign-in failed');
      setError(msg);
      throw new Error(msg);
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  /**
   * Sign out
   */
  const logout = useCallback(async () => {
    clearAuthToken();
    await signOutFirebase();
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    authActionLoading,
    error,
    setError,
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    signInWithGoogle,
    logout
  };
};

export default useAuth;
