import React, { useState } from 'react';
import { X, KeyRound, Zap } from 'lucide-react';
import { FOLDER_PLANS, FolderPlan } from '../data/musicPacks';
import {
  getCountryByCode,
  getFormattedPlanPrice,
  getRegionCurrencyBadge,
} from '../data/countries';
import { getUsdtAmountForPlan } from '../data/paymentOrders';
import { CountrySelector } from './CountrySelector';

interface QuotaExhaustedModalProps {
  isOpen: boolean;
  exhaustedKeyCode?: string | null;
  selectedCountryCode: string;
  onSelectCountry: (code: string) => void;
  onStartDirectCheckout: (plan: FolderPlan) => void;
  onClose: () => void;
  onEnterNewKey: () => void;
}

export const QuotaExhaustedModal: React.FC<QuotaExhaustedModalProps> = ({
  isOpen,
  exhaustedKeyCode,
  selectedCountryCode,
  onSelectCountry,
  onStartDirectCheckout,
  onClose,
  onEnterNewKey,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('21-folder');

  if (!isOpen) return null;

  const selectedPlan =
    FOLDER_PLANS.find((p) => p.id === selectedPlanId) ?? FOLDER_PLANS[1] ?? FOLDER_PLANS[0];
  const selectedCountry = getCountryByCode(selectedCountryCode);
  const isHaiti = selectedCountryCode.trim().toUpperCase() === 'HT';
  const selectedPlanPrice = getFormattedPlanPrice(selectedPlan.id, selectedCountryCode);
  const selectedUsdtAmount = getUsdtAmountForPlan(selectedPlan.id);
  const currencyBadge = getRegionCurrencyBadge(selectedCountryCode);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161A]/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-exhausted-heading"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#262A30] border border-rose-500/40 shadow-2xl p-6 sm:p-8 my-auto text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fèmen fenèt la"
          className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#363B44] hover:text-[#F3F4F6] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pt-2 space-y-4">
          <h2
            id="quota-exhausted-heading"
            className="font-display text-xl sm:text-2xl font-bold text-[#F3F4F6] tracking-tight"
          >
            ⏰ PLAN OU FINI!
          </h2>

          {exhaustedKeyCode && (
            <p className="text-xs font-mono text-rose-300">
              Kle: {exhaustedKeyCode} · 0 Folder .ZIP ki rete
            </p>
          )}

          <p className="text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
            Ou fin telechaje tout folder .ZIP ki te nan plan ou a. Chwazi yon nouvo plan anba a
            pou w resevwa yon lòt Kle VIP otomatikman oswa antre yon Kòd Prepeye!
          </p>

          <div className="flex items-center justify-between gap-2 pt-1 text-left">
            <span className="text-xs text-[#9CA3AF]">
              Pri pou {selectedCountry.flag}{' '}
              <strong className="text-[#D1D5DB]">{selectedCountry.name}</strong> (
              <span className="font-mono text-emerald-300">{currencyBadge}</span>)
            </span>
            <CountrySelector
              compact
              selectedCountryCode={selectedCountryCode}
              onSelectCountry={onSelectCountry}
              align="right"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-left">
            {FOLDER_PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              const isUnlimited = plan.id === 'unlimited-vip';
              const planPrice = getFormattedPlanPrice(plan.id, selectedCountryCode);
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    onStartDirectCheckout(plan);
                  }}
                  className={`rounded-xl border p-3 transition-colors cursor-pointer ${
                    isUnlimited ? 'sm:col-span-2' : ''
                  } ${
                    isUnlimited
                      ? isSelected
                        ? 'bg-gradient-to-r from-amber-500/20 via-[#10B981]/20 to-amber-500/15 border-amber-300 text-[#F3F4F6] shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-gradient-to-r from-amber-500/10 via-[#10B981]/10 to-[#1C1F24] border-amber-400/55 text-[#F3F4F6] hover:border-amber-300'
                      : isSelected
                        ? 'bg-[#10B981]/15 border-emerald-400 text-[#F3F4F6]'
                        : 'bg-[#1C1F24] border-[#363B44] text-[#D1D5DB] hover:border-[#10B981]/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span
                      className={`font-display text-xs sm:text-sm font-extrabold ${
                        isUnlimited ? 'text-amber-300' : 'text-[#F3F4F6]'
                      }`}
                    >
                      {plan.shortLabel}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {plan.recommended && (
                        <span className="rounded bg-amber-400/20 border border-amber-400/45 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-300">
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
                  <div
                    className={`mt-1 font-mono text-xs font-extrabold tabular-nums ${
                      isUnlimited ? 'text-amber-200' : 'text-emerald-300'
                    }`}
                  >
                    {planPrice}
                  </div>
                  <div className="text-[11px] font-mono text-[#9CA3AF] mt-0.5">
                    {plan.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 space-y-3">
            <button
              type="button"
              onClick={() => onStartDirectCheckout(selectedPlan)}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#059669] via-[#10B981] to-[#059669] hover:brightness-110 text-[#0B1410] font-display font-extrabold text-xs sm:text-sm px-4 py-3.5 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4 shrink-0" />
              <span>
                {isHaiti
                  ? `⚡ PEYE AK NATCASH (${selectedPlan.shortLabel} · ${selectedPlanPrice})`
                  : `💳 Peye ak Kat Visa / Mastercard / Apple Pay (${selectedPlan.shortLabel} · ${selectedUsdtAmount} USDT)`}
              </span>
            </button>

            <button
              type="button"
              onClick={onEnterNewKey}
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#363B44] bg-[#1C1F24] hover:border-[#10B981]/60 text-[#F3F4F6] text-sm font-semibold px-4 py-2.5 transition-colors cursor-pointer"
            >
              <KeyRound className="h-4 w-4 text-[#10B981]" />
              <span>🔑 Antre yon Nouvo Kle VIP / Kat Prepeye</span>
            </button>

            <p className="text-xs text-[#9CA3AF] leading-relaxed pt-1">
              {isHaiti
                ? '🇭🇹 Ayiti: Peye dirèkteman ak Natcash (+509 56568810) epi resevwa Kle VIP ou touswit sou ekran an!'
                : `🌐 Entènasyonal (${selectedCountry.flag}): Peye an liy ak USDT (TRC20) pou w resevwa Kle VIP ou touswit sou ekran an!`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

