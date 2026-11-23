import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { CountrySelector } from './CountrySelector';
import { getCountryByCode, getRegionCurrencyBadge } from '../data/countries';
import {
  VisitorProfile,
  getDialCodeForCountry,
  getPhonePlaceholderForCountry,
  registerOrUpdateVisitorRemote,
  validateCountryPhoneNumber,
} from '../data/visitors';

interface VisitorEntryGateModalProps {
  isOpen: boolean;
  selectedCountryCode: string;
  onSelectCountry: (code: string) => void;
  onCompleted: (visitor: VisitorProfile) => void;
  onOpenAdmin: () => void;
}

export const VisitorEntryGateModal: React.FC<VisitorEntryGateModalProps> = ({
  isOpen,
  selectedCountryCode,
  onSelectCountry,
  onCompleted,
  onOpenAdmin,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = useMemo(
    () => getCountryByCode(selectedCountryCode),
    [selectedCountryCode]
  );
  const dialCode = useMemo(
    () => getDialCodeForCountry(selectedCountry.code),
    [selectedCountry.code]
  );
  const phonePlaceholder = useMemo(
    () => getPhonePlaceholderForCountry(selectedCountry.code),
    [selectedCountry.code]
  );
  const currencyBadge = useMemo(
    () => getRegionCurrencyBadge(selectedCountry.code),
    [selectedCountry.code]
  );

  // Real-time live validation preview once the visitor types enough digits
  const liveValidation = useMemo(() => {
    const trimmed = phoneInput.trim();
    if (!trimmed) return null;
    return validateCountryPhoneNumber(trimmed, selectedCountry.code);
  }, [phoneInput, selectedCountry.code]);

  // Clear stale error when country switches
  useEffect(() => {
    setSubmitError(null);
  }, [selectedCountryCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);
    const result = await registerOrUpdateVisitorRemote({
      fullName,
      countryCode: selectedCountry.code,
      rawPhone: phoneInput,
    });
    setIsSubmitting(false);

    if (!result.success || !result.visitor) {
      setSubmitError(
        result.error ??
          `⚠️ Nimewo telefòn sa a pa konpatib ak peyi ${selectedCountry.name} (+${dialCode})! Tanpri antre yon vrè nimewo telefòn ki valid pou peyi sa a.`
      );
      return;
    }

    onCompleted(result.visitor);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161A]/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-gate-heading"
    >
      {/* Note: no overflow-hidden on outer card so CountrySelector dropdown is never clipped */}
      <div className="relative w-full max-w-lg rounded-2xl bg-[#262A30] border border-[#363B44] shadow-[0_24px_80px_rgba(0,0,0,0.55)] my-auto">
        <div className="rounded-t-2xl border-b border-[#363B44] bg-[#202429] px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#10B981]">
                WESLEY MUSIC PACKS · AKSÈ VIZITÈ
              </p>
              <h2
                id="visitor-gate-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-[#F3F4F6] tracking-tight"
              >
                🎧 Byenvini! Antre Enfòmasyon Ou
              </h2>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/15 border border-[#10B981]/35 text-[#10B981]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-[#D1D5DB] leading-relaxed">
            Ranpli non konplè ou, chwazi peyi w, epi mete yon vrè nimewo telefòn ki mache ak peyi
            ou chwazi a pou w antre nan katalòg la.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
          {/* 1. Full Name */}
          <div>
            <label
              htmlFor="visitor-full-name"
              className="block text-xs sm:text-sm font-bold text-[#F3F4F6] mb-2"
            >
              👤 Non Konplè Ou
            </label>
            <input
              id="visitor-full-name"
              type="text"
              required
              minLength={3}
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              placeholder="Ex: Jean-Baptiste Wesley"
              className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-4 py-3 text-sm text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          {/* 2. Country */}
          <div>
            <span className="block text-xs sm:text-sm font-bold text-[#F3F4F6] mb-2">
              🌍 Peyi Ou
            </span>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5">
              <CountrySelector
                selectedCountryCode={selectedCountry.code}
                onSelectCountry={(code) => {
                  onSelectCountry(code);
                  setSubmitError(null);
                }}
                align="left"
              />
              <span className="font-mono text-xs font-semibold text-emerald-300">
                Kòd: +{dialCode} · {currencyBadge}
              </span>
            </div>
          </div>

          {/* 3. Country-Validated Phone Number */}
          <div>
            <label
              htmlFor="visitor-phone-number"
              className="block text-xs sm:text-sm font-bold text-[#F3F4F6] mb-2"
            >
              📱 Nimewo Telefòn Ou / Phone Number
            </label>
            <div className="flex items-stretch rounded-xl bg-[#1C1F24] border border-[#363B44] focus-within:border-[#10B981] overflow-hidden transition-colors">
              <div
                aria-label={`Kòd peyi +${dialCode}`}
                className="flex items-center gap-1.5 bg-[#202429] border-r border-[#363B44] px-3.5 py-3 text-sm font-mono font-bold text-emerald-300 shrink-0 select-none"
              >
                <span aria-hidden="true">{selectedCountry.flag}</span>
                <span>+{dialCode}</span>
              </div>
              <input
                id="visitor-phone-number"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel-national"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                placeholder={phonePlaceholder}
                className="w-full bg-transparent px-3.5 py-3 text-sm font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:outline-none"
              />
            </div>

            {/* Live country format indicator */}
            {liveValidation && phoneInput.trim().length >= 4 && !submitError && (
              <div className="mt-2">
                {liveValidation.valid ? (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Nimewo valid pou {selectedCountry.flag} {selectedCountry.name}:{' '}
                      <span className="font-mono font-bold">
                        {liveValidation.formattedInternational}
                      </span>
                    </span>
                  </p>
                ) : (
                  <p className="inline-flex items-start gap-1.5 text-xs font-medium text-amber-300/90">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Antre nimewo ki kòrèk pou {selectedCountry.flag} {selectedCountry.name} (+
                      {dialCode}) — egzanp: <span className="font-mono">{phonePlaceholder}</span>
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Blocking Validation Error Alert */}
          {submitError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-500/15 border border-rose-500/50 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-200 leading-relaxed"
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-[#0B1410] font-display font-extrabold text-sm sm:text-base transition-colors cursor-pointer shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
          >
            <span>
              {isSubmitting ? 'Ap verifye nimewo ou a...' : '🚀 ANTRE NAN SIT LA KOUNYE A'}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>

          <div className="pt-2 border-t border-[#363B44] flex items-center justify-between text-[11px] text-[#9CA3AF]">
            <span>🔒 Enfòmasyon ou yo pwoteje pou verifikasyon kliyan sèlman.</span>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 text-[#D1D5DB] hover:text-emerald-300 transition-colors cursor-pointer shrink-0 ml-2"
            >
              <Lock className="h-3 w-3" />
              <span>Admin VIP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
