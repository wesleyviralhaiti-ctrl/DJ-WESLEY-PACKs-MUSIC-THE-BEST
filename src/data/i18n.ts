export type SupportedLanguageCode = 'ht' | 'en' | 'fr' | 'es' | 'pt' | 'ar';

export interface SupportedLanguageOption {
  code: SupportedLanguageCode;
  flag: string;
  label: string;
  shortLabel: string;
  speechLang: string;
  rtl?: boolean;
}

export const LANGUAGE_STORAGE_KEY = 'wesley_selected_language_v1';
export const LANGUAGE_MANUAL_OVERRIDE_KEY = 'wesley_language_manual_override_v1';

export const SUPPORTED_LANGUAGES: SupportedLanguageOption[] = [
  {
    code: 'ht',
    flag: '🇭🇹',
    label: 'Kreyòl Ayisyen',
    shortLabel: 'HT',
    speechLang: 'fr-FR',
  },
  {
    code: 'en',
    flag: '🇺🇸',
    label: 'English',
    shortLabel: 'EN',
    speechLang: 'en-US',
  },
  {
    code: 'fr',
    flag: '🇫🇷',
    label: 'Français',
    shortLabel: 'FR',
    speechLang: 'fr-FR',
  },
  {
    code: 'es',
    flag: '🇪🇸',
    label: 'Español',
    shortLabel: 'ES',
    speechLang: 'es-ES',
  },
  {
    code: 'pt',
    flag: '🇧🇷',
    label: 'Português',
    shortLabel: 'PT',
    speechLang: 'pt-BR',
  },
  {
    code: 'ar',
    flag: '🇸🇦',
    label: 'العربية',
    shortLabel: 'AR',
    speechLang: 'ar-SA',
    rtl: true,
  },
];

const FRENCH_COUNTRY_CODES = new Set([
  'FR', 'CI', 'SN', 'CM', 'CD', 'CG', 'GP', 'MQ', 'GF', 'RE', 'YT', 'BL', 'MF', 'PM',
  'BE', 'CH', 'LU', 'MC', 'BF', 'ML', 'NE', 'TG', 'BJ', 'GN', 'GA', 'TD', 'CF', 'BI',
  'RW', 'DJ', 'KM', 'MG', 'PF', 'NC', 'WF', 'MU',
]);

const SPANISH_COUNTRY_CODES = new Set([
  'DO', 'ES', 'MX', 'CO', 'CL', 'AR', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'HN', 'PY',
  'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ',
]);

const PORTUGUESE_COUNTRY_CODES = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL']);

const ARABIC_COUNTRY_CODES = new Set([
  'SA', 'AE', 'EG', 'MA', 'DZ', 'TN', 'LY', 'SD', 'IQ', 'SY', 'JO', 'LB', 'KW', 'QA',
  'BH', 'OM', 'YE', 'PS', 'MR', 'SO',
]);

export function getDefaultLanguageForCountry(countryCode: string): SupportedLanguageCode {
  const code = (countryCode || '').trim().toUpperCase();
  if (code === 'HT') return 'ht';
  if (FRENCH_COUNTRY_CODES.has(code)) return 'fr';
  if (SPANISH_COUNTRY_CODES.has(code)) return 'es';
  if (PORTUGUESE_COUNTRY_CODES.has(code)) return 'pt';
  if (ARABIC_COUNTRY_CODES.has(code)) return 'ar';
  return 'en';
}

export function getLanguageOption(code: SupportedLanguageCode): SupportedLanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}

export function loadSavedLanguage(fallbackCountryCode: string): SupportedLanguageCode {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved as SupportedLanguageCode;
    }
  } catch {
    // ignore storage errors
  }
  return getDefaultLanguageForCountry(fallbackCountryCode);
}

