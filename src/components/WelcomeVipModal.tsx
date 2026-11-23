import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Download,
  AlertCircle,
  FolderArchive,
  Clock,
  Zap,
} from 'lucide-react';
import {
  FOLDER_PLANS,
  FolderPlan,
  MusicPack,
  VipKeyRecord,
  formatZipFolderFilename,
  validateVipKeyCodeRemote,
} from '../data/musicPacks';
import {
  getCountryByCode,
  getFormattedPlanPrice,
  getRegionCurrencyBadge,
} from '../data/countries';
import { getUsdtAmountForPlan } from '../data/paymentOrders';
import { CountrySelector } from './CountrySelector';
import { ZipFilenameText } from './ZipFilenameText';

interface WelcomeVipModalProps {
  isOpen: boolean;
  allPacks: MusicPack[];
  activeKey: VipKeyRecord | null;
  pendingPack: MusicPack | null;
  selectedCountryCode: string;
  onSelectCountry: (code: string) => void;
  onStartDirectCheckout: (plan: FolderPlan) => void;
  onUnlock: (record: VipKeyRecord) => void;
  onUnlockOrDownloadPack: (pack: MusicPack) => void;
  onBrowsePacks: () => void;
}

export const WelcomeVipModal: React.FC<WelcomeVipModalProps> = ({
  isOpen,
  allPacks,
  activeKey,
  pendingPack,
  selectedCountryCode,
  onSelectCountry,
  onStartDirectCheckout,
  onUnlock,
  onUnlockOrDownloadPack,
  onBrowsePacks,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('21-folder');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsValidatingKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlan =
    FOLDER_PLANS.find((p) => p.id === selectedPlanId) ?? FOLDER_PLANS[1] ?? FOLDER_PLANS[0];
  const selectedCountry = getCountryByCode(selectedCountryCode);
  const isHaiti = selectedCountryCode.trim().toUpperCase() === 'HT';
  const selectedPlanPrice = getFormattedPlanPrice(selectedPlan.id, selectedCountryCode);
  const selectedUsdtAmount = getUsdtAmountForPlan(selectedPlan.id);
  const currencyBadge = getRegionCurrencyBadge(selectedCountryCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidatingKey) return;
    setIsValidatingKey(true);
    setErrorMsg(null);
    const result = await validateVipKeyCodeRemote(keyInput);
    setIsValidatingKey(false);
    if (result.status !== 'valid' || !result.record) {
      setErrorMsg(result.error ?? '🚫 KÒD SA A DEJA SÈVI / EKSPIRE');
      return;
    }
    setErrorMsg(null);
    onUnlock(result.record);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161A]/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-welcome-heading"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#262A30] border border-[#363B44] shadow-2xl p-6 sm:p-8 my-auto">
        <button
          type="button"
          onClick={onBrowsePacks}
          aria-label="Fèmen fenèt la"
          className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#363B44] hover:text-[#F3F4F6] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#10B981]"
        >
          <X className="h-5 w-5" />
        </button>

        {activeKey && (activeKey.isUnlimited || activeKey.totalFolders >= 999 || activeKey.remainingFolders > 0) ? (
          /* Unlocked inside popup: clean .ZIP download list */
          <div className="space-y-5">
            <div className="pr-8">
              <div className="flex items-center gap-2 text-[#10B981] text-sm font-semibold mb-2 tabular-nums">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>
                  {activeKey.isUnlimited || activeKey.totalFolders >= 999
                    ? '👑 Aksè VIP Ilimite Aktif (Tout Katalòg la)'
                    : `📁 Kredi Folder ki rete: ${activeKey.remainingFolders} / ${activeKey.totalFolders} Folder`}
                </span>
              </div>
              <h2
                id="vip-welcome-heading"
                className="font-display text-2xl font-bold text-[#F3F4F6] tracking-tight"
              >
                Chwazi Folder .ZIP pou w Telechaje
              </h2>
              <p className="mt-1.5 text-sm text-[#9CA3AF]">
                Kòd <span className="font-mono text-[#D1D5DB]">{activeKey.code}</span> aktif.
                Klike sou nenpòt folder pou w telechaje .ZIP la (1 Kredi Folder).
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#363B44] border border-[#363B44] rounded-xl bg-[#1C1F24]">
              {allPacks.map((pack) => {
                const isComingSoon = Boolean(pack.isComingSoon);
                const isTarget = pendingPack?.id === pack.id;
                return (
                  <div
                    key={pack.id}
                    className={`flex items-center justify-between gap-3 p-3.5 ${
                      isTarget && !isComingSoon ? 'bg-[#10B981]/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isComingSoon ? (
                        <Clock className="h-5 w-5 text-amber-400 shrink-0 animate-[spin_6s_linear_infinite]" />
                      ) : (
                        <FolderArchive className="h-5 w-5 text-[#10B981] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F3F4F6] leading-snug font-mono">
                          <ZipFilenameText filename={formatZipFolderFilename(pack)} />
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            isComingSoon ? 'text-amber-300 font-medium' : 'text-[#9CA3AF]'
                          }`}
                        >
                          {isComingSoon
                            ? `${pack.genre} · ⏳ AN PREPARASYON`
                            : `${pack.genre} · ${pack.trackCount} Mizik an Lòd`}
                        </p>
                      </div>
                    </div>

                    {isComingSoon ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#262A30] border border-amber-500/35 px-2.5 py-2 text-[11px] font-bold text-amber-300 whitespace-nowrap">
                        ⏳ Poko Disponib
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUnlockOrDownloadPack(pack)}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-semibold text-xs px-3 py-2 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>⬇️ TELECHAJE .ZIP</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onBrowsePacks}
                className="text-sm font-medium text-[#D1D5DB] hover:text-[#F3F4F6] underline underline-offset-4 transition-colors cursor-pointer"
              >
                Wè tout folder .ZIP yo sou sit la
              </button>
            </div>
          </div>
        ) : (
          /* Clean 2-Way VIP Access Modal: Top Prepaid/VIP Code + Bottom Automated Online Checkout */
          <div className="space-y-6">
            {/* TOP BOX: 🔑 OU GEN YON KLE VIP / KAT PREPEYE? */}
            <div className="rounded-xl border border-[#363B44] bg-[#202429] p-4 sm:p-5">
              <div className="pr-8">
                <h2
                  id="vip-welcome-heading"
                  className="font-display text-lg sm:text-xl font-bold text-[#F3F4F6] tracking-tight"
                >
                  🔑 OU GEN YON KLE VIP / KAT PREPEYE?
                </h2>
                {pendingPack ? (
                  <p className="mt-1.5 text-xs sm:text-sm text-[#D1D5DB] leading-relaxed">
                    Antre kòd ou a pou w telechaje{' '}
                    <span className="font-semibold font-mono text-emerald-300">
                      {formatZipFolderFilename(pendingPack)}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                    Antre Kle VIP oswa Kòd Kat Prepeye ou a anba a pou w debloke tout folder .ZIP yo touswit.
                  </p>
                )}
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3" noValidate>
                <div>
                  <label htmlFor="vip-key-input" className="sr-only">
                    Antre Kle VIP ou
                  </label>
                  <input
                    id="vip-key-input"
                    type="text"
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value.toUpperCase());
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Antre Kle VIP ou isit la... ex: W#84K2"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-4 py-3 text-base font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/25 transition-colors"
                  />
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 text-xs font-semibold text-rose-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isValidatingKey}
                  className="w-full min-h-[48px] rounded-xl bg-[#10B981] hover:bg-[#059669] active:bg-emerald-700 disabled:opacity-65 text-[#0B1410] font-display font-extrabold text-sm sm:text-base tracking-tight px-5 py-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  {isValidatingKey
                    ? '⏳ Ap verifye Kle VIP la...'
                    : '🔓 DEBLOKE AKSÈ VIP KOUNYE A'}
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#363B44]" />
              <span className="absolute bg-[#262A30] px-3 text-xs font-semibold tracking-wider text-[#9CA3AF] whitespace-nowrap">
                — OUBYEN —
              </span>
            </div>

            {/* BOTTOM BOX: 🛒 ACHTE KLE VIP OTOMATIK AN LIY */}
            <div className="rounded-xl border border-[#10B981]/35 bg-[#202429] p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#F3F4F6] tracking-tight">
                    🛒 ACHTE KLE VIP OTOMATIK AN LIY
                  </h3>
                  <p className="mt-0.5 text-xs text-[#9CA3AF]">
                    Pri pou {selectedCountry.flag}{' '}
                    <span className="text-[#D1D5DB] font-semibold">{selectedCountry.name}</span> (
                    <span className="font-mono text-emerald-300">{currencyBadge}</span>)
                  </p>
                </div>
                <div className="shrink-0">
                  <CountrySelector
                    compact
                    selectedCountryCode={selectedCountryCode}
                    onSelectCountry={onSelectCountry}
                    align="right"
                  />
                </div>
              </div>

              {/* Plan Selector Grid (4 folder tiers + full-width Gold/Emerald Unlimited VIP tier) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Chwazi Plan Folder VIP">
                {FOLDER_PLANS.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  const isUnlimited = plan.id === 'unlimited-vip';
                  const planPrice = getFormattedPlanPrice(plan.id, selectedCountryCode);
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        onStartDirectCheckout(plan);
                      }}
                      className={`relative flex flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        isUnlimited ? 'sm:col-span-2' : ''
                      } ${
                        isUnlimited
                          ? isSelected
                            ? 'bg-gradient-to-r from-amber-500/20 via-[#10B981]/20 to-amber-500/15 border-amber-300 text-[#F3F4F6] shadow-[0_0_24px_rgba(245,158,11,0.28)]'
                            : 'bg-gradient-to-r from-amber-500/10 via-[#10B981]/10 to-[#262A30] border-amber-400/55 text-[#F3F4F6] hover:border-amber-300'
                          : isSelected
                            ? 'bg-[#10B981]/15 border-emerald-400 text-[#F3F4F6] shadow-[0_0_16px_rgba(16,185,129,0.16)]'
                            : 'bg-[#1C1F24] border-[#363B44] text-[#D1D5DB] hover:border-[#10B981]/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between w-full gap-1.5">
                        <span
                          className={`font-display text-sm font-extrabold ${
                            isUnlimited ? 'text-amber-300' : 'text-[#F3F4F6]'
                          }`}
                        >
                          {plan.shortLabel}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {plan.recommended && (
                            <span className="rounded bg-amber-400/20 border border-amber-400/45 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-300">
                              POPILÈ
                            </span>
                          )}
                          {plan.badge && (
                            <span className="rounded bg-[#10B981]/15 border border-emerald-400/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`mt-1.5 font-mono text-xs sm:text-[13px] font-extrabold tabular-nums ${
                          isUnlimited ? 'text-amber-200' : 'text-emerald-300'
                        }`}
                      >
                        {planPrice}
                      </span>
                      <span className="mt-0.5 text-[11px] font-mono text-[#9CA3AF]">
                        {plan.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Direct Built-In Checkout Button (Haiti Natcash / International USDT TRC20) */}
              <button
                type="button"
                onClick={() => onStartDirectCheckout(selectedPlan)}
                className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#059669] via-[#10B981] to-[#059669] hover:brightness-110 text-[#0B1410] font-display font-extrabold text-xs sm:text-sm px-4 py-3.5 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all text-center cursor-pointer"
              >
                <Zap className="h-4 w-4 shrink-0" />
                <span>
                  {isHaiti
                    ? `⚡ PEYE AK NATCASH (${selectedPlan.shortLabel} · ${selectedPlanPrice})`
                    : `💳 Peye ak Kat Visa / Mastercard / Apple Pay (${selectedPlan.shortLabel} · ${selectedUsdtAmount} USDT)`}
                </span>
              </button>

              <p className="text-xs text-[#D1D5DB] text-center leading-relaxed pt-0.5">
                {isHaiti
                  ? '🇭🇹 Ayiti: Peye dirèkteman ak Natcash (+509 56568810) epi resevwa Kle VIP ou touswit sou ekran an!'
                  : `🌐 Entènasyonal (${selectedCountry.flag}): Peye ak Kat Visa / Mastercard / Apple Pay oswa voye USDT (TRC20) pou w resevwa Kle VIP ou touswit!`}
              </p>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={onBrowsePacks}
                className="inline-flex items-center justify-center min-h-[38px] px-3 py-1.5 text-sm font-medium text-[#9CA3AF] hover:text-[#F3F4F6] underline underline-offset-4 transition-colors cursor-pointer"
              >
                👀 Gade Folder .ZIP yo Anvan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
