import React, { useState } from 'react';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../contexts/LanguageContext';

interface PWAInstallButtonProps {
  variant?: 'hero' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'hero' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useLanguage();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress completely when already running in standalone full-screen mode
  if (isInstalled) {
    return null;
  }

  // Android / Chrome native install flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'hero'
            ? 'inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-3 rounded-xl border border-[#10B981]/40 bg-[#262A30] hover:border-[#10B981] text-emerald-300 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer'
            : 'inline-flex items-center gap-1.5 hover:text-emerald-300 text-[#10B981] font-medium transition-colors cursor-pointer'
        }
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        <span>{t.installOnPhoneBtn}</span>
      </button>
    );
  }

  // iOS Safari Add to Home Screen flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'hero'
              ? 'inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-3 rounded-xl border border-[#10B981]/40 bg-[#262A30] hover:border-[#10B981] text-emerald-300 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer'
              : 'inline-flex items-center gap-1.5 hover:text-emerald-300 text-[#10B981] font-medium transition-colors cursor-pointer'
          }
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>{t.addToIphoneBtn}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161A]/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-heading"
          >
            <div className="relative w-full max-w-sm rounded-2xl bg-[#262A30] border border-[#10B981]/40 p-6 shadow-2xl space-y-4">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label={t.modalCloseAria}
                className="absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#363B44] hover:text-[#F3F4F6] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 pr-8">
                <img
                  src="/apple-touch-icon.png"
                  alt="Wesley Music Icon"
                  className="h-12 w-12 rounded-xl border border-[#10B981]/40 shrink-0"
                />
                <div>
                  <h3
                    id="ios-install-heading"
                    className="font-display text-base font-bold text-[#F3F4F6]"
                  >
                    {t.iosGuideTitle}
                  </h3>
                  <p className="text-xs text-[#10B981]">{t.iosGuideSubtitle}</p>
                </div>
              </div>

              <ol className="space-y-2.5 text-sm text-[#D1D5DB] leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <Share className="h-4 w-4 text-[#10B981] shrink-0 mt-1" />
                  <span>{t.iosGuideStep1}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PlusSquare className="h-4 w-4 text-[#10B981] shrink-0 mt-1" />
                  <span>{t.iosGuideStep2}</span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-bold text-sm transition-colors cursor-pointer"
              >
                {t.iosGuideConfirmBtn}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
