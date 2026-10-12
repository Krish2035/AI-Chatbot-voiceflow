import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

/**
 * Confidential Firebase Configuration
 * Values are retrieved strictly from environment variables (.env)
 * Never hardcode confidential API keys or fallback strings in this file.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Check if Firebase has been configured
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let auth = null;
let googleProvider = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
} else {
  console.warn(
    'Firebase configuration missing. Please provide VITE_FIREBASE_API_KEY in frontend/.env'
  );
}

/**
 * Trigger Firebase Google Sign-In Popup
 * Returns formatted user credentials and ID token
 */
export const signInWithGooglePopup = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY to frontend/.env');
  }

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
  if (!auth) return;
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
