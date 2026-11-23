import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  PLAN_TRANSLATIONS,
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
  SupportedLanguageOption,
  TRANSLATIONS,
  TranslatedPlanInfo,
  TranslationDictionary,
  getDefaultLanguageForCountry,
  getLanguageOption,
  hasManualLanguageOverride,
  loadSavedLanguage,
  saveLanguagePreference,
} from '../data/i18n';
import { loadSelectedCountryCode } from '../data/countries';

interface LanguageContextValue {
  lang: SupportedLanguageCode;
  languageOption: SupportedLanguageOption;
  dir: 'ltr' | 'rtl';
  t: TranslationDictionary;
  hasManualOverride: boolean;
  setLang: (nextLang: SupportedLanguageCode, isManual?: boolean) => void;
  autoSuggestLangForCountry: (countryCode: string, force?: boolean) => void;
  getPlanText: (planId: string) => TranslatedPlanInfo;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguageCode>(() =>
    loadSavedLanguage(loadSelectedCountryCode())
  );
  const [manualOverride, setManualOverride] = useState<boolean>(() =>
    hasManualLanguageOverride()
  );

  const languageOption = useMemo(() => getLanguageOption(lang), [lang]);
  const dir: 'ltr' | 'rtl' = languageOption.rtl ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const setLang = useCallback((nextLang: SupportedLanguageCode, isManual = true) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === nextLang)) return;
    setLangState(nextLang);
    if (isManual) {
      setManualOverride(true);
    }
    saveLanguagePreference(nextLang, isManual);
  }, []);

  const autoSuggestLangForCountry = useCallback(
    (countryCode: string, force = false) => {
      if (!force && manualOverride) return;
      const suggested = getDefaultLanguageForCountry(countryCode);
      setLangState(suggested);
      saveLanguagePreference(suggested, false);
    },
    [manualOverride]
  );

  const getPlanText = useCallback(
    (planId: string): TranslatedPlanInfo => {
      const dict = PLAN_TRANSLATIONS[lang] ?? PLAN_TRANSLATIONS.ht;
      return (
        dict[planId] ??
        PLAN_TRANSLATIONS.ht[planId] ?? {
          shortLabel: planId,
          subtitle: '',
        }
      );
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      languageOption,
      dir,
      t: TRANSLATIONS[lang] ?? TRANSLATIONS.ht,
      hasManualOverride: manualOverride,
      setLang,
      autoSuggestLangForCountry,
      getPlanText,
    }),
    [lang, languageOption, dir, manualOverride, setLang, autoSuggestLangForCountry, getPlanText]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
