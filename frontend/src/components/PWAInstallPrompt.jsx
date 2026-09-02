import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Share, 
  PlusSquare, 
  X, 
  Sparkles, 
  RefreshCw,
  Smartphone
} from 'lucide-react';

export const PWAInstallPrompt = ({
  isInstallable,
  isInstalled,
  isIOS,
  showIOSPrompt,
  setShowIOSPrompt,
  promptInstall,
  updateAvailable,
  updateServiceWorker
}) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Check if banner was dismissed recently in session storage
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (dismissed) {
      setBannerDismissed(true);
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <>
      {/* Update Available Notification Banner */}
      {updateAvailable && (
        <div className="pwa-update-bar fade-in">
          <div className="pwa-update-content">
            <RefreshCw size={16} className="animate-spin" />
            <span>A new version of Voiceflow AI is available!</span>
          </div>
          <button 
            onClick={updateServiceWorker} 
            className="pwa-update-btn"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Floating Bottom Install Banner (shown if installable, not installed, and not dismissed) */}
      {!isInstalled && isInstallable && !bannerDismissed && (
        <div className="pwa-floating-banner fade-in">
          <div className="pwa-banner-icon">
            <Smartphone size={20} color="#06b6d4" />
          </div>
          
          <div className="pwa-banner-text">
            <div className="pwa-banner-title">
              Install Voiceflow AI
            </div>
            <div className="pwa-banner-desc">
              Get full-screen AI voice chat, offline access & faster launch.
            </div>
          </div>

          <div className="pwa-banner-actions">
            <button
              onClick={promptInstall}
              className="pwa-install-action-btn"
            >
              <Download size={14} />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="pwa-dismiss-btn"
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* iOS Step-by-Step Install Guide Modal */}
      {showIOSPrompt && (
        <div className="pwa-modal-overlay fade-in" onClick={() => setShowIOSPrompt(false)}>
          <div className="pwa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">
                <Sparkles size={18} color="var(--accent-cyan)" />
                <span>Install on Apple iOS</span>
              </div>
              <button 
                className="pwa-modal-close"
                onClick={() => setShowIOSPrompt(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pwa-modal-body">
              <p className="pwa-modal-desc">
                To install <strong>Voiceflow AI</strong> on your iPhone or iPad:
              </p>

              <div className="pwa-steps-list">
                <div className="pwa-step-item">
                  <div className="pwa-step-num">1</div>
                  <div className="pwa-step-content">
                    <span>Tap the Safari <strong>Share</strong> button at the bottom of your screen.</span>
                    <div className="pwa-step-icon">
                      <Share size={18} color="#06b6d4" />
                    </div>
                  </div>
                </div>

                <div className="pwa-step-item">
                  <div className="pwa-step-num">2</div>
                  <div className="pwa-step-content">
                    <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                    <div className="pwa-step-icon">
                      <PlusSquare size={18} color="#a855f7" />
                    </div>
                  </div>
                </div>

                <div className="pwa-step-item">
                  <div className="pwa-step-num">3</div>
                  <div className="pwa-step-content">
                    <span>Tap <strong>Add</strong> in the top right corner.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pwa-modal-footer">
              <button 
                onClick={() => setShowIOSPrompt(false)} 
                className="pwa-modal-done-btn"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
