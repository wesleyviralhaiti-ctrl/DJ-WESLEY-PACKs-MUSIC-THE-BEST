import React from 'react';
import { Disc3, Download, Lock, CheckCircle2, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  DEFAULT_VIRTUALDJ_BONUS,
  VirtualDjBonusConfig,
  triggerVirtualDjDirectDownload,
} from '../data/virtualDjBonus';

interface VirtualDjBonusCardProps {
  bonus: VirtualDjBonusConfig;
  isUnlocked: boolean;
  onUnlockPlansClick: () => void;
  onDownloadStartedToast: (message: string) => void;
}

export const VirtualDjBonusCard: React.FC<VirtualDjBonusCardProps> = ({
  bonus,
  isUnlocked,
  onUnlockPlansClick,
  onDownloadStartedToast,
}) => {
  const { t } = useLanguage();

  if (!bonus.isActive) return null;

  const hasDownloadLink = Boolean(bonus.downloadUrl && bonus.downloadUrl.trim().length > 0);
  const displayTitle =
    bonus.title && bonus.title.trim() && bonus.title.trim() !== DEFAULT_VIRTUALDJ_BONUS.title
      ? bonus.title.trim()
      : t.virtualDjDefaultTitle;

  const handleDownloadClick = () => {
    if (!isUnlocked || !hasDownloadLink) return;
    const launched = triggerVirtualDjDirectDownload(bonus.downloadUrl, displayTitle);
    if (launched) {
      onDownloadStartedToast(t.virtualDjDownloadStartedToast);
    }
  };

  return (
    <section
      aria-label={t.virtualDjCardBadge}
      className="border-b border-[#363B44] bg-[#181B20]"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div
          className={`rounded-2xl border p-5 sm:p-6 shadow-[0_10px_32px_rgba(0,0,0,0.28)] transition-colors ${
            isUnlocked
              ? 'border-[#10B981]/50 bg-gradient-to-r from-[#09291E] via-[#1B2523] to-[#22272E]'
              : 'border-amber-400/40 bg-gradient-to-r from-[#1E2228] via-[#242830] to-[#1F2229]'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left Info */}
            <div className="flex items-start gap-4 min-w-0">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                  isUnlocked
                    ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]'
                    : 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                }`}
              >
                <Disc3 className="h-6 w-6" aria-hidden="true" />
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold tracking-tight border ${
                      isUnlocked
                        ? 'bg-[#10B981]/15 border-[#10B981]/45 text-emerald-300'
                        : 'bg-amber-400/15 border-amber-400/40 text-amber-200'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t.virtualDjCardBadge}</span>
                  </span>

                  {bonus.fileSize && (
                    <span className="font-mono text-xs font-semibold text-[#9CA3AF]">
                      {bonus.fileSize}
                    </span>
                  )}
                </div>

                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#F3F4F6] tracking-tight">
                  {displayTitle}
                </h2>

                {isUnlocked ? (
                  <p className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" aria-hidden="true" />
                    <span>{t.virtualDjUnlockedBadge}</span>
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm font-semibold text-amber-200 leading-relaxed">
                    {t.virtualDjLockedMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Right Action Area */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {isUnlocked ? (
                hasDownloadLink ? (
                  <button
                    type="button"
                    onClick={handleDownloadClick}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-extrabold text-xs sm:text-sm whitespace-nowrap shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t.virtualDjDownloadBtn}</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl bg-[#262A30] border border-[#363B44] text-xs font-semibold text-[#D1D5DB] whitespace-nowrap">
                    <span>{t.virtualDjPendingLinkBtn}</span>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={onUnlockPlansClick}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#14161A] font-display font-extrabold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer"
                >
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t.virtualDjLockedCtaBtn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
