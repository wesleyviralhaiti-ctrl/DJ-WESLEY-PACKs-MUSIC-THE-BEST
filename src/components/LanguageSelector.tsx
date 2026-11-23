import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from '../data/i18n';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'pill' | 'gate';
  align?: 'left' | 'right';
  onManualSelect?: (lang: SupportedLanguageCode) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'pill',
  align = 'right',
  onManualSelect,
}) => {
  const { lang, languageOption, setLang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handlePick = (code: SupportedLanguageCode) => {
    setLang(code, true);
    onManualSelect?.(code);
    setIsOpen(false);
  };

  if (variant === 'gate') {
    return (
      <div>
        <span className="block text-xs sm:text-sm font-bold text-[#F3F4F6] mb-2">
          {t.gateLanguageLabel}
        </span>
        <div
          role="radiogroup"
          aria-label={t.gateLanguageLabel}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        >
          {SUPPORTED_LANGUAGES.map((opt) => {
            const isSelected = opt.code === lang;
            return (
              <button
                key={opt.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handlePick(opt.code)}
                className={`flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#10B981]/20 border-[#10B981] text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.18)]'
                    : 'bg-[#1C1F24] border-[#363B44] text-[#D1D5DB] hover:border-[#10B981]/50 hover:text-[#F3F4F6]'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <span aria-hidden="true" className="text-sm shrink-0">
                    {opt.flag}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t.languageSwitcherLabel}
        title={t.languageSwitcherLabel}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#363B44] bg-[#1C1F24] hover:border-[#10B981]/60 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-[#F3F4F6] transition-colors cursor-pointer whitespace-nowrap"
      >
        <Globe className="h-3.5 w-3.5 text-[#10B981] shrink-0 hidden sm:inline" />
        <span aria-hidden="true" className="text-sm leading-none">
          {languageOption.flag}
        </span>
        <span className="font-mono text-[11px] font-bold text-[#D1D5DB]">
          {languageOption.shortLabel}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-[#9CA3AF] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t.languageSwitcherLabel}
          className={`absolute top-full mt-2 z-50 w-52 rounded-xl border border-[#363B44] bg-[#262A30] shadow-2xl p-1.5 space-y-0.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {SUPPORTED_LANGUAGES.map((opt) => {
            const isSelected = opt.code === lang;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handlePick(opt.code)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#10B981]/20 text-emerald-300'
                    : 'text-[#D1D5DB] hover:bg-[#1C1F24] hover:text-[#F3F4F6]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span aria-hidden="true" className="text-base leading-none">
                    {opt.flag}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
