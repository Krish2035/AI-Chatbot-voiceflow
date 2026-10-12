import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

/**
 * Confidential Firebase Configuration
 * Values are retrieved from .env (and protected by .gitignore)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAY4UmzzbUoH6MSOEunG9HjPcYqKblhKxg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-chatbot-voiceflow-2840c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-chatbot-voiceflow-2840c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-chatbot-voiceflow-2840c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "159576126320",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:159576126320:web:6d96f56a6bb8c8df1b95b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Request profile and email scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Trigger Firebase Google Sign-In Popup
 * Returns formatted user credentials and ID token
 */
export const signInWithGooglePopup = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();

    return {
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoUrl: user.photoURL,
      firebaseUid: user.uid,
      idToken
    };
  } catch (error) {
    console.error('Firebase Google Sign-In Error:', error);
    throw error;
  }
};

/**
 * Sign out from Firebase
 */
export const signOutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout warning:', err);
  }
};

export { app, auth };
export default {
  app,
  auth,
  signInWithGooglePopup,
  signOutFirebase
};
