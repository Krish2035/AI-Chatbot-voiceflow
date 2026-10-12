import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';

export const AuthModal = ({
  isOpen,
  onClose,
  mode = 'signin',
  onModeChange,
  onLogin,
  onRegister,
  onGoogleSignIn,
  isLoading = false,
  error = null
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters.');
          return;
        }
        await onRegister(email, password, displayName);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      // Error handled by parent hook
    }
  };

  const handleGoogleClick = async () => {
    setLocalError(null);
    try {
      await onGoogleSignIn();
    } catch (_) {
      // Error handled by parent hook
    }
  };

  const activeError = localError || error;

  return (
    <div className="auth-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button 
          className="auth-modal-close" 
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="auth-modal-header">
          <div className="auth-badge">
            <Sparkles size={14} className="auth-badge-icon" />
            <span>Voiceflow Top 1% Tier Auth</span>
          </div>
          <h2 className="auth-modal-title">
            {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'signin' 
              ? 'Sign in to access your synchronized chat memory and AI models' 
              : 'Join Voiceflow to persist multi-turn conversations across devices'}
          </p>
        </div>

        {/* Tabs: Sign In / Sign Up */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setLocalError(null);
              onModeChange('signin');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setLocalError(null);
              onModeChange('signup');
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="auth-error-banner animate-fade-in">
            <AlertCircle size={16} className="auth-error-icon" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="auth-google-btn"
          id="btn-google-signin"
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="auth-divider">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text">or with email</span>
          <span className="auth-divider-line"></span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-input-group">
              <label htmlFor="auth-name" className="auth-label">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="auth-input"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="auth-email" className="auth-label">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-password" className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                disabled={isLoading}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="auth-submit-btn"
            id="btn-auth-submit"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to Voiceflow' : 'Create Account'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Modal Footer / Guest Fallback */}
        <div className="auth-modal-footer">
          <div className="auth-security-badge">
            <ShieldCheck size={13} />
            <span>End-to-End JWT Session Security</span>
          </div>

          <button
            type="button"
            className="auth-guest-link"
            onClick={onClose}
          >
            Continue as Guest without signing in
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
