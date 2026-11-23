import React, { useCallback, useEffect, useState } from 'react';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Lock,
  Unlock,
  Users,
  ShoppingBag,
  RefreshCw,
  FolderCheck,
  AlertCircle,
} from 'lucide-react';
import {
  REFERRAL_PURCHASED_GOAL,
  REFERRAL_REGISTERED_GOAL,
  VisitorProfile,
  claimReferralRewardRemote,
  fetchReferralProgressRemote,
} from '../data/visitors';

interface ReferralProgramCardProps {
  visitor: VisitorProfile;
  onVisitorUpdated: (updated: VisitorProfile) => void;
  onRewardClaimedToast: (message: string) => void;
}

export const ReferralProgramCard: React.FC<ReferralProgramCardProps> = ({
  visitor,
  onVisitorUpdated,
  onRewardClaimedToast,
}) => {
  const [registeredCount, setRegisteredCount] = useState<number>(0);
  const [purchasedCount, setPurchasedCount] = useState<number>(0);
  const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(true);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedTikTok, setCopiedTikTok] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://wesleymusicpacks.com';
  const shareUrl = `${origin}/?ref=${visitor.referralCode}`;

  const syncProgress = useCallback(async () => {
    const res = await fetchReferralProgressRemote(visitor);
    setIsLoadingProgress(false);
    if (res.connected) {
      setRegisteredCount(res.registeredCount);
      setPurchasedCount(res.purchasedCount);
      if (res.ownProfile) {
        onVisitorUpdated(res.ownProfile);
      }
    }
  }, [visitor.referralCode, visitor.sessionId, visitor.phoneNumber, onVisitorUpdated]);

  useEffect(() => {
    void syncProgress();
    const pollId = window.setInterval(() => {
      void syncProgress();
    }, 10_000);
    return () => window.clearInterval(pollId);
  }, [syncProgress]);

  const copyTextToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleCopyShareLink = async () => {
    await copyTextToClipboard(shareUrl);
    setCopiedLink(true);
    onRewardClaimedToast('📋 Lyen pataj ou a kopye! Pataje l ak zanmi w yo.');
    window.setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareText = `🎧 Vin telechaje meyè Folder Mizik .ZIP yo (Konpa, Rabòday, Afrobeats, Hip-Hop) sou WESLEY MUSIC PACKS! Enskri sou lyen pa m nan kounye a: ${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShareWhatsAppOrTikTok = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'WESLEY MUSIC PACKS • Folder Mizik VIP',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or Web Share unavailable in iframe — copy TikTok/WhatsApp caption cleanly
      }
    }
    await copyTextToClipboard(shareText);
    setCopiedTikTok(true);
    onRewardClaimedToast('📲 Mesaj pataj + lyen ou a kopye pou WhatsApp / TikTok!');
    window.setTimeout(() => setCopiedTikTok(false), 2500);
  };

  const handleClaimReward = async () => {
    if (isClaiming) return;
    setActionError(null);
    setIsClaiming(true);
    const res = await claimReferralRewardRemote(visitor);
    setIsClaiming(false);

    if (res.visitor) {
      onVisitorUpdated(res.visitor);
    }
    if (!res.success) {
      setActionError(res.error ?? 'Pa kapab reklame kredi gratis la kounye a.');
      return;
    }

    onRewardClaimedToast(
      '🎁 Felisitasyon! Ou jwenn +1 Kredi Folder Gratis! Klike sou nenpòt pake pou w telechaje .ZIP ou a.'
    );
  };

  const regPercent = Math.min(100, Math.round((registeredCount / REFERRAL_REGISTERED_GOAL) * 100));
  const purPercent = Math.min(100, Math.round((purchasedCount / REFERRAL_PURCHASED_GOAL) * 100));
  const conditionsMet =
    registeredCount >= REFERRAL_REGISTERED_GOAL && purchasedCount >= REFERRAL_PURCHASED_GOAL;
  const hasBonusCredits = visitor.bonusCredits > 0;
  const isClaimed = visitor.referralRewardClaimed;

  return (
    <section aria-label="Pwogram Pataj ak Rekonpans" className="border-b border-[#363B44] bg-[#1E2228]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-[#10B981]/35 bg-[#262A30] p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.28)] space-y-5">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 px-3 py-1 text-xs font-extrabold text-emerald-300">
                <Gift className="h-3.5 w-3.5 shrink-0" />
                <span>Kòd Pataj Pèsonèl Ou:</span>
                <span className="font-mono tracking-wider text-[#F3F4F6]">
                  {visitor.referralCode}
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#F3F4F6] tracking-tight">
                🎁 PATAJE &amp; GANYEN 1 FOLDER GRATIS
              </h2>
              <p className="text-xs sm:text-sm text-[#D1D5DB] leading-relaxed">
                Envite <strong className="text-[#F3F4F6]">15 moun</strong> enskri ak nimewo
                telefòn yo sou lyen ou a epi fòk omwen{' '}
                <strong className="text-emerald-300">5 ladan yo pran yon plan VIP</strong> pou w
                debloke <strong className="text-amber-300">1 Folder .ZIP GRATIS</strong> touswit!
              </p>
            </div>

            <div className="flex items-center gap-2 self-start shrink-0">
              {hasBonusCredits && (
                <a
                  href="#pake-mizik"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] px-3.5 py-2 text-xs font-extrabold text-[#0B1410] transition-colors"
                >
                  <FolderCheck className="h-4 w-4 shrink-0" />
                  <span>🎁 {visitor.bonusCredits} Kredi Gratis Pare!</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => void syncProgress()}
                title="Rafrechi estatistik pataj yo"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1C1F24] border border-[#363B44] hover:border-[#10B981]/50 px-3 py-2 text-xs font-semibold text-[#D1D5DB] transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingProgress ? 'animate-spin' : ''}`} />
                <span>Rafrechi</span>
              </button>
            </div>
          </div>

          {/* Personal Share Link + 1-Click Share Buttons */}
          <div className="rounded-xl border border-[#363B44] bg-[#1C1F24] p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-[#9CA3AF] mb-1">
                  Lyen Pataj Pèsonèl Ou
                </span>
                <div className="rounded-lg bg-[#262A30] border border-[#363B44] px-3 py-2 font-mono text-xs sm:text-sm text-emerald-300 truncate select-all">
                  {shareUrl}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleCopyShareLink()}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" />
                      <span>✔ Lyen Kopye!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" />
                      <span>📋 Kopye Lyen Pataj Mwen</span>
                    </>
                  )}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#262A30] border border-[#10B981]/45 hover:bg-[#10B981]/15 text-emerald-300 text-xs font-bold whitespace-nowrap transition-colors"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  <span>📲 Pataje sou WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => void handleShareWhatsAppOrTikTok()}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#262A30] border border-[#363B44] hover:border-amber-400/50 text-[#F3F4F6] text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                >
                  {copiedTikTok ? (
                    <>
                      <Check className="h-4 w-4 text-[#10B981] shrink-0" />
                      <span className="text-emerald-300">✔ Kopye pou TikTok!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-amber-300 shrink-0" />
                      <span>📲 Pataje sou WhatsApp / TikTok</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Dual Live Progress Tracker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar 1 — Registered Friends */}
            <div className="rounded-xl border border-[#363B44] bg-[#1C1F24] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#F3F4F6]">
                  <Users className="h-4 w-4 text-[#10B981] shrink-0" />
                  <span>Moun ki Enskri Sou Lyen Ou</span>
                </div>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-emerald-300 tabular-nums shrink-0">
                  {registeredCount} / {REFERRAL_REGISTERED_GOAL}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#262A30] overflow-hidden border border-[#363B44]">
                <div
                  className="h-full bg-gradient-to-r from-[#059669] to-[#10B981] transition-all duration-500"
                  style={{ width: `${regPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                {registeredCount >= REFERRAL_REGISTERED_GOAL
                  ? '✅ Objektif 15 moun enskri a konplè!'
                  : `Rete ${Math.max(
                      0,
                      REFERRAL_REGISTERED_GOAL - registeredCount
                    )} moun inik pou enskri ak nimewo telefòn yo.`}
              </p>
            </div>

            {/* Bar 2 — Referred Buyers Who Purchased VIP */}
            <div className="rounded-xl border border-[#363B44] bg-[#1C1F24] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#F3F4F6]">
                  <ShoppingBag className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Kliyan ki Pran yon Plan VIP</span>
                </div>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-300 tabular-nums shrink-0">
                  {purchasedCount} / {REFERRAL_PURCHASED_GOAL}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#262A30] overflow-hidden border border-[#363B44]">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                  style={{ width: `${purPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                {purchasedCount >= REFERRAL_PURCHASED_GOAL
                  ? '✅ Objektif 5 kliyan ki peye a konplè!'
                  : `Rete ${Math.max(
                      0,
                      REFERRAL_PURCHASED_GOAL - purchasedCount
                    )} kliyan pami moun ou envite yo ki pou achte yon plan VIP.`}
              </p>
            </div>
          </div>

          {actionError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 text-xs font-semibold text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Reward Claim / Status Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {isClaimed ? (
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#10B981]/45 bg-[#10B981]/10 px-4 py-3">
                <div className="text-xs sm:text-sm font-bold text-emerald-200">
                  {hasBonusCredits
                    ? `🎉 Ou gen ${visitor.bonusCredits} Kredi Folder Gratis aktif! Desann nan katalòg la epi klike "⬇️ TELECHAJE .ZIP" sou nenpòt pake.`
                    : '✅ Rekonpans 1 Folder Gratis ou a deja reklame ak itilize. Mèsi dèske w pataje!'}
                </div>
                {hasBonusCredits && (
                  <a
                    href="#pake-mizik"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] px-4 py-2 text-xs font-extrabold text-[#0B1410] whitespace-nowrap shrink-0 transition-colors"
                  >
                    <span>Telechaje .ZIP Gratis</span>
                  </a>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-[#9CA3AF]">
                  Bouton rekonpans lan ap debloke otomatikman kou{' '}
                  <strong className="text-[#D1D5DB]">toulède kontè yo</strong> konplè (15/15 Enskri
                  ak 5/5 Achte).
                </p>
                <button
                  type="button"
                  disabled={!conditionsMet || isClaiming}
                  onClick={() => void handleClaimReward()}
                  className={`inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl font-display font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all shrink-0 ${
                    conditionsMet
                      ? 'bg-[#10B981] hover:bg-[#059669] text-[#0B1410] shadow-[0_0_24px_rgba(16,185,129,0.35)] cursor-pointer'
                      : 'bg-[#1C1F24] border border-[#363B44] text-[#9CA3AF] opacity-75 cursor-not-allowed'
                  }`}
                >
                  {conditionsMet ? (
                    <Unlock className="h-4 w-4 shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {isClaiming
                      ? '⏳ Ap debloke 1 Folder Gratis...'
                      : '🎁 Reklame 1 Kredi Folder Gratis'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