export function hasManualLanguageOverride(): boolean {
  try {
    return window.localStorage.getItem(LANGUAGE_MANUAL_OVERRIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveLanguagePreference(
  lang: SupportedLanguageCode,
  isManualOverride: boolean
): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    if (isManualOverride) {
      window.localStorage.setItem(LANGUAGE_MANUAL_OVERRIDE_KEY, 'true');
    }
  } catch {
    // ignore storage errors
  }
}

export interface TranslatedPlanInfo {
  shortLabel: string;
  badge?: string;
  subtitle: string;
}

export interface TranslationDictionary {
  // Header & Nav
  navFolders: string;
  navHowItWorks: string;
  navAdmin: string;
  vipUnlimitedShort: string;
  folderCreditsRemainingLabel: string;
  folderWord: string;
  enterVipKeyBtn: string;
  vipKeyShortBtn: string;
  changeVipKeyBtn: string;
  changeCodeShortBtn: string;
  vipUnlimitedActiveBanner: string;
  languageSwitcherLabel: string;

  // Admin Banner
  adminModeActive: string;
  adminVisitorPreview: string;
  openAdminPanel: string;
  logoutAdmin: string;

  // Referral Bonus Banner
  bonusCreditsBannerPrefix: string;
  bonusCreditsBannerSuffix: string;
  chooseYourFolderLink: string;

  // Hero
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitlePrefix: string;
  heroSubtitleSuffix: string;
  downloadZipsHeroBtn: string;
  unlockWithVipBtn: string;
  buyVipKeyBtn: string;

  // Catalog & Voice Search
  catalogTitle: (activeCount: number, comingCount: number) => string;
  catalogSubtitlePrefix: string;
  catalogSubtitleSuffix: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  clearSearchAria: string;
  micStartAria: string;
  micStopAria: string;
  micStopLabel: string;
  micVoiceLabel: string;
  micListeningText: string;
  micUnsupportedText: string;
  micPermissionDeniedText: string;
  micNoSpeechText: string;
  micUnavailableText: string;
  searchResultsPrefix: string;
  foldersFoundWord: string;
  andWord: string;
  tracksMatchWord: string;
  availableNowBadge: (label: string) => string;
  emptyCatalogText: string;
  emptySearchText: (q: string) => string;
  resetSearchBtn: string;
  tracksWord: string;
  tracksFoundBadge: (count: number) => string;
  moreTracksWord: (count: number) => string;
  preparingZipBtn: string;
  downloadZipBtn: string;
  enterVipToDownloadBtn: string;
  trendingBadgePrefix: string;
  trendingTitle: (label: string) => string;
  trendingSubtitlePrefix: string;
  trendingSubtitleSuffix: string;
  emptyTrendingSearch: (q: string) => string;
  comingSoonPill: string;
  requestSentBtn: string;
  sendingRequestBtn: string;
  requestPackBtn: string;
  requestSentToast: string;

  // How It Works
  howTitle: string;
  step1Tag: string;
  step1Title: string;
  step1Desc: string;
  step2Tag: string;
  step2Title: string;
  step2Desc: string;
  step3Tag: string;
  step3Title: string;
  step3Desc: string;

  // Footer
  footerRights: (year: number) => string;

  // Visitor Entry Gate
  gateEyebrow: string;
  gateTitle: string;
  gateSubtitle: string;
  gateLanguageLabel: string;
  gateFullNameLabel: string;
  gateFullNamePlaceholder: string;
  gateCountryLabel: string;
  gateCodeWord: string;
  gatePhoneLabel: string;
  gatePhoneValidPrefix: string;
  gatePhoneExamplePrefix: string;
  gatePhoneExampleWord: string;
  gateSubmittingBtn: string;
  gateSubmitBtn: string;
  gatePrivacyNote: string;
  gateInvalidPhoneFallback: (countryName: string, dialCode: string) => string;

  // Welcome VIP Modal
  modalCloseAria: string;
  chooseZipModalTitle: string;
  activeCodeModalDesc: (code: string) => string;
  comingSoonOrderLabel: string;
  orderedTracksLabel: (count: number) => string;
  notAvailableYetBadge: string;
  viewAllFoldersOnSite: string;
  haveVipKeyHeading: string;
  enterCodeForFolderDesc: (filename: string) => string;
  enterCodeGeneralDesc: string;
  vipKeyPlaceholder: string;
  verifyingVipBtn: string;
  unlockVipAccessBtn: string;
  orDivider: string;
  buyVipOnlineHeading: string;
  pricesForLabel: string;
  popularBadge: string;
  payNatcashBtn: (label: string, price: string) => string;
  payCardBtn: (label: string, usdt: number) => string;
  haitiCheckoutFootnote: string;
  intlCheckoutFootnote: (flag: string) => string;
  browseFoldersFirstBtn: string;
  expiredKeyError: string;

  // Quota Exhausted Modal
  planFinishedHeading: string;
  exhaustedKeyInfo: (code: string) => string;
  planFinishedDesc: string;
  enterNewVipKeyBtn: string;
  intlUsdtFootnote: (flag: string) => string;

  // Direct Checkout Modal
  natcashDirectTag: string;
  cardIntlTag: string;
  usdtDirectTag: string;
  amountToPayLabel: string;
  sendNatcashInstruction: string;
  numberCopiedBtn: string;
  copyNatcashBtn: string;
  pasteNatcashSmsLabel: string;
  pasteBtn: string;
  pastedFeedback: string;
  natcashSmsPlaceholder: string;
  optionalPhoneLabel: string;
  verifyingNatcashBtn: string;
  verifyNatcashBtn: string;
  chooseAnotherPlanLink: string;
  vipAppearsOnScreenNote: string;
  cardTabBtn: string;
  usdtTabBtn: string;
  cardAmountLabel: string;
  payWithCardNowBtn: string;
  otherCardGatewayBtn: string;
  cardStep1: string;
  cardStep2: string;
  exactAmountUsdtLabel: string;
  usdtAddressLabel: string;
  usdtAddressCopiedBtn: string;
  copyUsdtAddressBtn: string;
  txIdPlaceholder: string;
  verifyingTronBtn: string;
  savingTxBtn: string;
  verifyPayUnlockBtn: string;
  tronVerificationNote: string;
  orderRegisteredTag: (id: string) => string;
  verifyingWaitHeading: string;
  verifyingWaitDesc: string;
  planLabel: string;
  amountLabel: string;
  methodLabel: string;
  phoneLabel: string;
  recheckingNatcashBtn: string;
  recheckNatcashBtn: string;
  modifyOrRetryPaymentLink: string;
  paymentRejectedHeading: (txId: string) => string;
  paymentRejectedDesc: string;
  tryAgainBtn: string;
  verifiedTronTag: string;
  verifiedVipTag: string;
  hereIsYourVipKeyHeading: string;
  unlimitedInfinityLabel: string;
  foldersZipCountLabel: (count: number) => string;
  oneTimeSecretKeyLabel: string;
  copiedShortBtn: string;
  copyKeyBtn: string;
  unlockingBtn: string;
  unlockAllFoldersNowBtn: string;
  pasteEmptyError: string;
  pasteBlockedError: string;
  recheckPendingFallback: string;
  invalidOrUsedKeyError: string;

  // Referral Program Card
  referralPersonalCodeLabel: string;
  referralHeading: string;
  referralDesc: (regGoal: number, purGoal: number) => string;
  referralFreeCreditsReady: (count: number) => string;
  referralRefreshBtn: string;
  referralPersonalLinkLabel: string;
  referralCopyLinkBtn: string;
  referralLinkCopiedBtn: string;
  referralLinkCopiedToast: string;
  referralShareWhatsAppBtn: string;
  referralShareTikTokBtn: string;
  referralCopiedTikTokBtn: string;
  referralCopiedTikTokToast: string;
  referralRegisteredTitle: string;
  referralRegisteredDone: (goal: number) => string;
  referralRegisteredLeft: (left: number) => string;
  referralBuyersTitle: string;
  referralBuyersDone: (goal: number) => string;
  referralBuyersLeft: (left: number) => string;
  referralUnlockNote: (regGoal: number, purGoal: number) => string;
  referralClaimingBtn: string;
  referralClaimBtn: string;
  referralClaimedActive: (count: number) => string;
  referralClaimedUsed: string;
  referralDownloadFreeBtn: string;
  referralClaimSuccessToast: string;
  referralClaimErrorFallback: string;
  referralShareText: (url: string) => string;

  // Download Overlay & Toasts
  downloadLaunchedToast: string;
  preparingZipOverlay: (current: number, total: number, percent: number) => string;
  savedToDownloadsNote: string;
  clickIfNotStartedBtn: string;
  vipUnlockedUnlimitedToast: string;
  vipUnlockedCreditsToast: (remaining: number, total: number) => string;

  // PWA Install Button
  installOnPhoneBtn: string;
  addToIphoneBtn: string;
  iosGuideTitle: string;
  iosGuideSubtitle: string;
  iosGuideStep1: string;
  iosGuideStep2: string;
  iosGuideConfirmBtn: string;

  // VirtualDJ Gratis Bonus
  virtualDjCardBadge: string;
  virtualDjDefaultTitle: string;
  virtualDjLockedMsg: string;
  virtualDjLockedCtaBtn: string;
  virtualDjUnlockedBadge: string;
  virtualDjDownloadBtn: string;
  virtualDjPendingLinkBtn: string;
  virtualDjDownloadStartedToast: string;
  virtualDjIncludedCheckoutNote: string;
}

export const PLAN_TRANSLATIONS: Record<
  SupportedLanguageCode,
  Record<string, TranslatedPlanInfo>
> = {
  ht: {
    '10-folder': {
      shortLabel: '9 + 1 Folder GRATIS',
      badge: '10 Folder Total',
      subtitle: '1,000 Mizik .ZIP an Lòd',
    },
    '21-folder': {
      shortLabel: '20 + 1 Folder GRATIS',
      badge: '21 Folder Total',
      subtitle: '2,100 Mizik .ZIP an Lòd',
    },
    '36-folder': {
      shortLabel: '35 + 1 Folder GRATIS',
      badge: '36 Folder Total',
      subtitle: '3,600 Mizik .ZIP an Lòd',
    },
    '55-folder': {
      shortLabel: '55 Folder',
      subtitle: '5,500 Mizik .ZIP an Lòd',
    },
    'unlimited-vip': {
      shortLabel: '👑 KLE VIP ILIMITE',
      subtitle: "♾️ Telechajman a L'Infini ak tout folder .ZIP yo",
    },
  },
  en: {
    '10-folder': {
      shortLabel: '9 + 1 FREE Folder',
      badge: '10 Folders Total',
      subtitle: '1,000 Ordered .ZIP Tracks',
    },
    '21-folder': {
      shortLabel: '20 + 1 FREE Folder',
      badge: '21 Folders Total',
      subtitle: '2,100 Ordered .ZIP Tracks',
    },
    '36-folder': {
      shortLabel: '35 + 1 FREE Folder',
      badge: '36 Folders Total',
      subtitle: '3,600 Ordered .ZIP Tracks',
    },
    '55-folder': {
      shortLabel: '55 Folders',
      subtitle: '5,500 Ordered .ZIP Tracks',
    },
    'unlimited-vip': {
      shortLabel: '👑 UNLIMITED VIP KEY',
      subtitle: '♾️ Unlimited Downloads across all .ZIP folders',
    },
  },
  fr: {
    '10-folder': {
      shortLabel: '9 + 1 Dossier GRATUIT',
      badge: '10 Dossiers Total',
      subtitle: '1 000 Sons .ZIP Classés',
    },
    '21-folder': {
      shortLabel: '20 + 1 Dossier GRATUIT',
      badge: '21 Dossiers Total',
      subtitle: '2 100 Sons .ZIP Classés',
    },
    '36-folder': {
      shortLabel: '35 + 1 Dossier GRATUIT',
      badge: '36 Dossiers Total',
      subtitle: '3 600 Sons .ZIP Classés',
    },
    '55-folder': {
      shortLabel: '55 Dossiers',
      subtitle: '5 500 Sons .ZIP Classés',
    },
    'unlimited-vip': {
      shortLabel: '👑 CLÉ VIP ILLIMITÉE',
      subtitle: "♾️ Téléchargements à l'infini sur tous les dossiers .ZIP",
    },
  },
  es: {
    '10-folder': {
      shortLabel: '9 + 1 Carpeta GRATIS',
      badge: '10 Carpetas Total',
      subtitle: '1,000 Canciones .ZIP Ordenadas',
    },
    '21-folder': {
      shortLabel: '20 + 1 Carpeta GRATIS',
      badge: '21 Carpetas Total',
      subtitle: '2,100 Canciones .ZIP Ordenadas',
    },
    '36-folder': {
      shortLabel: '35 + 1 Carpeta GRATIS',
      badge: '36 Carpetas Total',
      subtitle: '3,600 Canciones .ZIP Ordenadas',
    },
    '55-folder': {
      shortLabel: '55 Carpetas',
      subtitle: '5,500 Canciones .ZIP Ordenadas',
    },
    'unlimited-vip': {
      shortLabel: '👑 LLAVE VIP ILIMITADA',
      subtitle: '♾️ Descargas ilimitadas en todas las carpetas .ZIP',
    },
  },
  pt: {
    '10-folder': {
      shortLabel: '9 + 1 Pasta GRÁTIS',
      badge: '10 Pastas Total',
      subtitle: '1.000 Músicas .ZIP Organizadas',
    },
    '21-folder': {
      shortLabel: '20 + 1 Pasta GRÁTIS',
      badge: '21 Pastas Total',
      subtitle: '2.100 Músicas .ZIP Organizadas',
    },
    '36-folder': {
      shortLabel: '35 + 1 Pasta GRÁTIS',
      badge: '36 Pastas Total',
      subtitle: '3.600 Músicas .ZIP Organizadas',
    },
    '55-folder': {
      shortLabel: '55 Pastas',
      subtitle: '5.500 Músicas .ZIP Organizadas',
    },
    'unlimited-vip': {
      shortLabel: '👑 CHAVE VIP ILIMITADA',
      subtitle: '♾️ Downloads ilimitados em todas as pastas .ZIP',
    },
  },
  ar: {
    '10-folder': {
      shortLabel: '9 + 1 مجلد مجاني',
      badge: '10 مجلدات إجمالاً',
      subtitle: '1,000 أغنية .ZIP مرتبة',
    },
    '21-folder': {
      shortLabel: '20 + 1 مجلد مجاني',
      badge: '21 مجلد إجمالاً',
      subtitle: '2,100 أغنية .ZIP مرتبة',
    },
    '36-folder': {
      shortLabel: '35 + 1 مجلد مجاني',
      badge: '36 مجلد إجمالاً',
      subtitle: '3,600 أغنية .ZIP مرتبة',
    },
    '55-folder': {
      shortLabel: '55 مجلداً',
      subtitle: '5,500 أغنية .ZIP مرتبة',
    },
    'unlimited-vip': {
      shortLabel: '👑 مفتاح VIP غير محدود',
      subtitle: '♾️ تحميل غير محدود لجميع مجلدات .ZIP',
    },
  },
};

export const TRANSLATIONS: Record<SupportedLanguageCode, TranslationDictionary> = {
  ht: {
    navFolders: 'Folder .ZIP yo',
    navHowItWorks: 'Kòman sa Mache',
    navAdmin: 'Admin VIP',
    vipUnlimitedShort: '👑 VIP Ilimite',
    folderCreditsRemainingLabel: '📁 Kredi Folder ki rete:',
    folderWord: 'Folder',
    enterVipKeyBtn: 'Antre Kle VIP',
    vipKeyShortBtn: 'Kle VIP',
    changeVipKeyBtn: 'Chanje Kle VIP',
    changeCodeShortBtn: 'Chanje Kòd',
    vipUnlimitedActiveBanner: '👑 Aksè VIP Ilimite Aktif (Tout Katalòg la)',
    languageSwitcherLabel: 'Lang',

    adminModeActive: '👑 MÒD ADMIN AKTIF (TELECHAJMAN GRATIS ILIMITE)',
    adminVisitorPreview: '🔒 WÈ SIT LA TANKOU VIZITÈ (Klike pou Aktive Mòd Admin Gratis)',
    openAdminPanel: 'Ouvri Admin Panel',
    logoutAdmin: 'Dekonekte',

    bonusCreditsBannerPrefix: '🎁 Ou gen',
    bonusCreditsBannerSuffix: 'Kredi Folder Gratis (Rekonpans Pataj) — Klike "⬇️ TELECHAJE .ZIP" sou nenpòt folder!',
    chooseYourFolderLink: 'Chwazi Folder Ou',

    heroEyebrow: 'Koleksyon DJ & Fanatik 2026 · Pake .ZIP VirtualDJ Ready',
    heroTitle: 'Folder Mizik VIP .ZIP pou DJ ak Amatè Bon Mizik',
    heroSubtitlePrefix: 'Chak folder',
    heroSubtitleSuffix: 'genyen mizik an lòd pare pou telechaje. Antre Kle VIP ou a pou w jwenn tout folder ou yo.',
    downloadZipsHeroBtn: 'Telechaje .ZIP yo',
    unlockWithVipBtn: 'Debloke ak Kle VIP',
    buyVipKeyBtn: 'Achte Kle VIP',

    catalogTitle: (activeCount, comingCount) =>
      `Tout Folder Mizik .ZIP yo (${activeCount} Disponib · ${comingCount} An Preparasyon)`,
    catalogSubtitlePrefix: 'Chak pake se yon folder',
    catalogSubtitleSuffix: 'konplè ki gen tout mizik yo nimewote an lòd pare pou telechaje.',
    searchPlaceholder: 'Chèche folder, atis, oswa tit mizik (egzanp: Rabòday, Drill, Klass)...',
    searchAriaLabel: 'Chèche folder oswa mizik',
    clearSearchAria: 'Efase rechèch la',
    micStartAria: 'Chèche ak vwa (🎙️)',
    micStopAria: 'Kanpe mikwo',
    micStopLabel: 'Kanpe',
    micVoiceLabel: 'Vwa',
    micListeningText: '🎙️ Pale kounye a...',
    micUnsupportedText: 'Mikwo pa sipòte sou navigatè sa a — tape rechèch ou a',
    micPermissionDeniedText: 'Otorizasyon mikwo refize — aktive mikwo nan navigatè w oswa tape rechèch ou a',
    micNoSpeechText: 'Nou pa tande anyen — klike sou 🎙️ ankò oswa tape rechèch ou a',
    micUnavailableText: 'Mikwo pa disponib kounye a — tape rechèch ou a',
    searchResultsPrefix: 'Rezilta pou',
    foldersFoundWord: 'folder',
    andWord: 'ak',
    tracksMatchWord: 'mizik koresponn',
    availableNowBadge: (label) => `✅ DISPONIB KOUNYE A (${label} Folder .ZIP Pare)`,
    emptyCatalogText: 'Pa gen okenn folder .ZIP pare pou telechaje pou moman an.',
    emptySearchText: (q) => `Pa gen okenn folder oswa mizik ki koresponn ak « ${q} ».`,
    resetSearchBtn: 'Efase Rechèch la',
    tracksWord: 'Mizik',
    tracksFoundBadge: (count) => `🎵 ${count} mizik jwenn`,
    moreTracksWord: (count) => `(+${count} lòt)`,
    preparingZipBtn: 'Ap prepare .ZIP...',
    downloadZipBtn: '⬇️ TELECHAJE .ZIP',
    enterVipToDownloadBtn: '🔒 Mete Kle VIP pou Telechaje',
    trendingBadgePrefix: '🔥 TANDANS NAN PEYI W ·',
    trendingTitle: (label) => `🔥 TANDANS NAN PEYI W (${label} Pake .ZIP An Preparasyon)`,
    trendingSubtitlePrefix: 'Pake ki pi cho yo pou',
    trendingSubtitleSuffix: 'Klike sou « 🔔 Mande Pake Sa a » pou w di DJ Wesley kilès pou l lage pi vit (pa depanse okenn kredi VIP!).',
    emptyTrendingSearch: (q) => `Pa gen okenn pake an preparasyon ki koresponn ak « ${q} ».`,
    comingSoonPill: 'AN ATANT / BYENTO',
    requestSentBtn: '✅ Demann Voye (Mande Ankò)',
    sendingRequestBtn: 'Ap voye demann...',
    requestPackBtn: '🔔 Mande Pake Sa a',
    requestSentToast: '✅ Demann ou an voye bay DJ Wesley! N ap lage pake sa a byento.',

    howTitle: 'Kòman sa Mache nan 3 Etap',
    step1Tag: '01. Achte Otomatik',
    step1Title: 'Peye An Liy oswa Sèvi ak Kat Prepeye',
    step1Desc: 'Chwazi plan ou bezwen an (10, 21, 36, 55 Folder oswa VIP Ilimite) epi peye ak Kat Vityèl, Kat Bankè oswa Crypto USDT pou w resevwa Kle VIP ou a otomatikman.',
    step2Tag: '02. Debloke',
    step2Title: 'Antre Kle VIP ou a',
    step2Desc: 'Antre kòd kout ou a (egzanp W#84K2) pou w debloke bouton vèt « ⬇️ TELECHAJE .ZIP » yo sou tout folder yo.',
    step3Tag: '03. Telechaje .ZIP',
    step3Title: 'Pare pou VirtualDJ 8 / 2024+',
    step3Desc: 'Chak folder .ZIP vini ak MP3 nimewote an lòd, 000 - PLAYLIST_VIRTUALDJ.m3u, ak VIRTUALDJ_IMPORT_DATABASE.xml.',

    footerRights: (year) => `© ${year} WESLEY MUSIC PACKS (by DJ WESLEY). Tout dwa rezève.`,

    gateEyebrow: 'WESLEY MUSIC PACKS · AKSÈ VIZITÈ',
    gateTitle: '🎧 Byenvini! Antre Enfòmasyon Ou',
    gateSubtitle: 'Ranpli non konplè ou, chwazi peyi w ak lang ou, epi mete yon vrè nimewo telefòn ki mache ak peyi ou chwazi a pou w antre nan katalòg la.',
    gateLanguageLabel: '🌐 Chwazi Lang Ou / Select Language',
    gateFullNameLabel: '👤 Non Konplè Ou',
    gateFullNamePlaceholder: 'Ex: Jean-Baptiste Wesley',
    gateCountryLabel: '🌍 Peyi Ou',
    gateCodeWord: 'Kòd',
    gatePhoneLabel: '📱 Nimewo Telefòn Ou / Phone Number',
    gatePhoneValidPrefix: 'Nimewo valid pou',
    gatePhoneExamplePrefix: 'Antre nimewo ki kòrèk pou',
    gatePhoneExampleWord: 'egzanp',
    gateSubmittingBtn: 'Ap verifye nimewo ou a...',
    gateSubmitBtn: '🚀 ANTRE NAN SIT LA KOUNYE A',
    gatePrivacyNote: '🔒 Enfòmasyon ou yo pwoteje pou verifikasyon kliyan sèlman.',
    gateInvalidPhoneFallback: (countryName, dialCode) =>
      `⚠️ Nimewo telefòn sa a pa konpatib ak peyi ${countryName} (+${dialCode})! Tanpri antre yon vrè nimewo telefòn ki valid pou peyi sa a.`,

    modalCloseAria: 'Fèmen fenèt la',
    chooseZipModalTitle: 'Chwazi Folder .ZIP pou w Telechaje',
    activeCodeModalDesc: (code) =>
      `Kòd ${code} aktif. Klike sou nenpòt folder pou w telechaje .ZIP la (1 Kredi Folder).`,
    comingSoonOrderLabel: '⏳ AN PREPARASYON',
    orderedTracksLabel: (count) => `${count} Mizik an Lòd`,
    notAvailableYetBadge: '⏳ Poko Disponib',
    viewAllFoldersOnSite: 'Wè tout folder .ZIP yo sou sit la',
    haveVipKeyHeading: '🔑 OU GEN YON KLE VIP / KAT PREPEYE?',
    enterCodeForFolderDesc: (filename) => `Antre kòd ou a pou w telechaje ${filename}.`,
    enterCodeGeneralDesc: 'Antre Kle VIP oswa Kòd Kat Prepeye ou a anba a pou w debloke tout folder .ZIP yo touswit.',
    vipKeyPlaceholder: 'Antre Kle VIP ou isit la... ex: W#84K2',
    verifyingVipBtn: '⏳ Ap verifye Kle VIP la...',
    unlockVipAccessBtn: '🔓 DEBLOKE AKSÈ VIP KOUNYE A',
    orDivider: '— OUBYEN —',
    buyVipOnlineHeading: '🛒 ACHTE KLE VIP OTOMATIK AN LIY',
    pricesForLabel: 'Pri pou',
    popularBadge: 'POPILÈ',
    payNatcashBtn: (label, price) => `⚡ PEYE AK NATCASH (${label} · ${price})`,
    payCardBtn: (label, usdt) => `💳 Peye ak Kat Visa / Mastercard / Apple Pay (${label} · ${usdt} USDT)`,
    haitiCheckoutFootnote: '🇭🇹 Ayiti: Peye dirèkteman ak Natcash (+509 56568810) epi resevwa Kle VIP ou touswit sou ekran an!',
    intlCheckoutFootnote: (flag) =>
      `🌐 Entènasyonal (${flag}): Peye ak Kat Visa / Mastercard / Apple Pay oswa voye USDT (TRC20) pou w resevwa Kle VIP ou touswit!`,
    browseFoldersFirstBtn: '👀 Gade Folder .ZIP yo Anvan',
    expiredKeyError: '🚫 KÒD SA A DEJA SÈVI / EKSPIRE',

    planFinishedHeading: '⏰ PLAN OU FINI!',
    exhaustedKeyInfo: (code) => `Kle: ${code} · 0 Folder .ZIP ki rete`,
    planFinishedDesc: 'Ou fin telechaje tout folder .ZIP ki te nan plan ou a. Chwazi yon nouvo plan anba a pou w resevwa yon lòt Kle VIP otomatikman oswa antre yon Kòd Prepeye!',
    enterNewVipKeyBtn: '🔑 Antre yon Nouvo Kle VIP / Kat Prepeye',
    intlUsdtFootnote: (flag) =>
      `🌐 Entènasyonal (${flag}): Peye an liy ak USDT (TRC20) pou w resevwa Kle VIP ou touswit sou ekran an!`,

    natcashDirectTag: 'NATCASH DIRÈK',
    cardIntlTag: 'KAT VISA / APPLE PAY / USDT',
    usdtDirectTag: 'USDT (TRC20) INSTANT',
    amountToPayLabel: 'Montan pou Peye:',
    sendNatcashInstruction: 'Voye peman Natcash la sou nimewo sa a:',
    numberCopiedBtn: '✔ Nimewo Kopye!',
    copyNatcashBtn: '📋 Kopye Nimewo Natcash',
    pasteNatcashSmsLabel: '📋 Kole Tout Mesaj Konfimasyon Natcash Ou Resevwa a Isit La Nèt',
    pasteBtn: '📋 Kole Mesaj la (Paste)',
    pastedFeedback: '✔ Mesaj la kole!',
    natcashSmsPlaceholder: 'Kole tout mesaj konfimasyon Natcash ou resevwa a isit la (ki gen montan HTG, +509 56568810, ak Transcode la)...',
    optionalPhoneLabel: 'Nimewo Telefòn Ou (Opsyonèl)',
    verifyingNatcashBtn: 'Ap verifye mesaj Natcash la...',
    verifyNatcashBtn: '⚡ VERIFYE MESAJ NATCASH & RESEVWA KLE VIP',
    chooseAnotherPlanLink: 'Chwazi yon lòt plan',
    vipAppearsOnScreenNote: 'Kle VIP parèt sou ekran an',
    cardTabBtn: '💳 KAT VISA / MASTERCARD / APPLE PAY',
    usdtTabBtn: '⚡ VOYE USDT DIRÈK (TRC20)',
    cardAmountLabel: 'Montan pou Peye ak Kat',
    payWithCardNowBtn: '💳 PEYE AK KAT VISA / APPLE PAY KOUNYE A',
    otherCardGatewayBtn: '🌐 Lòt Pòtay Kat Visa / Mastercard (Paybis)',
    cardStep1: 'Peye montan an ak Kat Visa/Mastercard ou oswa Apple Pay nan fenèt ki ouvri a.',
    cardStep2: 'Kole kòd konfimasyon / TxID tranzaksyon an anba a pou w debloke Kle VIP ou touswit!',
    exactAmountUsdtLabel: 'Montan Egzak pou Voye',
    usdtAddressLabel: 'Adrès USDT (TRC20) Trust Wallet:',
    usdtAddressCopiedBtn: '✔ Adrès USDT Kopye!',
    copyUsdtAddressBtn: '📋 Kopye Adrès USDT (TRC20)',
    txIdPlaceholder: 'Kole 64-karaktè TxID / Hash TRON lan isit la...',
    verifyingTronBtn: 'Ap verifye sou TRON (TRC20)...',
    savingTxBtn: 'Ap anrejistre TxID la...',
    verifyPayUnlockBtn: '⚡ VERIFYE PEMAN & DEBLOKE KLE VIP',
    tronVerificationNote: 'Verifikasyon TronGrid + VIP',
    orderRegisteredTag: (id) => `⏳ KÒMAND #${id} ANREJISTRE`,
    verifyingWaitHeading: '⏳ N ap verifye peman ou a... Kle VIP ou ap parèt isit la otomatikman!',
    verifyingWaitDesc: 'Kite fenèt sa a ouvè sou telefòn ou — kou Admin VIP la valide peman an, Kle VIP ou a ap parèt touswit an tan reyèl!',
    planLabel: 'Plan:',
    amountLabel: 'Montan:',
    methodLabel: 'Metòd:',
    phoneLabel: 'Telefòn:',
    recheckingNatcashBtn: 'Ap re-verifye tranzaksyon an...',
    recheckNatcashBtn: '🔄 Re-verifye Tranzaksyon Mwen',
    modifyOrRetryPaymentLink: 'Modifye Kòd Tranzaksyon oswa Voye yon Lòt Peman',
    paymentRejectedHeading: (txId) => `Peman #${txId} sa a pa t ka valide.`,
    paymentRejectedDesc: 'Verifye kòd tranzaksyon an oswa montan an epi eseye soumèt ankò.',
    tryAgainBtn: 'Eseye Ankò',
    verifiedTronTag: '⚡ Konfime Otomatikman sou TRON (TRC20)',
    verifiedVipTag: '✔ Valide pa Sistèm VIP Wesley Music',
    hereIsYourVipKeyHeading: '🎉 MEN KLE VIP OU A!',
    unlimitedInfinityLabel: "♾️ Aksè Ilimite a L'Infini",
    foldersZipCountLabel: (count) => `${count} Folder .ZIP`,
    oneTimeSecretKeyLabel: 'Kòd Sekrè VIP Ou (Yon Sèl Fwa)',
    copiedShortBtn: 'Kopye!',
    copyKeyBtn: '📋 Kopye Kle a',
    unlockingBtn: 'Ap debloke aksè VIP la...',
    unlockAllFoldersNowBtn: '🔓 DEBLOKE TOUT FOLDER .ZIP YO KOUNYE A',
    pasteEmptyError: 'Pa gen okenn mesaj kopye nan prespapye w la — kopye SMS Natcash la anvan oswa peze lontan anndan bwat la pou w kole l.',
    pasteBlockedError: 'Navigatè a pa bay aksè otomatik pou kole — peze lontan anndan bwat tèks la epi chwazi Paste / Kole.',
    recheckPendingFallback: 'Resi SMS Natcash la poko valide — verifye kòd la oswa re-eseye nan kèk segonn.',
    invalidOrUsedKeyError: 'Kòd la pa valid oswa li deja itilize.',

    referralPersonalCodeLabel: 'Kòd Pataj Pèsonèl Ou:',
    referralHeading: '🎁 PATAJE & GANYEN 1 FOLDER GRATIS',
    referralDesc: (regGoal, purGoal) =>
      `Envite ${regGoal} moun enskri ak nimewo telefòn yo sou lyen ou a epi fòk omwen ${purGoal} ladan yo pran yon plan VIP pou w debloke 1 Folder .ZIP GRATIS touswit!`,
    referralFreeCreditsReady: (count) => `🎁 ${count} Kredi Gratis Pare!`,
    referralRefreshBtn: 'Rafrechi',
    referralPersonalLinkLabel: 'Lyen Pataj Pèsonèl Ou',
    referralCopyLinkBtn: '📋 Kopye Lyen Pataj Mwen',
    referralLinkCopiedBtn: '✔ Lyen Kopye!',
    referralLinkCopiedToast: '📋 Lyen pataj ou a kopye! Pataje l ak zanmi w yo.',
    referralShareWhatsAppBtn: '📲 Pataje sou WhatsApp',
    referralShareTikTokBtn: '📲 Pataje sou WhatsApp / TikTok',
    referralCopiedTikTokBtn: '✔ Kopye pou TikTok!',
    referralCopiedTikTokToast: '📲 Mesaj pataj + lyen ou a kopye pou WhatsApp / TikTok!',
    referralRegisteredTitle: 'Moun ki Enskri Sou Lyen Ou',
    referralRegisteredDone: (goal) => `✅ Objektif ${goal} moun enskri a konplè!`,
    referralRegisteredLeft: (left) => `Rete ${left} moun inik pou enskri ak nimewo telefòn yo.`,
    referralBuyersTitle: 'Kliyan ki Pran yon Plan VIP',
    referralBuyersDone: (goal) => `✅ Objektif ${goal} kliyan ki peye a konplè!`,
    referralBuyersLeft: (left) => `Rete ${left} kliyan pami moun ou envite yo ki pou achte yon plan VIP.`,
    referralUnlockNote: (regGoal, purGoal) =>
      `Bouton rekonpans lan ap debloke otomatikman kou toulède kontè yo konplè (${regGoal}/${regGoal} Enskri ak ${purGoal}/${purGoal} Achte).`,
    referralClaimingBtn: '⏳ Ap debloke 1 Folder Gratis...',
    referralClaimBtn: '🎁 Reklame 1 Kredi Folder Gratis',
    referralClaimedActive: (count) =>
      `🎉 Ou gen ${count} Kredi Folder Gratis aktif! Desann nan katalòg la epi klike "⬇️ TELECHAJE .ZIP" sou nenpòt pake.`,
    referralClaimedUsed: '✅ Rekonpans 1 Folder Gratis ou a deja reklame ak itilize. Mèsi dèske w pataje!',
    referralDownloadFreeBtn: 'Telechaje .ZIP Gratis',
    referralClaimSuccessToast: '🎁 Felisitasyon! Ou jwenn +1 Kredi Folder Gratis! Klike sou nenpòt pake pou w telechaje .ZIP ou a.',
    referralClaimErrorFallback: 'Pa kapab reklame kredi gratis la kounye a.',
    referralShareText: (url) =>
      `🎧 Vin telechaje meyè Folder Mizik .ZIP yo (Konpa, Rabòday, Afrobeats, Hip-Hop) sou WESLEY MUSIC PACKS! Enskri sou lyen pa m nan kounye a: ${url}`,

    downloadLaunchedToast: '✅ Telechajman Lanse! Gade nan dosye Downloads ou.',
    preparingZipOverlay: (current, total, percent) =>
      `📥 Ap prepare .ZIP la... ${current} / ${total} (${percent}%)`,
    savedToDownloadsNote: 'Fichye .ZIP la anrejistre nan dosye Downloads ou.',
    clickIfNotStartedBtn: '⬇️ Klike Isit Si L Pa Kòmanse',
    vipUnlockedUnlimitedToast: '👑 Aksè VIP Ilimite debloke pou tout katalòg la!',
    vipUnlockedCreditsToast: (remaining, total) =>
      `Aksè VIP debloke! Kredi Folder: ${remaining} / ${total} Folder`,

    installOnPhoneBtn: 'Enstale sou Telefòn',
    addToIphoneBtn: 'Mete sou Ekran iPhone',
    iosGuideTitle: 'Mete Wesley Music sou Ekran iPhone',
    iosGuideSubtitle: 'Ouvri san ba Safari (Full Screen)',
    iosGuideStep1: '1. Peze bouton Share anba nan mitan Safari a.',
    iosGuideStep2: '2. Desann epi peze Add to Home Screen (Ajoute sou ekran dakèy).',
    iosGuideConfirmBtn: 'Oke, Mwen Konprann',

    virtualDjCardBadge: '🎁 BONUS KADO: VirtualDJ Gratis ak Plan 1,000 HTG / 20 USD+',
    virtualDjDefaultTitle: 'VirtualDJ Pro PC/Mac — Bonus VIP',
    virtualDjLockedMsg: '🔒 Pran yon plan ≥ 1,000 HTG (oubyen ≥ 20 USD) pou w debloke VirtualDJ GRATIS!',
    virtualDjLockedCtaBtn: '🔓 Debloke ak Plan 1,000 HTG / 20 USD+',
    virtualDjUnlockedBadge: '✅ DEBLOKE AK PLAN VIP OU A',
    virtualDjDownloadBtn: '⬇️ TELECHAJE VIRTUALDJ GRATIS',
    virtualDjPendingLinkBtn: '⏳ Admin ap mete lyen VirtualDJ la...',
    virtualDjDownloadStartedToast: '⬇️ Telechajman VirtualDJ Gratis la lanse!',
    virtualDjIncludedCheckoutNote: '🎁 BONUS ENKLI: Plan sa a debloke VirtualDJ Gratis touswit!',
  },

  en: {
    navFolders: '.ZIP Folders',
    navHowItWorks: 'How It Works',
    navAdmin: 'Admin VIP',
    vipUnlimitedShort: '👑 Unlimited VIP',
    folderCreditsRemainingLabel: '📁 Folder Credits left:',
    folderWord: 'Folders',
    enterVipKeyBtn: 'Enter VIP Key',
    vipKeyShortBtn: 'VIP Key',
    changeVipKeyBtn: 'Switch VIP Key',
    changeCodeShortBtn: 'Switch Key',
    vipUnlimitedActiveBanner: '👑 Unlimited VIP Access Active (Full Catalog)',
    languageSwitcherLabel: 'Language',

    adminModeActive: '👑 ADMIN MODE ACTIVE (UNLIMITED FREE DOWNLOADS)',
    adminVisitorPreview: '🔒 VIEWING AS VISITOR (Click to Enable Admin Free Mode)',
    openAdminPanel: 'Open Admin Panel',
    logoutAdmin: 'Sign Out',

    bonusCreditsBannerPrefix: '🎁 You have',
    bonusCreditsBannerSuffix: 'Free Folder Credit(s) (Referral Reward) — Click "⬇️ DOWNLOAD .ZIP" on any folder!',
    chooseYourFolderLink: 'Choose Your Folder',

    heroEyebrow: 'DJ & Music Lovers Collection 2026 · VirtualDJ Ready .ZIP Packs',
    heroTitle: 'VIP .ZIP Music Folders for DJs & True Music Lovers',
    heroSubtitlePrefix: 'Every',
    heroSubtitleSuffix: 'folder contains cleanly numbered tracks ready to download. Enter your VIP Key to unlock all your packs.',
    downloadZipsHeroBtn: 'Download .ZIPs',
    unlockWithVipBtn: 'Unlock with VIP Key',
    buyVipKeyBtn: 'Buy VIP Key',

    catalogTitle: (activeCount, comingCount) =>
      `All .ZIP Music Folders (${activeCount} Available · ${comingCount} Coming Soon)`,
    catalogSubtitlePrefix: 'Each pack is a complete',
    catalogSubtitleSuffix: 'folder with all tracks numbered in order ready to download.',
    searchPlaceholder: 'Search folders, genres, artists, or track titles (e.g. Rabòday, Drill, Klass)...',
    searchAriaLabel: 'Search folders or tracks',
    clearSearchAria: 'Clear search',
    micStartAria: 'Voice search (🎙️)',
    micStopAria: 'Stop microphone',
    micStopLabel: 'Stop',
    micVoiceLabel: 'Voice',
    micListeningText: '🎙️ Speak now...',
    micUnsupportedText: 'Microphone is not supported on this browser — type your search',
    micPermissionDeniedText: 'Microphone permission denied — allow mic access or type your search',
    micNoSpeechText: 'No speech detected — tap 🎙️ to try again or type your search',
    micUnavailableText: 'Microphone unavailable right now — type your search',
    searchResultsPrefix: 'Results for',
    foldersFoundWord: 'folders',
    andWord: 'and',
    tracksMatchWord: 'matching tracks',
    availableNowBadge: (label) => `✅ AVAILABLE NOW (${label} .ZIP Folders Ready)`,
    emptyCatalogText: 'No .ZIP folders are ready for download at the moment.',
    emptySearchText: (q) => `No folders or tracks matched "${q}".`,
    resetSearchBtn: 'Clear Search',
    tracksWord: 'Tracks',
    tracksFoundBadge: (count) => `🎵 ${count} tracks found`,
    moreTracksWord: (count) => `(+${count} more)`,
    preparingZipBtn: 'Preparing .ZIP...',
    downloadZipBtn: '⬇️ DOWNLOAD .ZIP',
    enterVipToDownloadBtn: '🔒 Enter VIP Key to Download',
    trendingBadgePrefix: '🔥 TRENDING IN YOUR COUNTRY ·',
    trendingTitle: (label) => `🔥 TRENDING IN YOUR COUNTRY (${label} .ZIP Packs Coming Soon)`,
    trendingSubtitlePrefix: 'Hottest upcoming packs for',
    trendingSubtitleSuffix: 'Click "🔔 Request This Pack" to let DJ Wesley know which one to drop next (uses zero VIP credits!).',
    emptyTrendingSearch: (q) => `No upcoming packs matched "${q}".`,
    comingSoonPill: 'COMING SOON',
    requestSentBtn: '✅ Request Sent (Request Again)',
    sendingRequestBtn: 'Sending request...',
    requestPackBtn: '🔔 Request This Pack',
    requestSentToast: '✅ Your request was sent to DJ Wesley! We will drop this pack soon.',

    howTitle: 'How It Works in 3 Easy Steps',
    step1Tag: '01. Instant Purchase',
    step1Title: 'Pay Online or Use a Prepaid Code',
    step1Desc: 'Pick the plan you need (10, 21, 36, 55 Folders or Unlimited VIP) and pay with Card, Bank Card, or USDT Crypto to receive your VIP Key automatically.',
    step2Tag: '02. Unlock',
    step2Title: 'Enter Your VIP Key',
    step2Desc: 'Enter your short code (e.g. W#84K2) to unlock the green "⬇️ DOWNLOAD .ZIP" buttons across all folders.',
    step3Tag: '03. Download .ZIP',
    step3Title: 'Ready for VirtualDJ 8 / 2024+',
    step3Desc: 'Every .ZIP folder includes ordered MP3 tracks, 000 - PLAYLIST_VIRTUALDJ.m3u, and VIRTUALDJ_IMPORT_DATABASE.xml.',

    footerRights: (year) => `© ${year} WESLEY MUSIC PACKS (by DJ WESLEY). All rights reserved.`,

    gateEyebrow: 'WESLEY MUSIC PACKS · VISITOR ACCESS',
    gateTitle: '🎧 Welcome! Enter Your Details',
    gateSubtitle: 'Enter your full name, pick your country and language, and provide a valid phone number for your country to enter the catalog.',
    gateLanguageLabel: '🌐 Choose Your Language / Select Language',
    gateFullNameLabel: '👤 Full Name',
    gateFullNamePlaceholder: 'e.g. Marcus Johnson',
    gateCountryLabel: '🌍 Your Country',
    gateCodeWord: 'Code',
    gatePhoneLabel: '📱 Phone Number',
    gatePhoneValidPrefix: 'Valid number for',
    gatePhoneExamplePrefix: 'Enter a valid number for',
    gatePhoneExampleWord: 'example',
    gateSubmittingBtn: 'Verifying your number...',
    gateSubmitBtn: '🚀 ENTER THE SITE NOW',
    gatePrivacyNote: '🔒 Your details are protected for customer verification only.',
    gateInvalidPhoneFallback: (countryName, dialCode) =>
      `⚠️ This phone number is not valid for ${countryName} (+${dialCode}). Please enter a valid local phone number.`,

    modalCloseAria: 'Close modal',
    chooseZipModalTitle: 'Choose a .ZIP Folder to Download',
    activeCodeModalDesc: (code) =>
      `Key ${code} is active. Click any folder to download the .ZIP (1 Folder Credit).`,
    comingSoonOrderLabel: '⏳ COMING SOON',
    orderedTracksLabel: (count) => `${count} Ordered Tracks`,
    notAvailableYetBadge: '⏳ Not Yet Available',
    viewAllFoldersOnSite: 'View all .ZIP folders on the site',
    haveVipKeyHeading: '🔑 HAVE A VIP KEY / PREPAID CODE?',
    enterCodeForFolderDesc: (filename) => `Enter your code to download ${filename}.`,
    enterCodeGeneralDesc: 'Enter your VIP Key or Prepaid Code below to unlock all .ZIP folders immediately.',
    vipKeyPlaceholder: 'Enter your VIP Key here... e.g. W#84K2',
    verifyingVipBtn: '⏳ Verifying VIP Key...',
    unlockVipAccessBtn: '🔓 UNLOCK VIP ACCESS NOW',
    orDivider: '— OR —',
    buyVipOnlineHeading: '🛒 BUY VIP KEY ONLINE AUTOMATICALLY',
    pricesForLabel: 'Prices for',
    popularBadge: 'POPULAR',
    payNatcashBtn: (label, price) => `⚡ PAY WITH NATCASH (${label} · ${price})`,
    payCardBtn: (label, usdt) => `💳 Pay with Visa / Mastercard / Apple Pay (${label} · ${usdt} USDT)`,
    haitiCheckoutFootnote: '🇭🇹 Haiti: Pay directly with Natcash (+509 56568810) and receive your VIP Key instantly on screen!',
    intlCheckoutFootnote: (flag) =>
      `🌐 International (${flag}): Pay with Visa / Mastercard / Apple Pay or send USDT (TRC20) to get your VIP Key right away!`,
    browseFoldersFirstBtn: '👀 Browse .ZIP Folders First',
    expiredKeyError: '🚫 THIS CODE IS ALREADY USED / EXPIRED',

    planFinishedHeading: '⏰ YOUR PLAN IS FINISHED!',
    exhaustedKeyInfo: (code) => `Key: ${code} · 0 .ZIP Folders remaining`,
    planFinishedDesc: 'You have downloaded all .ZIP folders in your plan. Choose a new plan below to get another VIP Key automatically or enter a Prepaid Code!',
    enterNewVipKeyBtn: '🔑 Enter a New VIP Key / Prepaid Code',
    intlUsdtFootnote: (flag) =>
      `🌐 International (${flag}): Pay online with USDT (TRC20) to get your VIP Key instantly on screen!`,

    natcashDirectTag: 'NATCASH DIRECT',
    cardIntlTag: 'VISA / APPLE PAY / USDT',
    usdtDirectTag: 'USDT (TRC20) INSTANT',
    amountToPayLabel: 'Amount to Pay:',
    sendNatcashInstruction: 'Send your Natcash payment to this number:',
    numberCopiedBtn: '✔ Number Copied!',
    copyNatcashBtn: '📋 Copy Natcash Number',
    pasteNatcashSmsLabel: '📋 Paste the Full Natcash Confirmation SMS You Received Below',
    pasteBtn: '📋 Paste SMS',
    pastedFeedback: '✔ SMS Pasted!',
    natcashSmsPlaceholder: 'Paste the complete Natcash confirmation SMS you received here (including HTG amount, +509 56568810, and Transcode)...',
    optionalPhoneLabel: 'Your Phone Number (Optional)',
    verifyingNatcashBtn: 'Verifying Natcash SMS...',
    verifyNatcashBtn: '⚡ VERIFY NATCASH SMS & GET VIP KEY',
    chooseAnotherPlanLink: 'Choose another plan',
    vipAppearsOnScreenNote: 'VIP Key appears on screen',
    cardTabBtn: '💳 VISA / MASTERCARD / APPLE PAY',
    usdtTabBtn: '⚡ SEND DIRECT USDT (TRC20)',
    cardAmountLabel: 'Card Payment Amount',
    payWithCardNowBtn: '💳 PAY WITH VISA / APPLE PAY NOW',
    otherCardGatewayBtn: '🌐 Alternative Card Gateway (Paybis)',
    cardStep1: 'Complete the payment with your Visa/Mastercard or Apple Pay in the window that opens.',
    cardStep2: 'Paste your transaction confirmation ID / TxID below to unlock your VIP Key right away!',
    exactAmountUsdtLabel: 'Exact Amount to Send',
    usdtAddressLabel: 'Trust Wallet USDT (TRC20) Address:',
    usdtAddressCopiedBtn: '✔ USDT Address Copied!',
    copyUsdtAddressBtn: '📋 Copy USDT (TRC20) Address',
    txIdPlaceholder: 'Paste the 64-character TRON TxID / Hash here...',
    verifyingTronBtn: 'Verifying on TRON (TRC20)...',
    savingTxBtn: 'Saving TxID...',
    verifyPayUnlockBtn: '⚡ VERIFY PAYMENT & UNLOCK VIP KEY',
    tronVerificationNote: 'TronGrid + VIP Verification',
    orderRegisteredTag: (id) => `⏳ ORDER #${id} REGISTERED`,
    verifyingWaitHeading: '⏳ Verifying your payment... Your VIP Key will appear here automatically!',
    verifyingWaitDesc: 'Keep this window open on your device — as soon as the payment is confirmed, your VIP Key will appear live in real time!',
    planLabel: 'Plan:',
    amountLabel: 'Amount:',
    methodLabel: 'Method:',
    phoneLabel: 'Phone:',
    recheckingNatcashBtn: 'Re-checking transaction...',
    recheckNatcashBtn: '🔄 Re-check My Transaction',
    modifyOrRetryPaymentLink: 'Edit Transaction ID or Submit Another Payment',
    paymentRejectedHeading: (txId) => `Payment #${txId} could not be verified.`,
    paymentRejectedDesc: 'Please check the transaction ID or amount and submit again.',
    tryAgainBtn: 'Try Again',
    verifiedTronTag: '⚡ Auto-Confirmed on TRON (TRC20)',
    verifiedVipTag: '✔ Verified by Wesley Music VIP System',
    hereIsYourVipKeyHeading: '🎉 HERE IS YOUR VIP KEY!',
    unlimitedInfinityLabel: '♾️ Unlimited Infinity Access',
    foldersZipCountLabel: (count) => `${count} .ZIP Folders`,
    oneTimeSecretKeyLabel: 'Your One-Time Secret VIP Key',
    copiedShortBtn: 'Copied!',
    copyKeyBtn: '📋 Copy Key',
    unlockingBtn: 'Unlocking VIP access...',
    unlockAllFoldersNowBtn: '🔓 UNLOCK ALL .ZIP FOLDERS NOW',
    pasteEmptyError: 'Your clipboard is empty — copy your Natcash SMS first or long-press inside the box to paste.',
    pasteBlockedError: 'Browser blocked automatic paste — long-press inside the text box and tap Paste.',
    recheckPendingFallback: 'Natcash SMS receipt is not confirmed yet — check the code or try again in a few seconds.',
    invalidOrUsedKeyError: 'This key is invalid or has already been used.',

    referralPersonalCodeLabel: 'Your Personal Referral Code:',
    referralHeading: '🎁 SHARE & EARN 1 FREE FOLDER',
    referralDesc: (regGoal, purGoal) =>
      `Invite ${regGoal} friends to register with their phone number via your link and have at least ${purGoal} of them purchase a VIP plan to unlock 1 FREE .ZIP Folder immediately!`,
    referralFreeCreditsReady: (count) => `🎁 ${count} Free Credit(s) Ready!`,
    referralRefreshBtn: 'Refresh',
    referralPersonalLinkLabel: 'Your Personal Share Link',
    referralCopyLinkBtn: '📋 Copy My Share Link',
    referralLinkCopiedBtn: '✔ Link Copied!',
    referralLinkCopiedToast: '📋 Share link copied! Send it to your friends.',
    referralShareWhatsAppBtn: '📲 Share on WhatsApp',
    referralShareTikTokBtn: '📲 Share on WhatsApp / TikTok',
    referralCopiedTikTokBtn: '✔ Copied for TikTok!',
    referralCopiedTikTokToast: '📲 Share message + link copied for WhatsApp / TikTok!',
    referralRegisteredTitle: 'Friends Registered via Your Link',
    referralRegisteredDone: (goal) => `✅ ${goal} registered friends goal complete!`,
    referralRegisteredLeft: (left) => `${left} more unique users need to register with their phone number.`,
    referralBuyersTitle: 'Referrals Who Bought a VIP Plan',
    referralBuyersDone: (goal) => `✅ ${goal} paying VIP customers goal complete!`,
    referralBuyersLeft: (left) => `${left} more referred friends need to buy a VIP plan.`,
    referralUnlockNote: (regGoal, purGoal) =>
      `The reward button unlocks automatically once both counters are complete (${regGoal}/${regGoal} Registered & ${purGoal}/${purGoal} Purchased).`,
    referralClaimingBtn: '⏳ Unlocking 1 Free Folder...',
    referralClaimBtn: '🎁 Claim 1 Free Folder Credit',
    referralClaimedActive: (count) =>
      `🎉 You have ${count} active Free Folder Credit(s)! Scroll to the catalog and click "⬇️ DOWNLOAD .ZIP" on any pack.`,
    referralClaimedUsed: '✅ Your 1 Free Folder reward has already been claimed and used. Thanks for sharing!',
    referralDownloadFreeBtn: 'Download Free .ZIP',
    referralClaimSuccessToast: '🎁 Congrats! You earned +1 Free Folder Credit! Click any pack to download your .ZIP.',
    referralClaimErrorFallback: 'Unable to claim the free credit right now.',
    referralShareText: (url) =>
      `🎧 Download the hottest DJ .ZIP Music Folders (Konpa, Rabòday, Afrobeats, Hip-Hop) on WESLEY MUSIC PACKS! Join with my link now: ${url}`,

    downloadLaunchedToast: '✅ Download Started! Check your Downloads folder.',
    preparingZipOverlay: (current, total, percent) =>
      `📥 Preparing .ZIP... ${current} / ${total} (${percent}%)`,
    savedToDownloadsNote: 'The .ZIP file has been sent to your browser Downloads folder.',
    clickIfNotStartedBtn: '⬇️ Click Here If Download Did Not Start',
    vipUnlockedUnlimitedToast: '👑 Unlimited VIP Access unlocked for the entire catalog!',
    vipUnlockedCreditsToast: (remaining, total) =>
      `VIP Access unlocked! Folder Credits: ${remaining} / ${total} Folders`,

    installOnPhoneBtn: 'Install App',
    addToIphoneBtn: 'Add to iPhone Home',
    iosGuideTitle: 'Add Wesley Music to iPhone Home Screen',
    iosGuideSubtitle: 'Open full screen without Safari bar',
    iosGuideStep1: '1. Tap the Share button at the bottom center of Safari.',
    iosGuideStep2: '2. Scroll down and tap Add to Home Screen.',
    iosGuideConfirmBtn: 'Got It',

    virtualDjCardBadge: '🎁 BONUS GIFT: Free VirtualDJ with 1,000 HTG / $20 USD+ Plan',
    virtualDjDefaultTitle: 'VirtualDJ Pro PC/Mac — VIP Bonus',
    virtualDjLockedMsg: '🔒 Get any plan ≥ 1,000 HTG (or ≥ $20 USD / €20) to unlock VirtualDJ FREE!',
    virtualDjLockedCtaBtn: '🔓 Unlock with $20+ VIP Plan',
    virtualDjUnlockedBadge: '✅ UNLOCKED FOR YOUR VIP PLAN',
    virtualDjDownloadBtn: '⬇️ DOWNLOAD VIRTUALDJ FREE',
    virtualDjPendingLinkBtn: '⏳ Admin is preparing the VirtualDJ file...',
    virtualDjDownloadStartedToast: '⬇️ Free VirtualDJ download started!',
    virtualDjIncludedCheckoutNote: '🎁 BONUS INCLUDED: This plan unlocks Free VirtualDJ immediately!',
  },

  fr: {
    navFolders: 'Dossiers .ZIP',
    navHowItWorks: 'Comment ça Marche',
    navAdmin: 'Admin VIP',
    vipUnlimitedShort: '👑 VIP Illimité',
    folderCreditsRemainingLabel: '📁 Crédits Dossier restants :',
    folderWord: 'Dossiers',
    enterVipKeyBtn: 'Entrer Clé VIP',
    vipKeyShortBtn: 'Clé VIP',
    changeVipKeyBtn: 'Changer Clé VIP',
    changeCodeShortBtn: 'Changer Code',
    vipUnlimitedActiveBanner: '👑 Accès VIP Illimité Actif (Tout le Catalogue)',
    languageSwitcherLabel: 'Langue',

    adminModeActive: '👑 MODE ADMIN ACTIF (TÉLÉCHARGEMENTS GRATUITS ILLIMITÉS)',
    adminVisitorPreview: '🔒 APERÇU VISITEUR (Cliquez pour Activer le Mode Admin Gratuit)',
    openAdminPanel: 'Ouvrir Admin Panel',
    logoutAdmin: 'Déconnexion',

    bonusCreditsBannerPrefix: '🎁 Vous avez',
    bonusCreditsBannerSuffix: 'Crédit(s) Dossier Gratuit(s) (Récompense Partage) — Cliquez sur « ⬇️ TÉLÉCHARGER .ZIP » !',
    chooseYourFolderLink: 'Choisir un Dossier',

    heroEyebrow: 'Collection DJ & Mélomanes 2026 · Packs .ZIP prêts pour VirtualDJ',
    heroTitle: 'Dossiers Musicaux VIP .ZIP pour DJ et Amateurs de Bon Son',
    heroSubtitlePrefix: 'Chaque dossier',
    heroSubtitleSuffix: 'contient des sons classés prêts à télécharger. Entrez votre Clé VIP pour débloquer tous vos dossiers.',
    downloadZipsHeroBtn: 'Télécharger les .ZIP',
    unlockWithVipBtn: 'Débloquer avec Clé VIP',
    buyVipKeyBtn: 'Acheter une Clé VIP',

    catalogTitle: (activeCount, comingCount) =>
      `Tous les Dossiers .ZIP (${activeCount} Disponibles · ${comingCount} En Préparation)`,
    catalogSubtitlePrefix: 'Chaque pack est un dossier',
    catalogSubtitleSuffix: 'complet avec tous les titres numérotés dans l’ordre prêts à télécharger.',
    searchPlaceholder: 'Rechercher un dossier, genre, artiste ou titre (ex : Rabòday, Drill, Klass)...',
    searchAriaLabel: 'Rechercher un dossier ou un titre',
    clearSearchAria: 'Effacer la recherche',
    micStartAria: 'Recherche vocale (🎙️)',
    micStopAria: 'Arrêter le micro',
    micStopLabel: 'Arrêter',
    micVoiceLabel: 'Voix',
    micListeningText: '🎙️ Parlez maintenant...',
    micUnsupportedText: 'Micro non pris en charge sur ce navigateur — tapez votre recherche',
    micPermissionDeniedText: 'Accès au micro refusé — autorisez le micro ou tapez votre recherche',
    micNoSpeechText: 'Aucune voix détectée — cliquez sur 🎙️ pour réessayer ou tapez votre recherche',
    micUnavailableText: 'Micro indisponible pour le moment — tapez votre recherche',
    searchResultsPrefix: 'Résultats pour',
    foldersFoundWord: 'dossiers',
    andWord: 'et',
    tracksMatchWord: 'titres correspondants',
    availableNowBadge: (label) => `✅ DISPONIBLE MAINTENANT (${label} Dossiers .ZIP Prêts)`,
    emptyCatalogText: 'Aucun dossier .ZIP n’est prêt à télécharger pour le moment.',
    emptySearchText: (q) => `Aucun dossier ou titre ne correspond à « ${q} ».`,
    resetSearchBtn: 'Effacer la Recherche',
    tracksWord: 'Titres',
    tracksFoundBadge: (count) => `🎵 ${count} titres trouvés`,
    moreTracksWord: (count) => `(+${count} autres)`,
    preparingZipBtn: 'Préparation .ZIP...',
    downloadZipBtn: '⬇️ TÉLÉCHARGER .ZIP',
    enterVipToDownloadBtn: '🔒 Entrer Clé VIP pour Télécharger',
    trendingBadgePrefix: '🔥 TENDANCES DANS VOTRE PAYS ·',
    trendingTitle: (label) => `🔥 TENDANCES DANS VOTRE PAYS (${label} Packs .ZIP En Préparation)`,
    trendingSubtitlePrefix: 'Les packs les plus demandés pour',
    trendingSubtitleSuffix: 'Cliquez sur « 🔔 Demander ce Pack » pour dire à DJ Wesley lequel publier en premier (sans dépenser de crédit VIP !).',
    emptyTrendingSearch: (q) => `Aucun pack en préparation ne correspond à « ${q} ».`,
    comingSoonPill: 'BIENTÔT DISPONIBLE',
    requestSentBtn: '✅ Demande Envoyée (Redemander)',
    sendingRequestBtn: 'Envoi en cours...',
    requestPackBtn: '🔔 Demander ce Pack',
    requestSentToast: '✅ Votre demande a été envoyée à DJ Wesley ! Ce pack arrive bientôt.',

    howTitle: 'Comment ça Marche en 3 Étapes',
    step1Tag: '01. Achat Automatique',
    step1Title: 'Payez en Ligne ou par Code Prépayé',
    step1Desc: 'Choisissez votre forfait (10, 21, 36, 55 Dossiers ou VIP Illimité) et payez par Carte, Apple Pay ou USDT Crypto pour recevoir votre Clé VIP automatiquement.',
    step2Tag: '02. Débloquez',
    step2Title: 'Entrez votre Clé VIP',
    step2Desc: 'Saisissez votre code court (ex. W#84K2) pour débloquer les boutons verts « ⬇️ TÉLÉCHARGER .ZIP » sur tous les dossiers.',
    step3Tag: '03. Téléchargez .ZIP',
    step3Title: 'Prêt pour VirtualDJ 8 / 2024+',
    step3Desc: 'Chaque dossier .ZIP inclut les MP3 numérotés, 000 - PLAYLIST_VIRTUALDJ.m3u et VIRTUALDJ_IMPORT_DATABASE.xml.',

    footerRights: (year) => `© ${year} WESLEY MUSIC PACKS (by DJ WESLEY). Tous droits réservés.`,

    gateEyebrow: 'WESLEY MUSIC PACKS · ACCÈS VISITEUR',
    gateTitle: '🎧 Bienvenue ! Entrez Vos Informations',
    gateSubtitle: 'Indiquez votre nom complet, choisissez votre pays et votre langue, puis saisissez un numéro de téléphone valide pour accéder au catalogue.',
    gateLanguageLabel: '🌐 Choisissez Votre Langue / Select Language',
    gateFullNameLabel: '👤 Nom Complet',
    gateFullNamePlaceholder: 'Ex : Jean-Baptiste Wesley',
    gateCountryLabel: '🌍 Votre Pays',
    gateCodeWord: 'Indicatif',
    gatePhoneLabel: '📱 Numéro de Téléphone',
    gatePhoneValidPrefix: 'Numéro valide pour',
    gatePhoneExamplePrefix: 'Entrez un numéro valide pour',
    gatePhoneExampleWord: 'exemple',
    gateSubmittingBtn: 'Vérification du numéro...',
    gateSubmitBtn: '🚀 ACCÉDER AU SITE MAINTENANT',
    gatePrivacyNote: '🔒 Vos informations sont protégées et réservées à la vérification client.',
    gateInvalidPhoneFallback: (countryName, dialCode) =>
      `⚠️ Ce numéro n'est pas valide pour ${countryName} (+${dialCode}). Veuillez entrer un vrai numéro local valide.`,

    modalCloseAria: 'Fermer la fenêtre',
    chooseZipModalTitle: 'Choisissez un Dossier .ZIP à Télécharger',
    activeCodeModalDesc: (code) =>
      `Clé ${code} active. Cliquez sur n'importe quel dossier pour télécharger le .ZIP (1 Crédit Dossier).`,
    comingSoonOrderLabel: '⏳ EN PRÉPARATION',
    orderedTracksLabel: (count) => `${count} Titres Classés`,
    notAvailableYetBadge: '⏳ Bientôt Disponible',
    viewAllFoldersOnSite: 'Voir tous les dossiers .ZIP sur le site',
    haveVipKeyHeading: '🔑 VOUS AVEZ UNE CLÉ VIP / CARTE PRÉPAYÉE ?',
    enterCodeForFolderDesc: (filename) => `Entrez votre code pour télécharger ${filename}.`,
    enterCodeGeneralDesc: 'Entrez votre Clé VIP ou Code Prépayé ci-dessous pour débloquer tous les dossiers .ZIP immédiatement.',
    vipKeyPlaceholder: 'Entrez votre Clé VIP ici... ex : W#84K2',
    verifyingVipBtn: '⏳ Vérification de la Clé VIP...',
    unlockVipAccessBtn: '🔓 DÉBLOQUER L’ACCÈS VIP MAINTENANT',
    orDivider: '— OU BIEN —',
    buyVipOnlineHeading: '🛒 ACHETER UNE CLÉ VIP EN LIGNE AUTOMATIQUEMENT',
    pricesForLabel: 'Tarifs pour',
    popularBadge: 'POPULAIRE',
    payNatcashBtn: (label, price) => `⚡ PAYER AVEC NATCASH (${label} · ${price})`,
    payCardBtn: (label, usdt) => `💳 Payer par Carte Visa / Mastercard / Apple Pay (${label} · ${usdt} USDT)`,
    haitiCheckoutFootnote: '🇭🇹 Haïti : Payez directement avec Natcash (+509 56568810) et recevez votre Clé VIP instantanément à l’écran !',
    intlCheckoutFootnote: (flag) =>
      `🌐 International (${flag}) : Payez par Visa / Mastercard / Apple Pay ou envoyez des USDT (TRC20) pour recevoir votre Clé VIP tout de suite !`,
    browseFoldersFirstBtn: '👀 Parcourir les Dossiers .ZIP d’abord',
    expiredKeyError: '🚫 CE CODE A DÉJÀ ÉTÉ UTILISÉ / EXPIRÉ',

    planFinishedHeading: '⏰ VOTRE FORFAIT EST TERMINÉ !',
    exhaustedKeyInfo: (code) => `Clé : ${code} · 0 Dossier .ZIP restant`,
    planFinishedDesc: 'Vous avez téléchargé tous les dossiers .ZIP de votre forfait. Choisissez un nouveau forfait ci-dessous ou entrez un code prépayé !',
    enterNewVipKeyBtn: '🔑 Entrer une Nouvelle Clé VIP / Code Prépayé',
    intlUsdtFootnote: (flag) =>
      `🌐 International (${flag}) : Payez en ligne en USDT (TRC20) pour recevoir votre Clé VIP instantanément !`,

    natcashDirectTag: 'NATCASH DIRECT',
    cardIntlTag: 'CARTE VISA / APPLE PAY / USDT',
    usdtDirectTag: 'USDT (TRC20) INSTANT',
    amountToPayLabel: 'Montant à Payer :',
    sendNatcashInstruction: 'Envoyez votre paiement Natcash à ce numéro :',
    numberCopiedBtn: '✔ Numéro Copié !',
    copyNatcashBtn: '📋 Copier Numéro Natcash',
    pasteNatcashSmsLabel: '📋 Collez le SMS de Confirmation Natcash Complet Ici',
    pasteBtn: '📋 Coller le SMS',
    pastedFeedback: '✔ SMS Collé !',
    natcashSmsPlaceholder: 'Collez ici le message complet de confirmation Natcash reçu (avec montant HTG, +509 56568810 et Transcode)...',
    optionalPhoneLabel: 'Votre Numéro de Téléphone (Optionnel)',
    verifyingNatcashBtn: 'Vérification du SMS Natcash...',
    verifyNatcashBtn: '⚡ VÉRIFIER SMS NATCASH & RECEVOIR CLÉ VIP',
    chooseAnotherPlanLink: 'Choisir un autre forfait',
    vipAppearsOnScreenNote: 'Clé VIP affichée à l’écran',
    cardTabBtn: '💳 CARTE VISA / MASTERCARD / APPLE PAY',
    usdtTabBtn: '⚡ ENVOYER USDT DIRECT (TRC20)',
    cardAmountLabel: 'Montant par Carte',
    payWithCardNowBtn: '💳 PAYER PAR VISA / APPLE PAY MAINTENANT',
    otherCardGatewayBtn: '🌐 Autre Passerelle Carte (Paybis)',
    cardStep1: 'Effectuez le paiement avec votre carte Visa/Mastercard ou Apple Pay dans la fenêtre qui s’ouvre.',
    cardStep2: 'Collez votre code de confirmation / TxID ci-dessous pour débloquer votre Clé VIP immédiatement !',
    exactAmountUsdtLabel: 'Montant Exact à Envoyer',
    usdtAddressLabel: 'Adresse USDT (TRC20) Trust Wallet :',
    usdtAddressCopiedBtn: '✔ Adresse USDT Copiée !',
    copyUsdtAddressBtn: '📋 Copier Adresse USDT (TRC20)',
    txIdPlaceholder: 'Collez le TxID / Hash TRON (64 caractères) ici...',
    verifyingTronBtn: 'Vérification sur TRON (TRC20)...',
    savingTxBtn: 'Enregistrement du TxID...',
    verifyPayUnlockBtn: '⚡ VÉRIFIER PAIEMENT & DÉBLOQUER CLÉ VIP',
    tronVerificationNote: 'Vérification TronGrid + VIP',
    orderRegisteredTag: (id) => `⏳ COMMANDE #${id} ENREGISTRÉE`,
    verifyingWaitHeading: '⏳ Vérification de votre paiement... Votre Clé VIP apparaîtra ici automatiquement !',
    verifyingWaitDesc: 'Gardez cette fenêtre ouverte — dès que le paiement est validé, votre Clé VIP s’affichera en temps réel !',
    planLabel: 'Forfait :',
    amountLabel: 'Montant :',
    methodLabel: 'Méthode :',
    phoneLabel: 'Téléphone :',
    recheckingNatcashBtn: 'Re-vérification en cours...',
    recheckNatcashBtn: '🔄 Re-vérifier Ma Transaction',
    modifyOrRetryPaymentLink: 'Modifier le TxID ou Envoyer un Autre Paiement',
    paymentRejectedHeading: (txId) => `Le paiement #${txId} n'a pas pu être validé.`,
    paymentRejectedDesc: 'Vérifiez le code de transaction ou le montant puis réessayez.',
    tryAgainBtn: 'Réessayer',
    verifiedTronTag: '⚡ Confirmé Automatiquement sur TRON (TRC20)',
    verifiedVipTag: '✔ Validé par le Système VIP Wesley Music',
    hereIsYourVipKeyHeading: '🎉 VOICI VOTRE CLÉ VIP !',
    unlimitedInfinityLabel: "♾️ Accès Illimité à l'Infini",
    foldersZipCountLabel: (count) => `${count} Dossiers .ZIP`,
    oneTimeSecretKeyLabel: 'Votre Clé Secrète VIP (Usage Unique)',
    copiedShortBtn: 'Copié !',
    copyKeyBtn: '📋 Copier la Clé',
    unlockingBtn: 'Déblocage de l’accès VIP...',
    unlockAllFoldersNowBtn: '🔓 DÉBLOQUER TOUS LES DOSSIERS .ZIP',
    pasteEmptyError: 'Votre presse-papiers est vide — copiez le SMS Natcash d’abord ou faites un appui long pour coller.',
    pasteBlockedError: 'Collage automatique bloqué — faites un appui long dans le champ texte et choisissez Coller.',
    recheckPendingFallback: 'Le reçu SMS Natcash n’est pas encore validé — vérifiez le code ou réessayez dans quelques secondes.',
    invalidOrUsedKeyError: 'Cette clé est invalide ou déjà utilisée.',

    referralPersonalCodeLabel: 'Votre Code de Parrainage :',
    referralHeading: '🎁 PARTAGEZ & GAGNEZ 1 DOSSIER GRATUIT',
    referralDesc: (regGoal, purGoal) =>
      `Invitez ${regGoal} personnes à s’inscrire avec leur numéro via votre lien et au moins ${purGoal} d’entre elles à prendre un forfait VIP pour débloquer 1 Dossier .ZIP GRATUIT !`,
    referralFreeCreditsReady: (count) => `🎁 ${count} Crédit(s) Gratuit(s) Prêt(s) !`,
    referralRefreshBtn: 'Actualiser',
    referralPersonalLinkLabel: 'Votre Lien de Partage Personnel',
    referralCopyLinkBtn: '📋 Copier Mon Lien',
    referralLinkCopiedBtn: '✔ Lien Copié !',
    referralLinkCopiedToast: '📋 Lien copié ! Partagez-le avec vos amis.',
    referralShareWhatsAppBtn: '📲 Partager sur WhatsApp',
    referralShareTikTokBtn: '📲 Partager WhatsApp / TikTok',
    referralCopiedTikTokBtn: '✔ Copié pour TikTok !',
    referralCopiedTikTokToast: '📲 Message + lien copiés pour WhatsApp / TikTok !',
    referralRegisteredTitle: 'Inscrits via Votre Lien',
    referralRegisteredDone: (goal) => `✅ Objectif de ${goal} inscrits atteint !`,
    referralRegisteredLeft: (left) => `Il reste ${left} personnes uniques à inscrire avec leur numéro.`,
    referralBuyersTitle: 'Filleuls Ayant Acheté un Pack VIP',
    referralBuyersDone: (goal) => `✅ Objectif de ${goal} acheteurs VIP atteint !`,
    referralBuyersLeft: (left) => `Il reste ${left} filleuls devant acheter un forfait VIP.`,
    referralUnlockNote: (regGoal, purGoal) =>
      `Le bouton de récompense se débloque dès que les deux compteurs sont complets (${regGoal}/${regGoal} Inscrits et ${purGoal}/${purGoal} Achats).`,
    referralClaimingBtn: '⏳ Déblocage de 1 Dossier Gratuit...',
    referralClaimBtn: '🎁 Réclamer 1 Crédit Dossier Gratuit',
    referralClaimedActive: (count) =>
      `🎉 Vous avez ${count} Crédit(s) Dossier Gratuit(s) actif(s) ! Cliquez sur « ⬇️ TÉLÉCHARGER .ZIP » sur n’importe quel pack.`,
    referralClaimedUsed: '✅ Votre récompense de 1 Dossier Gratuit a déjà été réclamée et utilisée. Merci !',
    referralDownloadFreeBtn: 'Télécharger .ZIP Gratuit',
    referralClaimSuccessToast: '🎁 Félicitations ! +1 Crédit Dossier Gratuit obtenu ! Cliquez sur un pack pour télécharger.',
    referralClaimErrorFallback: 'Impossible de réclamer le crédit gratuit pour le moment.',
    referralShareText: (url) =>
      `🎧 Télécharge les meilleurs Dossiers Musicaux .ZIP (Konpa, Rabòday, Afrobeats, Hip-Hop) sur WESLEY MUSIC PACKS ! Inscris-toi avec mon lien : ${url}`,

    downloadLaunchedToast: '✅ Téléchargement Lancé ! Vérifiez votre dossier Téléchargements.',
    preparingZipOverlay: (current, total, percent) =>
      `📥 Préparation du .ZIP... ${current} / ${total} (${percent}%)`,
    savedToDownloadsNote: 'Le fichier .ZIP a été enregistré dans votre dossier Téléchargements.',
    clickIfNotStartedBtn: '⬇️ Cliquez Ici Si Rien Ne Démarre',
    vipUnlockedUnlimitedToast: '👑 Accès VIP Illimité débloqué pour tout le catalogue !',
    vipUnlockedCreditsToast: (remaining, total) =>
      `Accès VIP débloqué ! Crédits Dossier : ${remaining} / ${total}`,

    installOnPhoneBtn: 'Installer l’App',
    addToIphoneBtn: 'Ajouter sur Écran iPhone',
    iosGuideTitle: 'Ajouter Wesley Music sur iPhone',
    iosGuideSubtitle: 'Ouvrir en plein écran sans barre Safari',
    iosGuideStep1: '1. Appuyez sur le bouton Partager en bas au centre de Safari.',
    iosGuideStep2: '2. Faites défiler et appuyez sur Sur l’écran d’accueil.',
    iosGuideConfirmBtn: 'Compris',

    virtualDjCardBadge: '🎁 CADEAU BONUS : VirtualDJ Gratuit avec Plan 1 000 HTG / 20 €+',
    virtualDjDefaultTitle: 'VirtualDJ Pro PC/Mac — Bonus VIP',
    virtualDjLockedMsg: '🔒 Prenez un forfait ≥ 1 000 HTG (ou ≥ 20 USD / 20 €) pour débloquer VirtualDJ GRATUIT !',
    virtualDjLockedCtaBtn: '🔓 Débloquer avec un Forfait 20 €+',
    virtualDjUnlockedBadge: '✅ DÉBLOQUÉ AVEC VOTRE FORFAIT VIP',
    virtualDjDownloadBtn: '⬇️ TÉLÉCHARGER VIRTUALDJ GRATUIT',
    virtualDjPendingLinkBtn: '⏳ L’admin prépare le fichier VirtualDJ...',
    virtualDjDownloadStartedToast: '⬇️ Téléchargement de VirtualDJ Gratuit lancé !',
    virtualDjIncludedCheckoutNote: '🎁 BONUS INCLUS : Ce forfait débloque VirtualDJ Gratuit immédiatement !',
  },

  es: {
    navFolders: 'Carpetas .ZIP',
    navHowItWorks: 'Cómo Funciona',
    navAdmin: 'Admin VIP',
    vipUnlimitedShort: '👑 VIP Ilimitado',
    folderCreditsRemainingLabel: '📁 Créditos de Carpeta:',
    folderWord: 'Carpetas',
    enterVipKeyBtn: 'Ingresar Llave VIP',
    vipKeyShortBtn: 'Llave VIP',
    changeVipKeyBtn: 'Cambiar Llave VIP',
    changeCodeShortBtn: 'Cambiar Código',
    vipUnlimitedActiveBanner: '👑 Acceso VIP Ilimitado Activo (Todo el Catálogo)',
    languageSwitcherLabel: 'Idioma',

    adminModeActive: '👑 MODO ADMIN ACTIVO (DESCARGAS GRATIS ILIMITADAS)',
    adminVisitorPreview: '🔒 VISTA DE VISITANTE (Clic para Activar Modo Admin Gratis)',
    openAdminPanel: 'Abrir Panel Admin',
    logoutAdmin: 'Cerrar Sesión',

    bonusCreditsBannerPrefix: '🎁 Tienes',
    bonusCreditsBannerSuffix: 'Crédito(s) de Carpeta Gratis (Recompensa) — Haz clic en « ⬇️ DESCARGAR .ZIP » en cualquier carpeta.',
    chooseYourFolderLink: 'Elige tu Carpeta',

    heroEyebrow: 'Colección DJ & Fans 2026 · Packs .ZIP listos para VirtualDJ',
    heroTitle: 'Carpetas Musicales VIP .ZIP para DJs y Amantes de Buena Música',
    heroSubtitlePrefix: 'Cada carpeta',
    heroSubtitleSuffix: 'contiene música ordenada lista para descargar. Ingresa tu Llave VIP para desbloquear todas tus carpetas.',
    downloadZipsHeroBtn: 'Descargar .ZIPs',
    unlockWithVipBtn: 'Desbloquear con Llave VIP',
    buyVipKeyBtn: 'Comprar Llave VIP',

    catalogTitle: (activeCount, comingCount) =>
      `Todas las Carpetas .ZIP (${activeCount} Disponibles · ${comingCount} Próximamente)`,
    catalogSubtitlePrefix: 'Cada pack es una carpeta',
    catalogSubtitleSuffix: 'completa con todas las canciones numeradas en orden listas para descargar.',
    searchPlaceholder: 'Buscar carpetas, géneros, artistas o canciones (ej. Rabòday, Drill, Klass)...',
    searchAriaLabel: 'Buscar carpetas o canciones',
    clearSearchAria: 'Borrar búsqueda',
    micStartAria: 'Búsqueda por voz (🎙️)',
    micStopAria: 'Detener micrófono',
    micStopLabel: 'Parar',
    micVoiceLabel: 'Voz',
    micListeningText: '🎙️ Habla ahora...',
    micUnsupportedText: 'El micrófono no es compatible con este navegador — escribe tu búsqueda',
    micPermissionDeniedText: 'Permiso de micrófono denegado — habilita el micrófono o escribe tu búsqueda',
    micNoSpeechText: 'No se detectó voz — pulsa 🎙️ para reintentar o escribe tu búsqueda',
    micUnavailableText: 'Micrófono no disponible ahora — escribe tu búsqueda',
    searchResultsPrefix: 'Resultados para',
    foldersFoundWord: 'carpetas',
    andWord: 'y',
    tracksMatchWord: 'canciones coinciden',
    availableNowBadge: (label) => `✅ DISPONIBLE AHORA (${label} Carpetas .ZIP Listas)`,
    emptyCatalogText: 'No hay carpetas .ZIP listas para descargar por el momento.',
    emptySearchText: (q) => `No se encontraron carpetas ni canciones para « ${q} ».`,
    resetSearchBtn: 'Limpiar Búsqueda',
    tracksWord: 'Canciones',
    tracksFoundBadge: (count) => `🎵 ${count} canciones encontradas`,
    moreTracksWord: (count) => `(+${count} más)`,
    preparingZipBtn: 'Preparando .ZIP...',
    downloadZipBtn: '⬇️ DESCARGAR .ZIP',
    enterVipToDownloadBtn: '🔒 Ingresa Llave VIP para Descargar',
    trendingBadgePrefix: '🔥 TENDENCIAS EN TU PAÍS ·',
    trendingTitle: (label) => `🔥 TENDENCIAS EN TU PAÍS (${label} Packs .ZIP en Preparación)`,
    trendingSubtitlePrefix: 'Los packs más pedidos para',
    trendingSubtitleSuffix: 'Haz clic en « 🔔 Pedir Este Pack » para decirle a DJ Wesley cuál lanzar primero (¡no gasta créditos VIP!).',
    emptyTrendingSearch: (q) => `Ningún pack en preparación coincide con « ${q} ».`,
    comingSoonPill: 'PRÓXIMAMENTE',
    requestSentBtn: '✅ Solicitud Enviada (Pedir de Nuevo)',
    sendingRequestBtn: 'Enviando solicitud...',
    requestPackBtn: '🔔 Pedir Este Pack',
    requestSentToast: '✅ ¡Solicitud enviada a DJ Wesley! Pronto publicaremos este pack.',

    howTitle: 'Cómo Funciona en 3 Pasos',
    step1Tag: '01. Compra Automática',
    step1Title: 'Paga en Línea o Usa una Tarjeta Prepago',
    step1Desc: 'Elige el plan que necesites (10, 21, 36, 55 Carpetas o VIP Ilimitado) y paga con Tarjeta, Apple Pay o Crypto USDT para recibir tu Llave VIP automáticamente.',
    step2Tag: '02. Desbloquea',
    step2Title: 'Ingresa tu Llave VIP',
    step2Desc: 'Ingresa tu código corto (ej. W#84K2) para desbloquear los botones verdes « ⬇️ DESCARGAR .ZIP » en todas las carpetas.',
    step3Tag: '03. Descarga .ZIP',
    step3Title: 'Listo para VirtualDJ 8 / 2024+',
    step3Desc: 'Cada carpeta .ZIP incluye MP3 ordenados, 000 - PLAYLIST_VIRTUALDJ.m3u y VIRTUALDJ_IMPORT_DATABASE.xml.',

    footerRights: (year) => `© ${year} WESLEY MUSIC PACKS (by DJ WESLEY). Todos los derechos reservados.`,

    gateEyebrow: 'WESLEY MUSIC PACKS · ACCESO VISITANTE',
    gateTitle: '🎧 ¡Bienvenido! Ingresa tus Datos',
    gateSubtitle: 'Escribe tu nombre completo, elige tu país e idioma e ingresa un número de teléfono válido de tu país para entrar al catálogo.',
    gateLanguageLabel: '🌐 Elige tu Idioma / Select Language',
    gateFullNameLabel: '👤 Nombre Completo',
    gateFullNamePlaceholder: 'Ej: Carlos Martínez',
    gateCountryLabel: '🌍 Tu País',
    gateCodeWord: 'Código',
    gatePhoneLabel: '📱 Número de Teléfono',
    gatePhoneValidPrefix: 'Número válido para',
    gatePhoneExamplePrefix: 'Ingresa un número válido para',
    gatePhoneExampleWord: 'ejemplo',
    gateSubmittingBtn: 'Verificando tu número...',
    gateSubmitBtn: '🚀 ENTRAR AL SITIO AHORA',
    gatePrivacyNote: '🔒 Tus datos están protegidos solo para verificación de clientes.',
    gateInvalidPhoneFallback: (countryName, dialCode) =>
      `⚠️ Este número no es válido para ${countryName} (+${dialCode}). Por favor ingresa un número local válido.`,

    modalCloseAria: 'Cerrar ventana',
    chooseZipModalTitle: 'Elige una Carpeta .ZIP para Descargar',
    activeCodeModalDesc: (code) =>
      `Llave ${code} activa. Haz clic en cualquier carpeta para descargar el .ZIP (1 Crédito).`,
    comingSoonOrderLabel: '⏳ PRÓXIMAMENTE',
    orderedTracksLabel: (count) => `${count} Canciones Ordenadas`,
    notAvailableYetBadge: '⏳ Aún No Disponible',
    viewAllFoldersOnSite: 'Ver todas las carpetas .ZIP en el sitio',
    haveVipKeyHeading: '🔑 ¿TIENES UNA LLAVE VIP / CÓDIGO PREPAGO?',
    enterCodeForFolderDesc: (filename) => `Ingresa tu código para descargar ${filename}.`,
    enterCodeGeneralDesc: 'Ingresa tu Llave VIP o Código Prepago abajo para desbloquear todas las carpetas .ZIP al instante.',
    vipKeyPlaceholder: 'Ingresa tu Llave VIP aquí... ej: W#84K2',
    verifyingVipBtn: '⏳ Verificando Llave VIP...',
    unlockVipAccessBtn: '🔓 DESBLOQUEAR ACCESO VIP AHORA',
    orDivider: '— O TAMBIÉN —',
    buyVipOnlineHeading: '🛒 COMPRAR LLAVE VIP AUTOMÁTICA EN LÍNEA',
    pricesForLabel: 'Precios para',
    popularBadge: 'POPULAR',
    payNatcashBtn: (label, price) => `⚡ PAGAR CON NATCASH (${label} · ${price})`,
    payCardBtn: (label, usdt) => `💳 Pagar con Visa / Mastercard / Apple Pay (${label} · ${usdt} USDT)`,
    haitiCheckoutFootnote: '🇭🇹 Haití: Paga directo con Natcash (+509 56568810) y recibe tu Llave VIP al instante en pantalla.',
    intlCheckoutFootnote: (flag) =>
      `🌐 Internacional (${flag}): Paga con Visa / Mastercard / Apple Pay o envía USDT (TRC20) para recibir tu Llave VIP al instante.`,
    browseFoldersFirstBtn: '👀 Ver las Carpetas .ZIP Primero',
    expiredKeyError: '🚫 ESTE CÓDIGO YA FUE USADO / EXPIRADO',

    planFinishedHeading: '⏰ ¡TU PLAN TERMINÓ!',
    exhaustedKeyInfo: (code) => `Llave: ${code} · 0 Carpetas .ZIP restantes`,
    planFinishedDesc: 'Ya descargaste todas las carpetas .ZIP de tu plan. ¡Elige un nuevo plan abajo o ingresa un Código Prepago!',
    enterNewVipKeyBtn: '🔑 Ingresar Nueva Llave VIP / Código Prepago',
    intlUsdtFootnote: (flag) =>
      `🌐 Internacional (${flag}): Paga en línea con USDT (TRC20) para recibir tu Llave VIP al instante en pantalla.`,

    natcashDirectTag: 'NATCASH DIRECTO',
    cardIntlTag: 'TARJETA VISA / APPLE PAY / USDT',
    usdtDirectTag: 'USDT (TRC20) INSTANTE',
    amountToPayLabel: 'Monto a Pagar:',
    sendNatcashInstruction: 'Envía tu pago Natcash a este número:',
    numberCopiedBtn: '✔ ¡Número Copiado!',
    copyNatcashBtn: '📋 Copiar Número Natcash',
    pasteNatcashSmsLabel: '📋 Pega Aquí el SMS Completo de Confirmación Natcash',
    pasteBtn: '📋 Pegar SMS',
    pastedFeedback: '✔ ¡SMS Pegado!',
    natcashSmsPlaceholder: 'Pega aquí el mensaje completo de confirmación Natcash recibido...',
    optionalPhoneLabel: 'Tu Número de Teléfono (Opcional)',
    verifyingNatcashBtn: 'Verificando SMS Natcash...',
    verifyNatcashBtn: '⚡ VERIFICAR SMS NATCASH Y RECIBIR LLAVE VIP',
    chooseAnotherPlanLink: 'Elegir otro plan',
    vipAppearsOnScreenNote: 'La Llave VIP aparece en pantalla',
    cardTabBtn: '💳 VISA / MASTERCARD / APPLE PAY',
    usdtTabBtn: '⚡ ENVIAR USDT DIRECTO (TRC20)',
    cardAmountLabel: 'Monto a Pagar con Tarjeta',
    payWithCardNowBtn: '💳 PAGAR CON VISA / APPLE PAY AHORA',
    otherCardGatewayBtn: '🌐 Otra Pasarela de Tarjeta (Paybis)',
    cardStep1: 'Completa el pago con tu tarjeta Visa/Mastercard o Apple Pay en la ventana abierta.',
    cardStep2: '¡Pega tu código de confirmación / TxID abajo para desbloquear tu Llave VIP al instante!',
    exactAmountUsdtLabel: 'Monto Exacto a Enviar',
    usdtAddressLabel: 'Dirección USDT (TRC20) Trust Wallet:',
    usdtAddressCopiedBtn: '✔ ¡Dirección USDT Copiada!',
    copyUsdtAddressBtn: '📋 Copiar Dirección USDT (TRC20)',
    txIdPlaceholder: 'Pega el TxID / Hash TRON de 64 caracteres aquí...',
    verifyingTronBtn: 'Verificando en TRON (TRC20)...',
    savingTxBtn: 'Guardando TxID...',
    verifyPayUnlockBtn: '⚡ VERIFICAR PAGO Y DESBLOQUEAR LLAVE VIP',
    tronVerificationNote: 'Verificación TronGrid + VIP',
    orderRegisteredTag: (id) => `⏳ ORDEN #${id} REGISTRADA`,
    verifyingWaitHeading: '⏳ Verificando tu pago... ¡Tu Llave VIP aparecerá aquí automáticamente!',
    verifyingWaitDesc: 'Mantén esta ventana abierta — en cuanto se confirme el pago, tu Llave VIP aparecerá en tiempo real.',
    planLabel: 'Plan:',
    amountLabel: 'Monto:',
    methodLabel: 'Método:',
    phoneLabel: 'Teléfono:',
    recheckingNatcashBtn: 'Re-verificando transacción...',
    recheckNatcashBtn: '🔄 Re-verificar Mi Transacción',
    modifyOrRetryPaymentLink: 'Editar TxID o Enviar Otro Pago',
    paymentRejectedHeading: (txId) => `El pago #${txId} no pudo ser validado.`,
    paymentRejectedDesc: 'Verifica el código de transacción o el monto e inténtalo de nuevo.',
    tryAgainBtn: 'Intentar de Nuevo',
    verifiedTronTag: '⚡ Confirmado Automáticamente en TRON (TRC20)',
    verifiedVipTag: '✔ Validado por el Sistema VIP Wesley Music',
    hereIsYourVipKeyHeading: '🎉 ¡AQUÍ ESTÁ TU LLAVE VIP!',
    unlimitedInfinityLabel: '♾️ Acceso Ilimitado Infinito',
    foldersZipCountLabel: (count) => `${count} Carpetas .ZIP`,
    oneTimeSecretKeyLabel: 'Tu Llave Secreta VIP (Un Solo Uso)',
    copiedShortBtn: '¡Copiado!',
    copyKeyBtn: '📋 Copiar Llave',
    unlockingBtn: 'Desbloqueando acceso VIP...',
    unlockAllFoldersNowBtn: '🔓 DESBLOQUEAR TODAS LAS CARPETAS .ZIP AHORA',
    pasteEmptyError: 'Tu portapapeles está vacío — copia el SMS primero o mantén presionado para pegar.',
    pasteBlockedError: 'El navegador bloqueó el pegado automático — mantén presionado en el campo y elige Pegar.',
    recheckPendingFallback: 'El recibo aún no está confirmado — verifica el código o intenta en unos segundos.',
    invalidOrUsedKeyError: 'Esta llave no es válida o ya fue utilizada.',

    referralPersonalCodeLabel: 'Tu Código Personal de Referido:',
    referralHeading: '🎁 COMPARTE Y GANA 1 CARPETA GRATIS',
    referralDesc: (regGoal, purGoal) =>
      `Invita a ${regGoal} personas a registrarse con su teléfono desde tu enlace y que al menos ${purGoal} compren un plan VIP para desbloquear 1 Carpeta .ZIP GRATIS al instante.`,
    referralFreeCreditsReady: (count) => `🎁 ¡${count} Crédito(s) Gratis Listo(s)!`,
    referralRefreshBtn: 'Actualizar',
    referralPersonalLinkLabel: 'Tu Enlace Personal para Compartir',
    referralCopyLinkBtn: '📋 Copiar Mi Enlace',
    referralLinkCopiedBtn: '✔ ¡Enlace Copiado!',
    referralLinkCopiedToast: '📋 ¡Enlace copiado! Compártelo con tus amigos.',
    referralShareWhatsAppBtn: '📲 Compartir en WhatsApp',
    referralShareTikTokBtn: '📲 Compartir WhatsApp / TikTok',
    referralCopiedTikTokBtn: '✔ ¡Copiado para TikTok!',
    referralCopiedTikTokToast: '📲 ¡Mensaje + enlace copiados para WhatsApp / TikTok!',
    referralRegisteredTitle: 'Amigos Registrados con tu Enlace',
    referralRegisteredDone: (goal) => `✅ ¡Meta de ${goal} registros completada!`,
    referralRegisteredLeft: (left) => `Faltan ${left} personas únicas por registrarse con su número.`,
    referralBuyersTitle: 'Referidos que Compraron Plan VIP',
    referralBuyersDone: (goal) => `✅ ¡Meta de ${goal} compradores VIP completada!`,
    referralBuyersLeft: (left) => `Faltan ${left} invitados que compren un plan VIP.`,
    referralUnlockNote: (regGoal, purGoal) =>
      `El botón de recompensa se desbloquea automáticamente al completar ambos contadores (${regGoal}/${regGoal} y ${purGoal}/${purGoal}).`,
    referralClaimingBtn: '⏳ Desbloqueando 1 Carpeta Gratis...',
    referralClaimBtn: '🎁 Reclamar 1 Crédito Gratis',
    referralClaimedActive: (count) =>
      `🎉 ¡Tienes ${count} Crédito(s) Gratis activo(s)! Baja al catálogo y pulsa « ⬇️ DESCARGAR .ZIP ».`,
    referralClaimedUsed: '✅ Tu recompensa de 1 Carpeta Gratis ya fue reclamada y utilizada. ¡Gracias!',
    referralDownloadFreeBtn: 'Descargar .ZIP Gratis',
    referralClaimSuccessToast: '🎁 ¡Felicidades! Ganaste +1 Crédito Gratis. Haz clic en cualquier pack para descargar.',
    referralClaimErrorFallback: 'No se pudo reclamar el crédito gratis en este momento.',
    referralShareText: (url) =>
      `🎧 ¡Descarga las mejores Carpetas Musicales .ZIP (Konpa, Rabòday, Afrobeats, Hip-Hop) en WESLEY MUSIC PACKS! Regístrate con mi enlace: ${url}`,

    downloadLaunchedToast: '✅ ¡Descarga Iniciada! Revisa tu carpeta de Descargas.',
    preparingZipOverlay: (current, total, percent) =>
      `📥 Preparando .ZIP... ${current} / ${total} (${percent}%)`,
    savedToDownloadsNote: 'El archivo .ZIP se guardó en tu carpeta de Descargas.',
    clickIfNotStartedBtn: '⬇️ Clic Aquí Si No Empezó',
    vipUnlockedUnlimitedToast: '👑 ¡Acceso VIP Ilimitado desbloqueado para todo el catálogo!',
    vipUnlockedCreditsToast: (remaining, total) =>
      `¡Acceso VIP desbloqueado! Créditos: ${remaining} / ${total} Carpetas`,

    installOnPhoneBtn: 'Instalar App',
    addToIphoneBtn: 'Agregar a iPhone',
    iosGuideTitle: 'Agregar Wesley Music a Inicio de iPhone',
    iosGuideSubtitle: 'Abrir en pantalla completa sin barra de Safari',
    iosGuideStep1: '1. Pulsa el botón Compartir abajo en el centro de Safari.',
    iosGuideStep2: '2. Baja y pulsa Añadir a pantalla de inicio.',
    iosGuideConfirmBtn: 'Entendido',

    virtualDjCardBadge: '🎁 REGALO BONUS: VirtualDJ Gratis con Plan 1,000 HTG / $20+',
    virtualDjDefaultTitle: 'VirtualDJ Pro PC/Mac — Bonus VIP',
    virtualDjLockedMsg: '🔒 ¡Elige un plan ≥ 1,000 HTG (o ≥ $20 USD / €20) para desbloquear VirtualDJ GRATIS!',
    virtualDjLockedCtaBtn: '🔓 Desbloquear con Plan $20+',
    virtualDjUnlockedBadge: '✅ DESBLOQUEADO CON TU PLAN VIP',
    virtualDjDownloadBtn: '⬇️ DESCARGAR VIRTUALDJ GRATIS',
    virtualDjPendingLinkBtn: '⏳ El admin está preparando el archivo VirtualDJ...',
    virtualDjDownloadStartedToast: '⬇️ ¡Descarga de VirtualDJ Gratis iniciada!',
    virtualDjIncludedCheckoutNote: '🎁 BONUS INCLUIDO: ¡Este plan desbloquea VirtualDJ Gratis al instante!',
  },

  pt: {
    navFolders: 'Pastas .ZIP',
    navHowItWorks: 'Como Funciona',
    navAdmin: 'Admin VIP',
    vipUnlimitedShort: '👑 VIP Ilimitado',
    folderCreditsRemainingLabel: '📁 Créditos de Pasta restantes:',
    folderWord: 'Pastas',
    enterVipKeyBtn: 'Inserir Chave VIP',
    vipKeyShortBtn: 'Chave VIP',
    changeVipKeyBtn: 'Trocar Chave VIP',
    changeCodeShortBtn: 'Trocar Chave',
    vipUnlimitedActiveBanner: '👑 Acesso VIP Ilimitado Ativo (Todo o Catálogo)',
    languageSwitcherLabel: 'Idioma',

    adminModeActive: '👑 MODO ADMIN ATIVO (DOWNLOADS GRÁTIS ILIMITADOS)',
    adminVisitorPreview: '🔒 MODO VISITANTE (Clique para Ativar Modo Admin Grátis)',
    openAdminPanel: 'Abrir Painel Admin',
    logoutAdmin: 'Sair',

    bonusCreditsBannerPrefix: '🎁 Você tem',
    bonusCreditsBannerSuffix: 'Crédito(s) de Pasta Grátis (Recompensa) — Clique em "⬇️ BAIXAR .ZIP" em qualquer pasta!',
    chooseYourFolderLink: 'Escolher Pasta',

    heroEyebrow: 'Coleção DJ & Fãs 2026 · Packs .ZIP prontos para VirtualDJ',
    heroTitle: 'Pastas de Músicas VIP .ZIP para DJs e Apaixonados por Música',
    heroSubtitlePrefix: 'Cada pasta',
    heroSubtitleSuffix: 'contém músicas organizadas em ordem prontas para baixar. Insira sua Chave VIP para desbloquear todas.',
    downloadZipsHeroBtn: 'Baixar .ZIPs',
    unlockWithVipBtn: 'Desbloquear com Chave VIP',
    buyVipKeyBtn: 'Comprar Chave VIP',

    catalogTitle: (activeCount, comingCount) =>
      `Todas as Pastas .ZIP (${activeCount} Disponíveis · ${comingCount} Em Breve)`,
    catalogSubtitlePrefix: 'Cada pacote é uma pasta',
    catalogSubtitleSuffix: 'completa com todas as faixas numeradas em ordem prontas para download.',
    searchPlaceholder: 'Buscar pastas, estilos, artistas ou músicas (ex: Rabòday, Drill, Klass)...',
    searchAriaLabel: 'Buscar pastas ou músicas',
    clearSearchAria: 'Limpar busca',
    micStartAria: 'Busca por voz (🎙️)',
    micStopAria: 'Parar microfone',
    micStopLabel: 'Parar',
    micVoiceLabel: 'Voz',
    micListeningText: '🎙️ Fale agora...',
    micUnsupportedText: 'Microfone não suportado neste navegador — digite sua busca',
    micPermissionDeniedText: 'Permissão de microfone negada — libere o microfone ou digite sua busca',
    micNoSpeechText: 'Nenhuma voz detectada — toque em 🎙️ para tentar novamente ou digite',
    micUnavailableText: 'Microfone indisponível agora — digite sua busca',
    searchResultsPrefix: 'Resultados para',
    foldersFoundWord: 'pastas',
    andWord: 'e',
    tracksMatchWord: 'músicas encontradas',
    availableNowBadge: (label) => `✅ DISPONÍVEL AGORA (${label} Pastas .ZIP Prontas)`,
    emptyCatalogText: 'Nenhuma pasta .ZIP disponível para download no momento.',
    emptySearchText: (q) => `Nenhuma pasta ou música encontrada para « ${q} ».`,
    resetSearchBtn: 'Limpar Busca',
    tracksWord: 'Músicas',
    tracksFoundBadge: (count) => `🎵 ${count} músicas encontradas`,
    moreTracksWord: (count) => `(+${count} outras)`,
    preparingZipBtn: 'Preparando .ZIP...',
    downloadZipBtn: '⬇️ BAIXAR .ZIP',
    enterVipToDownloadBtn: '🔒 Inserir Chave VIP para Baixar',
    trendingBadgePrefix: '🔥 EM ALTA NO SEU PAÍS ·',
    trendingTitle: (label) => `🔥 EM ALTA NO SEU PAÍS (${label} Pastas .ZIP Em Breve)`,
    trendingSubtitlePrefix: 'Os pacotes mais pedidos para',
    trendingSubtitleSuffix: 'Clique em « 🔔 Pedir Este Pacote » para avisar o DJ Wesley qual lançar primeiro (não gasta créditos VIP!).',
    emptyTrendingSearch: (q) => `Nenhum pacote futuro encontrado para « ${q} ».`,
    comingSoonPill: 'EM BREVE',
    requestSentBtn: '✅ Pedido Enviado (Pedir Novamente)',
    sendingRequestBtn: 'Enviando pedido...',
    requestPackBtn: '🔔 Pedir Este Pacote',
    requestSentToast: '✅ Pedido enviado para DJ Wesley! Lançaremos este pacote em breve.',

    howTitle: 'Como Funciona em 3 Etapas',
    step1Tag: '01. Compra Automática',
    step1Title: 'Pague Online ou Use Código Pré-Pago',
    step1Desc: 'Escolha seu plano (10, 21, 36, 55 Pastas ou VIP Ilimitado) e pague com Cartão, Apple Pay ou USDT Cripto para receber sua Chave VIP automaticamente.',
    step2Tag: '02. Desbloqueie',
    step2Title: 'Insira sua Chave VIP',
    step2Desc: 'Digite seu código curto (ex: W#84K2) para liberar os botões verdes « ⬇️ BAIXAR .ZIP » em todas as pastas.',
    step3Tag: '03. Baixe o .ZIP',
    step3Title: 'Pronto para VirtualDJ 8 / 2024+',
    step3Desc: 'Cada pasta .ZIP traz MP3 numerados em ordem, 000 - PLAYLIST_VIRTUALDJ.m3u e VIRTUALDJ_IMPORT_DATABASE.xml.',

    footerRights: (year) => `© ${year} WESLEY MUSIC PACKS (by DJ WESLEY). Todos os direitos reservados.`,

    gateEyebrow: 'WESLEY MUSIC PACKS · ACESSO VISITANTE',
    gateTitle: '🎧 Bem-vindo! Preencha Seus Dados',
    gateSubtitle: 'Digite seu nome completo, escolha seu país e idioma, e informe um número de telefone válido para entrar no catálogo.',
    gateLanguageLabel: '🌐 Escolha Seu Idioma / Select Language',
    gateFullNameLabel: '👤 Nome Completo',
    gateFullNamePlaceholder: 'Ex: Lucas Silva',
    gateCountryLabel: '🌍 Seu País',
    gateCodeWord: 'Código',
    gatePhoneLabel: '📱 Número de Telefone',
    gatePhoneValidPrefix: 'Número válido para',
    gatePhoneExamplePrefix: 'Digite um número válido para',
    gatePhoneExampleWord: 'exemplo',
    gateSubmittingBtn: 'Verificando seu número...',
    gateSubmitBtn: '🚀 ENTRAR NO SITE AGORA',
    gatePrivacyNote: '🔒 Seus dados são protegidos apenas para verificação de clientes.',
    gateInvalidPhoneFallback: (countryName, dialCode) =>
      `⚠️ Este número de telefone não é válido para ${countryName} (+${dialCode}). Digite um número válido.`,

    modalCloseAria: 'Fechar janela',
    chooseZipModalTitle: 'Escolha uma Pasta .ZIP para Baixar',
    activeCodeModalDesc: (code) =>
      `Chave ${code} ativa. Clique em qualquer pasta para baixar o .ZIP (1 Crédito).`,
    comingSoonOrderLabel: '⏳ EM BREVE',
    orderedTracksLabel: (count) => `${count} Músicas em Ordem`,
    notAvailableYetBadge: '⏳ Ainda Indisponível',
    viewAllFoldersOnSite: 'Ver todas as pastas .ZIP no site',
    haveVipKeyHeading: '🔑 TEM UMA CHAVE VIP / CÓDIGO PRÉ-PAGO?',
    enterCodeForFolderDesc: (filename) => `Insira seu código para baixar ${filename}.`,
    enterCodeGeneralDesc: 'Insira sua Chave VIP ou Código Pré-Pago abaixo para desbloquear todas as pastas .ZIP agora.',
    vipKeyPlaceholder: 'Digite sua Chave VIP aqui... ex: W#84K2',
    verifyingVipBtn: '⏳ Verificando Chave VIP...',
    unlockVipAccessBtn: '🔓 DESBLOQUEAR ACESSO VIP AGORA',
    orDivider: '— OU ENTÃO —',
    buyVipOnlineHeading: '🛒 COMPRAR CHAVE VIP AUTOMÁTICA ONLINE',
    pricesForLabel: 'Preços para',
    popularBadge: 'POPULAR',
    payNatcashBtn: (label, price) => `⚡ PAGAR COM NATCASH (${label} · ${price})`,
    payCardBtn: (label, usdt) => `💳 Pagar com Visa / Mastercard / Apple Pay (${label} · ${usdt} USDT)`,
    haitiCheckoutFootnote: '🇭🇹 Haiti: Pague direto com Natcash (+509 56568810) e receba sua Chave VIP na hora na tela!',
    intlCheckoutFootnote: (flag) =>
      `🌐 Internacional (${flag}): Pague com Visa / Mastercard / Apple Pay ou envie USDT (TRC20) e receba sua Chave VIP na hora!`,
    browseFoldersFirstBtn: '👀 Ver Pastas .ZIP Antes',
    expiredKeyError: '🚫 ESTE CÓDIGO JÁ FOI USADO / EXPIRADO',

    planFinishedHeading: '⏰ SEU PLANO ACABOU!',
    exhaustedKeyInfo: (code) => `Chave: ${code} · 0 Pastas .ZIP restantes`,
    planFinishedDesc: 'Você baixou todas as pastas .ZIP do seu plano. Escolha um novo plano abaixo ou insira um Código Pré-Pago!',
    enterNewVipKeyBtn: '🔑 Inserir Nova Chave VIP / Código Pré-Pago',
    intlUsdtFootnote: (flag) =>
      `🌐 Internacional (${flag}): Pague online com USDT (TRC20) para receber sua Chave VIP na hora!`,

    natcashDirectTag: 'NATCASH DIRETO',
    cardIntlTag: 'CARTÃO VISA / APPLE PAY / USDT',
    usdtDirectTag: 'USDT (TRC20) INSTANTÂNEO',
    amountToPayLabel: 'Valor a Pagar:',
    sendNatcashInstruction: 'Envie seu pagamento Natcash para este número:',
    numberCopiedBtn: '✔ Número Copiado!',
    copyNatcashBtn: '📋 Copiar Número Natcash',
    pasteNatcashSmsLabel: '📋 Cole o SMS Completo de Confirmação Natcash Aqui',
    pasteBtn: '📋 Colar SMS',
    pastedFeedback: '✔ SMS Colado!',
    natcashSmsPlaceholder: 'Cole aqui a mensagem completa de confirmação Natcash recebida...',
    optionalPhoneLabel: 'Seu Telefone (Opcional)',
    verifyingNatcashBtn: 'Verificando SMS Natcash...',
    verifyNatcashBtn: '⚡ VERIFICAR SMS NATCASH & RECEBER CHAVE VIP',
    chooseAnotherPlanLink: 'Escolher outro plano',
    vipAppearsOnScreenNote: 'Chave VIP aparece na tela',
    cardTabBtn: '💳 VISA / MASTERCARD / APPLE PAY',
    usdtTabBtn: '⚡ ENVIAR USDT DIRETO (TRC20)',
    cardAmountLabel: 'Valor no Cartão',
    payWithCardNowBtn: '💳 PAGAR COM VISA / APPLE PAY AGORA',
    otherCardGatewayBtn: '🌐 Outro Gateway de Cartão (Paybis)',
    cardStep1: 'Pague com seu cartão Visa/Mastercard ou Apple Pay na janela que abrir.',
    cardStep2: 'Cole o código de confirmação / TxID abaixo para liberar sua Chave VIP na hora!',
    exactAmountUsdtLabel: 'Valor Exato a Enviar',
    usdtAddressLabel: 'Endereço USDT (TRC20) Trust Wallet:',
    usdtAddressCopiedBtn: '✔ Endereço USDT Copiado!',
    copyUsdtAddressBtn: '📋 Copiar Endereço USDT (TRC20)',
    txIdPlaceholder: 'Cole o TxID / Hash TRON de 64 caracteres aqui...',
    verifyingTronBtn: 'Verificando na TRON (TRC20)...',
    savingTxBtn: 'Salvando TxID...',
    verifyPayUnlockBtn: '⚡ VERIFICAR PAGAMENTO & LIBERAR CHAVE VIP',
    tronVerificationNote: 'Verificação TronGrid + VIP',
    orderRegisteredTag: (id) => `⏳ PEDIDO #${id} REGISTRADO`,
    verifyingWaitHeading: '⏳ Verificando seu pagamento... Sua Chave VIP aparecerá aqui automaticamente!',
    verifyingWaitDesc: 'Mantenha esta janela aberta — assim que o pagamento for confirmado, sua Chave VIP aparecerá em tempo real!',
    planLabel: 'Plano:',
    amountLabel: 'Valor:',
    methodLabel: 'Método:',
    phoneLabel: 'Telefone:',
    recheckingNatcashBtn: 'Re-verificando transação...',
    recheckNatcashBtn: '🔄 Re-verificar Minha Transação',
    modifyOrRetryPaymentLink: 'Editar TxID ou Enviar Outro Pagamento',
    paymentRejectedHeading: (txId) => `O pagamento #${txId} não pôde ser validado.`,
    paymentRejectedDesc: 'Verifique o código da transação ou valor e tente novamente.',
    tryAgainBtn: 'Tentar Novamente',
    verifiedTronTag: '⚡ Confirmado Automaticamente na TRON (TRC20)',
    verifiedVipTag: '✔ Validado pelo Sistema VIP Wesley Music',
    hereIsYourVipKeyHeading: '🎉 AQUI ESTÁ SUA CHAVE VIP!',
    unlimitedInfinityLabel: '♾️ Acesso Ilimitado Infinito',
    foldersZipCountLabel: (count) => `${count} Pastas .ZIP`,
    oneTimeSecretKeyLabel: 'Sua Chave Secreta VIP (Uso Único)',
    copiedShortBtn: 'Copiado!',
    copyKeyBtn: '📋 Copiar Chave',
    unlockingBtn: 'Liberando acesso VIP...',
    unlockAllFoldersNowBtn: '🔓 DESBLOQUEAR TODAS AS PASTAS .ZIP AGORA',
    pasteEmptyError: 'Sua área de transferência está vazia — copie o SMS antes ou pressione longo no campo para colar.',
    pasteBlockedError: 'O navegador bloqueou a colagem automática — pressione longo no campo e toque em Colar.',
    recheckPendingFallback: 'O recibo ainda não foi confirmado — verifique o código ou tente novamente em alguns segundos.',
    invalidOrUsedKeyError: 'Esta chave é inválida ou já foi utilizada.',

    referralPersonalCodeLabel: 'Seu Código de Indicação:',
    referralHeading: '🎁 COMPARTILHE & GANHE 1 PASTA GRÁTIS',
    referralDesc: (regGoal, purGoal) =>
      `Convide ${regGoal} pessoas para se cadastrarem com telefone pelo seu link e pelo menos ${purGoal} comprarem um plano VIP para ganhar 1 Pasta .ZIP GRÁTIS na hora!`,
    referralFreeCreditsReady: (count) => `🎁 ${count} Crédito(s) Grátis Pronto(s)!`,
    referralRefreshBtn: 'Atualizar',
    referralPersonalLinkLabel: 'Seu Link Pessoal de Compartilhamento',
    referralCopyLinkBtn: '📋 Copiar Meu Link',
    referralLinkCopiedBtn: '✔ Link Copiado!',
    referralLinkCopiedToast: '📋 Link copiado! Compartilhe com seus amigos.',
    referralShareWhatsAppBtn: '📲 Compartilhar no WhatsApp',
    referralShareTikTokBtn: '📲 Compartilhar WhatsApp / TikTok',
    referralCopiedTikTokBtn: '✔ Copiado para TikTok!',
    referralCopiedTikTokToast: '📲 Mensagem + link copiados para WhatsApp / TikTok!',
    referralRegisteredTitle: 'Amigos Cadastrados pelo Seu Link',
    referralRegisteredDone: (goal) => `✅ Meta de ${goal} cadastros concluída!`,
    referralRegisteredLeft: (left) => `Faltam ${left} pessoas únicas se cadastrarem com telefone.`,
    referralBuyersTitle: 'Indicados que Compraram Plano VIP',
    referralBuyersDone: (goal) => `✅ Meta de ${goal} compradores VIP concluída!`,
    referralBuyersLeft: (left) => `Faltam ${left} indicados comprarem um plano VIP.`,
    referralUnlockNote: (regGoal, purGoal) =>
      `O botão de recompensa desbloqueia automaticamente quando os dois contadores completarem (${regGoal}/${regGoal} e ${purGoal}/${purGoal}).`,
    referralClaimingBtn: '⏳ Liberando 1 Pasta Grátis...',
    referralClaimBtn: '🎁 Resgatar 1 Crédito Grátis',
    referralClaimedActive: (count) =>
      `🎉 Você tem ${count} Crédito(s) Grátis ativo(s)! Role até o catálogo e clique em "⬇️ BAIXAR .ZIP".`,
    referralClaimedUsed: '✅ Sua recompensa de 1 Pasta Grátis já foi resgatada e usada. Obrigado!',
    referralDownloadFreeBtn: 'Baixar .ZIP Grátis',
    referralClaimSuccessToast: '🎁 Parabéns! Você ganhou +1 Crédito Grátis! Clique em qualquer pacote para baixar.',
    referralClaimErrorFallback: 'Não foi possível resgatar o crédito grátis agora.',
    referralShareText: (url) =>
      `🎧 Baixe as melhores Pastas Musicais .ZIP (Konpa, Rabòday, Afrobeats, Hip-Hop) no WESLEY MUSIC PACKS! Cadastre-se pelo meu link: ${url}`,

    downloadLaunchedToast: '✅ Download Iniciado! Confira sua pasta de Downloads.',
    preparingZipOverlay: (current, total, percent) =>
      `📥 Preparando .ZIP... ${current} / ${total} (${percent}%)`,
    savedToDownloadsNote: 'O arquivo .ZIP foi salvo na sua pasta de Downloads.',
    clickIfNotStartedBtn: '⬇️ Clique Aqui Se Não Começou',
    vipUnlockedUnlimitedToast: '👑 Acesso VIP Ilimitado desbloqueado para todo o catálogo!',
    vipUnlockedCreditsToast: (remaining, total) =>
      `Acesso VIP desbloqueado! Créditos: ${remaining} / ${total} Pastas`,

    installOnPhoneBtn: 'Instalar App',
    addToIphoneBtn: 'Adicionar ao iPhone',
    iosGuideTitle: 'Adicionar Wesley Music à Tela do iPhone',
    iosGuideSubtitle: 'Abrir em tela cheia sem barra do Safari',
    iosGuideStep1: '1. Toque no botão Compartilhar no centro inferior do Safari.',
    iosGuideStep2: '2. Role para baixo e toque em Adicionar à Tela de Início.',
    iosGuideConfirmBtn: 'Entendi',

    virtualDjCardBadge: '🎁 BÔNUS GRÁTIS: VirtualDJ Grátis no Plano 1.000 HTG / $20+',
    virtualDjDefaultTitle: 'VirtualDJ Pro PC/Mac — Bônus VIP',
    virtualDjLockedMsg: '🔒 Escolha um plano ≥ 1.000 HTG (ou ≥ $20 USD / €20) para liberar o VirtualDJ GRÁTIS!',
    virtualDjLockedCtaBtn: '🔓 Liberar com Plano $20+',
    virtualDjUnlockedBadge: '✅ LIBERADO NO SEU PLANO VIP',
    virtualDjDownloadBtn: '⬇️ BAIXAR VIRTUALDJ GRÁTIS',
    virtualDjPendingLinkBtn: '⏳ O admin está preparando o arquivo VirtualDJ...',
    virtualDjDownloadStartedToast: '⬇️ Download do VirtualDJ Grátis iniciado!',
    virtualDjIncludedCheckoutNote: '🎁 BÔNUS INCLUSO: Este plano libera o VirtualDJ Grátis na hora!',
  },

  ar: {
    navFolders: 'مجلدات .ZIP',
    navHowItWorks: 'كيف يعمل',
    navAdmin: 'إدارة VIP',
    vipUnlimitedShort: '👑 VIP غير محدود',
    folderCreditsRemainingLabel: '📁 رصيد المجلدات المتبقي:',
    folderWord: 'مجلدات',
    enterVipKeyBtn: 'أدخل مفتاح VIP',
    vipKeyShortBtn: 'مفتاح VIP',
    changeVipKeyBtn: 'تغيير مفتاح VIP',
    changeCodeShortBtn: 'تغيير الرمز',
    vipUnlimitedActiveBanner: '👑 اشتراك VIP غير محدود نشط (كل الكتالوج)',
    languageSwitcherLabel: 'اللغة',

    adminModeActive: '👑 وضع الإدارة نشط (تحميل مجاني غير محدود)',
    adminVisitorPreview: '🔒 معاينة الزائر (اضغط لتفعيل وضع الإدارة المجاني)',
    openAdminPanel: 'فتح لوحة الإدارة',
    logoutAdmin: 'تسجيل الخروج',

    bonusCreditsBannerPrefix: '🎁 لديك',
    bonusCreditsBannerSuffix: 'رصيد مجلد مجاني (مكافأة الدعوة) — اضغط على "⬇️ تحميل .ZIP" لأي مجلد!',
    chooseYourFolderLink: 'اختر مجلدك',

    heroEyebrow: 'مجموعة DJ ومحبي الموسيقى 2026 · باقات .ZIP جاهزة لـ VirtualDJ',
    heroTitle: 'مجلدات موسيقى VIP .ZIP لمنسقي الأغاني وعشاق الموسيقى',
    heroSubtitlePrefix: 'كل مجلد',
    heroSubtitleSuffix: 'يحتوي على مقاطع مرتبة جاهزة للتحميل. أدخل مفتاح VIP لفتح جميع الباقات.',
    downloadZipsHeroBtn: 'تحميل .ZIP',
    unlockWithVipBtn: 'افتح بمفتاح VIP',
    buyVipKeyBtn: 'شراء مفتاح VIP',

    catalogTitle: (activeCount, comingCount) =>
      `جميع مجلدات .ZIP (${activeCount} متاح · ${comingCount} قريباً)`,
    catalogSubtitlePrefix: 'كل باقة عبارة عن مجلد',
    catalogSubtitleSuffix: 'كامل يضم جميع الأغاني مرقمة بالترتيب وجاهزة للتحميل.',
    searchPlaceholder: 'ابحث عن مجلد، نوع موسيقى، فنان أو اسم أغنية...',
    searchAriaLabel: 'ابحث عن مجلد أو أغنية',
    clearSearchAria: 'مسح البحث',
    micStartAria: 'البحث بالصوت (🎙️)',
    micStopAria: 'إيقاف الميكروفون',
    micStopLabel: 'إيقاف',
    micVoiceLabel: 'صوت',
    micListeningText: '🎙️ تحدث الآن...',
    micUnsupportedText: 'الميكروفون غير مدعوم في هذا المتصفح — اكتب بحثك يدوياً',
    micPermissionDeniedText: 'تم رفض إذن الميكروفون — اسمح بالوصول أو اكتب بحثك',
    micNoSpeechText: 'لم يتم سماع صوت — اضغط 🎙️ للمحاولة مجدداً أو اكتب بحثك',
    micUnavailableText: 'الميكروفون غير متاح حالياً — اكتب بحثك',
    searchResultsPrefix: 'نتائج البحث عن',
    foldersFoundWord: 'مجلدات',
    andWord: 'و',
    tracksMatchWord: 'أغنية مطابقة',
    availableNowBadge: (label) => `✅ متاح الآن (${label} مجلد .ZIP جاهز)`,
    emptyCatalogText: 'لا توجد مجلدات .ZIP جاهزة للتحميل حالياً.',
    emptySearchText: (q) => `لا توجد مجلدات أو أغاني مطابقة لـ « ${q} ».`,
    resetSearchBtn: 'مسح البحث',
    tracksWord: 'أغاني',
    tracksFoundBadge: (count) => `🎵 ${count} أغنية مطابقة`,
    moreTracksWord: (count) => `(+${count} أخرى)`,
    preparingZipBtn: 'جاري تجهيز .ZIP...',
    downloadZipBtn: '⬇️ تحميل .ZIP',
    enterVipToDownloadBtn: '🔒 أدخل مفتاح VIP للتحميل',
    trendingBadgePrefix: '🔥 الأكثر طلباً في بلدك ·',
    trendingTitle: (label) => `🔥 الأكثر طلباً في بلدك (${label} باقة قيد التحضير)`,
    trendingSubtitlePrefix: 'الباقات القادمة الأكثر طلباً في',
    trendingSubtitleSuffix: 'اضغط على « 🔔 اطلب هذه الباقة » لإخبار DJ Wesley أي باقة ينشرها أولاً (بدون خصم أي رصيد!).',
    emptyTrendingSearch: (q) => `لا توجد باقات قادمة مطابقة لـ « ${q} ».`,
    comingSoonPill: 'قريباً',
    requestSentBtn: '✅ تم إرسال الطلب',
    sendingRequestBtn: 'جاري الإرسال...',
    requestPackBtn: '🔔 اطلب هذه الباقة',
    requestSentToast: '✅ تم إرسال طلبك إلى DJ Wesley! سننشر هذه الباقة قريباً.',

    howTitle: 'كيف يعمل الموقع في 3 خطوات',
    step1Tag: '01. شراء تلقائي',
    step1Title: 'ادفع أونلاين أو استخدم بطاقة مسبقة الدفع',
    step1Desc: 'اختر الباقة المناسبة (10، 21، 36، 55 مجلداً أو VIP غير محدود) وادفع بالبطاقة أو USDT لاستلام مفتاح VIP تلقائياً.',
    step2Tag: '02. التفعيل',
    step2Title: 'أدخل مفتاح VIP',
    step2Desc: 'أدخل الرمز القصير (مثل W#84K2) لفتح أزرار « ⬇️ تحميل .ZIP » على جميع المجلدات.',
    step3Tag: '03. التحميل .ZIP',
    step3Title: 'جاهز لـ VirtualDJ 8 / 2024+',
    step3Desc: 'كل مجلد .ZIP يحتوي على ملفات MP3 مرتبة مع قوائم تشغيل VirtualDJ جاهزة.',

    footerRights: (year) => `© ${year} WESLEY MUSIC PACKS (by DJ WESLEY). جميع الحقوق محفوظة.`,

    gateEyebrow: 'WESLEY MUSIC PACKS · بوابة الزوار',
    gateTitle: '🎧 أهلاً بك! أدخل بياناتك',
    gateSubtitle: 'أدخل اسمك الكامل، واختر بلدك ولغتك، ثم أدخل رقم هاتف صالحاً لبلدك للدخول إلى الكتالوج.',
    gateLanguageLabel: '🌐 اختر لغتك / Select Language',
    gateFullNameLabel: '👤 الاسم الكامل',
    gateFullNamePlaceholder: 'مثال: أحمد محمد',
    gateCountryLabel: '🌍 بلدك',
    gateCodeWord: 'الرمز',
    gatePhoneLabel: '📱 رقم الهاتف',
    gatePhoneValidPrefix: 'رقم صالح لدولة',
    gatePhoneExamplePrefix: 'أدخل رقماً صحيحاً لدولة',
    gatePhoneExampleWord: 'مثال',
    gateSubmittingBtn: 'جاري التحقق من الرقم...',
    gateSubmitBtn: '🚀 الدخول إلى الموقع الآن',
    gatePrivacyNote: '🔒 بياناتك محمية ومخصصة للتحقق من العملاء فقط.',
    gateInvalidPhoneFallback: (countryName, dialCode) =>
      `⚠️ رقم الهاتف غير متوافق مع دولة ${countryName} (+${dialCode}). يرجى إدخال رقم هاتف صحيح.`,

    modalCloseAria: 'إغلاق النافذة',
    chooseZipModalTitle: 'اختر مجلد .ZIP للتحميل',
    activeCodeModalDesc: (code) =>
      `الرمز ${code} نشط. اضغط على أي مجلد لتحميل ملف .ZIP (1 رصيد مجلد).`,
    comingSoonOrderLabel: '⏳ قريباً',
    orderedTracksLabel: (count) => `${count} أغنية مرتبة`,
    notAvailableYetBadge: '⏳ غير متاح بعد',
    viewAllFoldersOnSite: 'عرض جميع مجلدات .ZIP في الموقع',
    haveVipKeyHeading: '🔑 هل لديك مفتاح VIP / بطاقة مسبقة الدفع؟',
    enterCodeForFolderDesc: (filename) => `أدخل رمزك لتحميل ${filename}.`,
    enterCodeGeneralDesc: 'أدخل مفتاح VIP أو الرمز المسبق الدفع أدناه لفتح جميع المجلدات فوراً.',
    vipKeyPlaceholder: 'أدخل مفتاح VIP هنا... مثال: W#84K2',
    verifyingVipBtn: '⏳ جاري التحقق من المفتاح...',
    unlockVipAccessBtn: '🔓 تفعيل وصول VIP الآن',
    orDivider: '— أو —',
    buyVipOnlineHeading: '🛒 شراء مفتاح VIP تلقائياً عبر الإنترنت',
    pricesForLabel: 'الأسعار لدولة',
    popularBadge: 'الأكثر طلباً',
    payNatcashBtn: (label, price) => `⚡ الدفع عبر NATCASH (${label} · ${price})`,
    payCardBtn: (label, usdt) => `💳 الدفع ببطاقة Visa / Mastercard / Apple Pay (${label} · ${usdt} USDT)`,
    haitiCheckoutFootnote: '🇭🇹 هايتي: ادفع مباشرة عبر Natcash (+509 56568810) واستلم مفتاح VIP فوراً على الشاشة!',
    intlCheckoutFootnote: (flag) =>
      `🌐 دولي (${flag}): ادفع عبر Visa / Mastercard / Apple Pay أو أرسل USDT (TRC20) للحصول على مفتاح VIP فوراً!`,
    browseFoldersFirstBtn: '👀 تصفح مجلدات .ZIP أولاً',
    expiredKeyError: '🚫 هذا الرمز مستخدم بالفعل أو منتهي الصلاحية',

    planFinishedHeading: '⏰ انتهت باقتك!',
    exhaustedKeyInfo: (code) => `المفتاح: ${code} · 0 مجلدات متبقية`,
    planFinishedDesc: 'لقد قمت بتحميل جميع المجلدات في باقتك. اختر باقة جديدة أدناه أو أدخل مفتاحاً جديداً!',
    enterNewVipKeyBtn: '🔑 إدخال مفتاح VIP جديد',
    intlUsdtFootnote: (flag) =>
      `🌐 دولي (${flag}): ادفع عبر USDT (TRC20) لاستلام مفتاح VIP فوراً على الشاشة!`,

    natcashDirectTag: 'NATCASH مباشر',
    cardIntlTag: 'فيزا / APPLE PAY / USDT',
    usdtDirectTag: 'USDT (TRC20) فوري',
    amountToPayLabel: 'المبلغ المطلوب:',
    sendNatcashInstruction: 'أرسل دفعة Natcash إلى هذا الرقم:',
    numberCopiedBtn: '✔ تم نسخ الرقم!',
    copyNatcashBtn: '📋 نسخ رقم Natcash',
    pasteNatcashSmsLabel: '📋 الصق رسالة تأكيد Natcash الكاملة هنا',
    pasteBtn: '📋 لصق الرسالة',
    pastedFeedback: '✔ تم اللصق!',
    natcashSmsPlaceholder: 'الصق رسالة تأكيد Natcash الكاملة هنا...',
    optionalPhoneLabel: 'رقم هاتفك (اختياري)',
    verifyingNatcashBtn: 'جاري التحقق من رسالة Natcash...',
    verifyNatcashBtn: '⚡ تحقق من Natcash واستلم مفتاح VIP',
    chooseAnotherPlanLink: 'اختر باقة أخرى',
    vipAppearsOnScreenNote: 'يظهر مفتاح VIP على الشاشة',
    cardTabBtn: '💳 VISA / MASTERCARD / APPLE PAY',
    usdtTabBtn: '⚡ إرسال USDT مباشر (TRC20)',
    cardAmountLabel: 'المبلغ بالبطاقة',
    payWithCardNowBtn: '💳 ادفع الآن ببطاقة VISA / APPLE PAY',
    otherCardGatewayBtn: '🌐 بوابة بطاقة بديلة (Paybis)',
    cardStep1: 'أكمل الدفع ببطاقة Visa/Mastercard أو Apple Pay في النافذة المفتوحة.',
    cardStep2: 'الصق رمز التأكيد / TxID أدناه لتفعيل مفتاح VIP فوراً!',
    exactAmountUsdtLabel: 'المبلغ الدقيق للإرسال',
    usdtAddressLabel: 'عنوان محفظة USDT (TRC20) Trust Wallet:',
    usdtAddressCopiedBtn: '✔ تم نسخ العنوان!',
    copyUsdtAddressBtn: '📋 نسخ عنوان USDT (TRC20)',
    txIdPlaceholder: 'الصق رمز المعاملة TxID / Hash (64 حرفاً) هنا...',
    verifyingTronBtn: 'جاري التحقق عبر TRON (TRC20)...',
    savingTxBtn: 'جاري حفظ TxID...',
    verifyPayUnlockBtn: '⚡ تحقق من الدفع وافتح مفتاح VIP',
    tronVerificationNote: 'تحقق TronGrid + VIP',
    orderRegisteredTag: (id) => `⏳ تم تسجيل الطلب #${id}`,
    verifyingWaitHeading: '⏳ جاري التحقق من الدفع... سيظهر مفتاح VIP هنا تلقائياً!',
    verifyingWaitDesc: 'اترك هذه النافذة مفتوحة — فور تأكيد الدفع سيظهر مفتاح VIP مباشرة!',
    planLabel: 'الباقة:',
    amountLabel: 'المبلغ:',
    methodLabel: 'الطريقة:',
    phoneLabel: 'الهاتف:',
    recheckingNatcashBtn: 'جاري إعادة التحقق...',
    recheckNatcashBtn: '🔄 إعادة التحقق من معاملتي',
    modifyOrRetryPaymentLink: 'تعديل رمز المعاملة أو إرسال دفعة أخرى',
    paymentRejectedHeading: (txId) => `تعذر التحقق من الدفع #${txId}.`,
    paymentRejectedDesc: 'يرجى التأكد من رمز المعاملة والمبلغ والمحاولة مرة أخرى.',
    tryAgainBtn: 'حاول مرة أخرى',
    verifiedTronTag: '⚡ تم التأكيد تلقائياً عبر TRON (TRC20)',
    verifiedVipTag: '✔ موثق من نظام Wesley Music VIP',
    hereIsYourVipKeyHeading: '🎉 ها هو مفتاح VIP الخاص بك!',
    unlimitedInfinityLabel: '♾️ وصول غير محدود',
    foldersZipCountLabel: (count) => `${count} مجلدات .ZIP`,
    oneTimeSecretKeyLabel: 'مفتاح VIP السري الخاص بك (للمرة الواحدة)',
    copiedShortBtn: 'تم النسخ!',
    copyKeyBtn: '📋 نسخ المفتاح',
    unlockingBtn: 'جاري التفعيل...',
    unlockAllFoldersNowBtn: '🔓 افتح جميع مجلدات .ZIP الآن',
    pasteEmptyError: 'الحافظة فارغة — انسخ رسالة التأكيد أولاً أو الصقها يدوياً.',
    pasteBlockedError: 'منع المتصفح اللصق التلقائي — اضغط مطولاً داخل المربع واختر لصق.',
    recheckPendingFallback: 'لم يتم تأكيد الإيصال بعد — تحقق من الرمز أو حاول بعد ثوانٍ.',
    invalidOrUsedKeyError: 'هذا المفتاح غير صالح أو تم استخدامه مسبقاً.',

    referralPersonalCodeLabel: 'رمز الدعوة الخاص بك:',
    referralHeading: '🎁 شارك واربح مجلداً مجانياً',
    referralDesc: (regGoal, purGoal) =>
      `ادعُ ${regGoal} أشخاص للتسجيل بأرقام هواتفهم عبر رابطك، واشترِ ${purGoal} منهم باقة VIP لتحصل على مجلد .ZIP مجاني فوراً!`,
    referralFreeCreditsReady: (count) => `🎁 لديك ${count} رصيد مجاني جاهز!`,
    referralRefreshBtn: 'تحديث',
    referralPersonalLinkLabel: 'رابط المشاركة الخاص بك',
    referralCopyLinkBtn: '📋 نسخ الرابط',
    referralLinkCopiedBtn: '✔ تم نسخ الرابط!',
    referralLinkCopiedToast: '📋 تم نسخ الرابط! شاركه مع أصدقائك.',
    referralShareWhatsAppBtn: '📲 مشاركة على WhatsApp',
    referralShareTikTokBtn: '📲 مشاركة WhatsApp / TikTok',
    referralCopiedTikTokBtn: '✔ تم النسخ لـ TikTok!',
    referralCopiedTikTokToast: '📲 تم نسخ الرسالة والرابط لـ WhatsApp / TikTok!',
    referralRegisteredTitle: 'الأصدقاء المسجلون عبر رابطك',
    referralRegisteredDone: (goal) => `✅ اكتمل هدف ${goal} مسجلين!`,
    referralRegisteredLeft: (left) => `تبقى ${left} أشخاص للتسجيل برقم الهاتف.`,
    referralBuyersTitle: 'المشترون لباقات VIP',
    referralBuyersDone: (goal) => `✅ اكتمل هدف ${goal} مشترين VIP!`,
    referralBuyersLeft: (left) => `تبقى ${left} أشخاص لشراء باقة VIP.`,
    referralUnlockNote: (regGoal, purGoal) =>
      `يتم فتح زر المكافأة تلقائياً عند اكتمال العدادين (${regGoal}/${regGoal} و ${purGoal}/${purGoal}).`,
    referralClaimingBtn: '⏳ جاري تفعيل المجلد المجاني...',
    referralClaimBtn: '🎁 احصل على مجلد مجاني الآن',
    referralClaimedActive: (count) =>
      `🎉 لديك ${count} رصيد مجلد مجاني نشط! انزل للكتالوج واضغط "⬇️ تحميل .ZIP".`,
    referralClaimedUsed: '✅ تم استخدام مكافأة المجلد المجاني بالفعل. شكراً لمشاركتك!',
    referralDownloadFreeBtn: 'تحميل .ZIP مجاني',
    referralClaimSuccessToast: '🎁 تهانينا! حصلت على +1 مجلد مجاني! اضغط على أي باقة للتحميل.',
    referralClaimErrorFallback: 'تعذر المطالبة بالرصيد المجاني حالياً.',
    referralShareText: (url) =>
      `🎧 حمّل أفضل مجلدات الموسيقى .ZIP على WESLEY MUSIC PACKS! سجّل عبر رابطي الآن: ${url}`,

    downloadLaunchedToast: '✅ بدأ التحميل! تفقد مجلد التنزيلات.',
    preparingZipOverlay: (current, total, percent) =>
      `📥 جاري تجهيز .ZIP... ${current} / ${total} (${percent}%)`,
    savedToDownloadsNote: 'تم حفظ ملف .ZIP في مجلد التنزيلات.',
    clickIfNotStartedBtn: '⬇️ اضغط هنا إذا لم يبدأ التحميل',
    vipUnlockedUnlimitedToast: '👑 تم تفعيل اشتراك VIP غير المحدود لكل الكتالوج!',
    vipUnlockedCreditsToast: (remaining, total) =>
      `تم التفعيل! رصيد المجلدات: ${remaining} / ${total}`,

    installOnPhoneBtn: 'تثبيت التطبيق',
    addToIphoneBtn: 'إضافة إلى شاشة آيفون',
    iosGuideTitle: 'إضافة Wesley Music لشاشة آيفون',
    iosGuideSubtitle: 'فتح بملء الشاشة بدون شريط Safari',
    iosGuideStep1: '1. اضغط على زر المشاركة أسفل متصفح Safari.',
    iosGuideStep2: '2. مرر للأسفل واضغط على إضافة إلى الشاشة الرئيسية.',
    iosGuideConfirmBtn: 'فهمت',

    virtualDjCardBadge: '🎁 هدية مجانية: VirtualDJ مجاناً مع خطة 1,000 HTG / $20+',
    virtualDjDefaultTitle: 'VirtualDJ Pro PC/Mac — مكافأة VIP',
    virtualDjLockedMsg: '🔒 اختر خطة ≥ 1,000 HTG (أو ≥ 20 دولار) لفتح برنامج VirtualDJ مجاناً!',
    virtualDjLockedCtaBtn: '🔓 تفعيل مع خطة $20+',
    virtualDjUnlockedBadge: '✅ مفعّل لخطة VIP الخاصة بك',
    virtualDjDownloadBtn: '⬇️ تحميل VIRTUALDJ مجاناً',
    virtualDjPendingLinkBtn: '⏳ يقوم المسؤول بتجهيز ملف VirtualDJ...',
    virtualDjDownloadStartedToast: '⬇️ بدأ تحميل VirtualDJ المجاني!',
    virtualDjIncludedCheckoutNote: '🎁 مكافأة مشمولة: هذه الخطة تفتح VirtualDJ مجاناً فوراً!',
  },
};
