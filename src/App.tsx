import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Download,
  Lock,
  Unlock,
  KeyRound,
  FolderCheck,
  FolderArchive,
  LogOut,
  Clock,
  Zap,
  Bell,
  CheckCircle2,
  Flame,
  Trash2,
  Megaphone,
} from 'lucide-react';
import {
  ACTIVE_KEY_STORAGE_KEY,
  FolderPlan,
  MusicPack,
  VipKeyRecord,
  consumeFolderCreditRemote,
  deleteRemoteMusicPack,
  fetchRemoteMusicPacks,
  fetchVipKeyByCodeRemote,
  formatZipFolderFilename,
  getAllMusicPacks,
  getVipKeyByCode,
  subscribeMusicPacksRealtime,
  subscribeSingleVipKeyRealtime,
} from './data/musicPacks';
import { buildCleanMp3Zip } from './utils/id3Mp3Packager';
import { WelcomeVipModal } from './components/WelcomeVipModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { QuotaExhaustedModal } from './components/QuotaExhaustedModal';
import { DirectCheckoutModal } from './components/DirectCheckoutModal';
import { VisitorEntryGateModal } from './components/VisitorEntryGateModal';
import { ReferralProgramCard } from './components/ReferralProgramCard';
import { ZipFilenameText } from './components/ZipFilenameText';
import { PWAInstallButton } from './components/PWAInstallButton';
import { CountrySelector } from './components/CountrySelector';
import { CatalogSearchBar } from './components/CatalogSearchBar';
import { LanguageSelector } from './components/LanguageSelector';
import { useLanguage } from './contexts/LanguageContext';
import {
  getCountryByCode,
  loadSelectedCountryCode,
  saveSelectedCountryCode,
} from './data/countries';
import { buildCountryTrendingComingSoonPacks } from './data/trendingCatalog';
import {
  loadRequestedZipNames,
  submitPackRequestRemote,
} from './data/packRequests';
import {
  VisitorProfile,
  captureReferralCodeFromUrl,
  consumeVisitorBonusCreditRemote,
  loadSavedVisitorProfile,
  markCurrentVisitorPurchasedRemote,
  markVisitorOfflineKeepalive,
  sendVisitorHeartbeatRemote,
} from './data/visitors';
import {
  ACTIVE_CHECKOUT_ORDER_STORAGE_KEY,
  fetchPaymentOrderByIdRemote,
  getPaymentOrderById,
  loadActiveCheckoutOrderId,
  ORDERS_UPDATED_EVENT,
  PAYMENT_ORDERS_STORAGE_KEY,
  PaymentOrder,
  saveActiveCheckoutOrderId,
  subscribePaymentOrderByIdRealtime,
} from './data/paymentOrders';
import {
  SiteAnnouncement,
  fetchSiteAnnouncementRemote,
  loadLocalSiteAnnouncement,
  subscribeSiteAnnouncementRealtime,
} from './data/siteAnnouncement';

const ADMIN_SESSION_STORAGE_KEY = 'wesley_admin_auth_session_v1';

function loadActiveKeyRecord(): VipKeyRecord | null {
  try {
    const code = window.localStorage.getItem(ACTIVE_KEY_STORAGE_KEY);
    if (!code) return null;
    const record = getVipKeyByCode(code);
    if (!record) return null;
    const isUnlimited = Boolean(record.isUnlimited) || record.totalFolders >= 999;
    if (!isUnlimited && (record.burned || record.remainingFolders <= 0)) {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

function loadAdminAuthenticatedFlag(): boolean {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const { t, autoSuggestLangForCountry } = useLanguage();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() =>
    loadAdminAuthenticatedFlag()
  );
  const [isAdminFreeMode, setIsAdminFreeMode] = useState<boolean>(() =>
    loadAdminAuthenticatedFlag()
  );
  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile | null>(() =>
    loadSavedVisitorProfile()
  );
  const [activeKey, setActiveKey] = useState<VipKeyRecord | null>(() => loadActiveKeyRecord());
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(
    () => Boolean(loadSavedVisitorProfile()) && !loadActiveKeyRecord() && !loadAdminAuthenticatedFlag()
  );
  const [pendingPack, setPendingPack] = useState<MusicPack | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [exhaustedKeyCode, setExhaustedKeyCode] = useState<string | null>(null);
  const [isExhaustedOpen, setIsExhaustedOpen] = useState<boolean>(false);
  const [colorVersion, setColorVersion] = useState<number>(0);
  const [customPacksVersion, setCustomPacksVersion] = useState<number>(0);
  const [packagingPackId, setPackagingPackId] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() =>
    loadSelectedCountryCode()
  );
  const [checkoutPlan, setCheckoutPlan] = useState<FolderPlan | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() =>
    loadActiveCheckoutOrderId()
  );
  const [isDirectCheckoutOpen, setIsDirectCheckoutOpen] = useState<boolean>(false);
  const [requestedZips, setRequestedZips] = useState<string[]>(() => loadRequestedZipNames());
  const [requestingZip, setRequestingZip] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [siteAnnouncement, setSiteAnnouncement] = useState<SiteAnnouncement>(() =>
    loadLocalSiteAnnouncement()
  );

  const handleSelectCountry = useCallback(
    (code: string) => {
      const saved = saveSelectedCountryCode(code);
      setSelectedCountryCode(saved);
      autoSuggestLangForCountry(saved, false);
      if (visitorProfile) {
        void sendVisitorHeartbeatRemote(visitorProfile, saved);
        setVisitorProfile((prev) => (prev ? { ...prev, countryCode: saved } : prev));
      }
    },
    [visitorProfile, autoSuggestLangForCountry]
  );

  // Capture ?ref=CODE referral parameter from URL immediately on arrival
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  // Real-time online presence heartbeat every 15 seconds + offline keepalive on tab close
  useEffect(() => {
    if (!visitorProfile) return;

    void sendVisitorHeartbeatRemote(visitorProfile, selectedCountryCode).then((synced) => {
      if (synced) setVisitorProfile(synced);
    });

    const intervalId = window.setInterval(() => {
      void sendVisitorHeartbeatRemote(visitorProfile, selectedCountryCode).then((synced) => {
        if (synced) setVisitorProfile(synced);
      });
    }, 15_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendVisitorHeartbeatRemote(visitorProfile, selectedCountryCode).then((synced) => {
          if (synced) setVisitorProfile(synced);
        });
      }
    };

    const handleUnload = () => {
      markVisitorOfflineKeepalive(visitorProfile.sessionId || visitorProfile.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [visitorProfile?.sessionId, visitorProfile?.id, selectedCountryCode]);

  const handleStartDirectCheckout = useCallback((plan: FolderPlan) => {
    saveActiveCheckoutOrderId(null);
    setActiveOrderId(null);
    setCheckoutPlan(plan);
    setIsWelcomeOpen(false);
    setIsExhaustedOpen(false);
    setIsDirectCheckoutOpen(true);
  }, []);

  // Fetch remote folders & track URLs from Supabase across all devices and listen for live updates
  useEffect(() => {
    let active = true;
    const syncRemoteCatalog = async () => {
      await fetchRemoteMusicPacks();
      if (active) {
        setCustomPacksVersion((v) => v + 1);
      }
    };

    void syncRemoteCatalog();
    const unsubscribePacks = subscribeMusicPacksRealtime(() => {
      void syncRemoteCatalog();
    });

    return () => {
      active = false;
      unsubscribePacks();
    };
  }, []);

  // Fetch & subscribe to storefront top announcement banner (Supabase + instant localStorage sync)
  useEffect(() => {
    let active = true;
    void fetchSiteAnnouncementRemote().then((res) => {
      if (active) {
        setSiteAnnouncement(res.announcement);
      }
    });
    const unsubscribeAnnouncement = subscribeSiteAnnouncementRealtime((updated) => {
      if (active) {
        setSiteAnnouncement(updated);
      }
    });
    return () => {
      active = false;
      unsubscribeAnnouncement();
    };
  }, []);

  const allPacks = useMemo(() => {
    void customPacksVersion;
    return getAllMusicPacks();
  }, [customPacksVersion]);

  const selectedCountry = useMemo(
    () => getCountryByCode(selectedCountryCode),
    [selectedCountryCode]
  );

  const availablePacks = useMemo(
    () => allPacks.filter((p) => !p.isComingSoon),
    [allPacks]
  );

  const trendingComingSoonPacks = useMemo(() => {
    const ownerComingSoon = allPacks.filter((p) => Boolean(p.isComingSoon));
    const existingKeys = new Set(
      allPacks.map((p) => p.title.toLowerCase().replace(/\.zip$/i, '').trim())
    );
    const dynamicCountryPacks = buildCountryTrendingComingSoonPacks(
      selectedCountryCode,
      existingKeys
    );
    return [...ownerComingSoon, ...dynamicCountryPacks];
  }, [allPacks, selectedCountryCode]);

  const normalizedCatalogQuery = useMemo(
    () =>
      catalogSearch
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim(),
    [catalogSearch]
  );

  const normalizeForSearch = useCallback((text?: string) => {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }, []);

  const matchingTracksByPackId = useMemo(() => {
    const map = new Map<string, MusicPack['tracks']>();
    if (!normalizedCatalogQuery) return map;
    for (const pack of availablePacks) {
      const matched = (pack.tracks || []).filter((track) => {
        const hay = normalizeForSearch(
          `${track.title || ''} ${track.artist || ''} ${track.name || ''} ${track.mixType || ''}`
        );
        return hay.includes(normalizedCatalogQuery);
      });
      if (matched.length > 0) {
        map.set(pack.id, matched);
      }
    }
    return map;
  }, [availablePacks, normalizedCatalogQuery, normalizeForSearch]);

  const filteredAvailablePacks = useMemo(() => {
    if (!normalizedCatalogQuery) return availablePacks;
    return availablePacks.filter((pack) => {
      const folderHay = normalizeForSearch(
        `${pack.title} ${pack.filename || ''} ${pack.genre} ${pack.subtitle}`
      );
      if (folderHay.includes(normalizedCatalogQuery)) return true;
      return matchingTracksByPackId.has(pack.id);
    });
  }, [availablePacks, normalizedCatalogQuery, normalizeForSearch, matchingTracksByPackId]);

  const filteredComingSoonPacks = useMemo(() => {
    if (!normalizedCatalogQuery) return trendingComingSoonPacks;
    return trendingComingSoonPacks.filter((pack) => {
      const hay = normalizeForSearch(
        `${pack.title} ${pack.filename || ''} ${pack.genre} ${pack.subtitle}`
      );
      return hay.includes(normalizedCatalogQuery);
    });
  }, [trendingComingSoonPacks, normalizedCatalogQuery, normalizeForSearch]);

  const totalMatchingTracksCount = useMemo(() => {
    let total = 0;
    for (const tracks of matchingTracksByPackId.values()) {
      total += tracks.length;
    }
    return total;
  }, [matchingTracksByPackId]);

  const activePacksCount = availablePacks.length;
  const comingSoonPacksCount = trendingComingSoonPacks.length;

  const [toastState, setToastState] = useState<{
    message: string;
    variant: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((msg: string, variant?: 'success' | 'error') => {
    const inferredVariant: 'success' | 'error' =
      variant ?? (msg.startsWith('❌') || msg.startsWith('⚠️') ? 'error' : 'success');
    setToastState({ message: msg, variant: inferredVariant });
    window.setTimeout(() => {
      setToastState((curr) => (curr?.message === msg ? null : curr));
    }, 5500);
  }, []);

  const handleRequestComingSoonPack = useCallback(
    async (pack: MusicPack) => {
      const zipFilename = formatZipFolderFilename(pack);
      setRequestingZip(zipFilename);
      await submitPackRequestRemote({
        packTitle: pack.title,
        zipFilename,
        genre: pack.genre,
        countryCode: selectedCountryCode,
      });
      setRequestingZip(null);
      setRequestedZips((prev) => (prev.includes(zipFilename) ? prev : [...prev, zipFilename]));
      showToast(t.requestSentToast);
    },
    [selectedCountryCode, showToast, t]
  );

  const syncActiveKeyFromStore = useCallback(() => {
    const code = window.localStorage.getItem(ACTIVE_KEY_STORAGE_KEY);
    if (!code) {
      setActiveKey(null);
      return;
    }
    void fetchVipKeyByCodeRemote(code).then((fresh) => {
      const isUnlimited = Boolean(fresh?.isUnlimited) || (fresh?.totalFolders ?? 0) >= 999;
      if (!fresh || (!isUnlimited && (fresh.burned || fresh.remainingFolders <= 0))) {
        window.localStorage.removeItem(ACTIVE_KEY_STORAGE_KEY);
        setActiveKey(null);
      } else {
        setActiveKey(fresh);
      }
    });
  }, []);

  // Subscribe to real-time Supabase changes on the buyer's active VIP Key
  // so credits & burned/exhausted lock stay exact across all devices
  useEffect(() => {
    const code = activeKey?.code;
    if (!code) return;

    void fetchVipKeyByCodeRemote(code).then((fresh) => {
      const isUnlimited = Boolean(fresh?.isUnlimited) || (fresh?.totalFolders ?? 0) >= 999;
      if (!fresh || (!isUnlimited && (fresh.burned || fresh.remainingFolders <= 0))) {
        window.localStorage.removeItem(ACTIVE_KEY_STORAGE_KEY);
        setActiveKey(null);
      } else {
        setActiveKey(fresh);
      }
    });

    const unsubscribeKey = subscribeSingleVipKeyRealtime(code, (updated) => {
      const isUnlimited = Boolean(updated?.isUnlimited) || (updated?.totalFolders ?? 0) >= 999;
      if (!updated || (!isUnlimited && (updated.burned || updated.remainingFolders <= 0))) {
        window.localStorage.removeItem(ACTIVE_KEY_STORAGE_KEY);
        setActiveKey(null);
        setExhaustedKeyCode(code);
        setIsExhaustedOpen(true);
      } else {
        setActiveKey(updated);
      }
    });

    return () => {
      unsubscribeKey();
    };
  }, [activeKey?.code]);

  // Automatically pop the generated short VIP Key straight onto the buyer's screen
  // in real time via Supabase Realtime the moment Admin VIP clicks "✔ Valide & Voye Kle VIP"
  useEffect(() => {
    const surfaceApprovedOrder = (order: PaymentOrder | null) => {
      if (order && order.status === 'approved' && order.issuedVipKey) {
        setActiveOrderId(order.id);
        setIsWelcomeOpen(false);
        setIsExhaustedOpen(false);
        setIsDirectCheckoutOpen(true);
        // Mark as surfaced so closing the modal won't forcefully re-open it later
        saveActiveCheckoutOrderId(null);
        void markCurrentVisitorPurchasedRemote().then((updated) => {
          if (updated) setVisitorProfile(updated);
        });
      }
    };

    const checkApprovedOrder = async () => {
      const pendingOrderId = loadActiveCheckoutOrderId();
      if (!pendingOrderId) return;
      const localOrder = getPaymentOrderById(pendingOrderId);
      if (localOrder?.status === 'approved' && localOrder.issuedVipKey) {
        surfaceApprovedOrder(localOrder);
        return;
      }
      const remoteOrder = await fetchPaymentOrderByIdRemote(pendingOrderId);
      surfaceApprovedOrder(remoteOrder);
    };

    const pendingOrderId = loadActiveCheckoutOrderId();
    const unsubscribeOrder = pendingOrderId
      ? subscribePaymentOrderByIdRealtime(pendingOrderId, (updated) => {
          surfaceApprovedOrder(updated);
        })
      : () => {};

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === PAYMENT_ORDERS_STORAGE_KEY ||
        e.key === ACTIVE_CHECKOUT_ORDER_STORAGE_KEY ||
        e.key === null
      ) {
        void checkApprovedOrder();
      }
    };

    const onOrdersUpdated = () => {
      void checkApprovedOrder();
    };

    void checkApprovedOrder();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(ORDERS_UPDATED_EVENT, onOrdersUpdated);
    const poll = window.setInterval(() => void checkApprovedOrder(), 4000);

    return () => {
      unsubscribeOrder();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ORDERS_UPDATED_EVENT, onOrdersUpdated);
      window.clearInterval(poll);
    };
  }, [isDirectCheckoutOpen]);

  const handleUnlock = useCallback(
    (record: VipKeyRecord) => {
      window.localStorage.setItem(ACTIVE_KEY_STORAGE_KEY, record.code);
      setActiveKey(record);
      void markCurrentVisitorPurchasedRemote().then((updated) => {
        if (updated) setVisitorProfile(updated);
      });
      showToast(
        record.isUnlimited || record.totalFolders >= 999
          ? t.vipUnlockedUnlimitedToast
          : t.vipUnlockedCreditsToast(record.remainingFolders, record.totalFolders)
      );
    },
    [showToast, t]
  );

  const handleExhaustedAttempt = useCallback((code: string) => {
    setIsWelcomeOpen(false);
    setExhaustedKeyCode(code);
    setIsExhaustedOpen(true);
  }, []);

  const handleLockSession = () => {
    window.localStorage.removeItem(ACTIVE_KEY_STORAGE_KEY);
    setActiveKey(null);
    setPendingPack(null);
    setIsWelcomeOpen(true);
  };

  const [downloadProgress, setDownloadProgress] = useState<{
    status: 'preparing' | 'zipping' | 'completed' | 'error';
    percent: number;
    current: number;
    total: number;
    trackName: string;
    zipBlob?: Blob;
    zipUrl?: string;
    zipFilename?: string;
    errorMessage?: string;
  } | null>(null);

  const forceBrowserDirectZipUrlSave = useCallback(
    (rawZipUrl: string, rawFilename: string) => {
      const cleanZipFilename = `${rawFilename.replace(/\.zip$/i, '')}.zip`;
      const trimmedUrl = rawZipUrl.trim();
      const downloadUrl =
        (trimmedUrl.includes('supabase.co/storage') ||
          trimmedUrl.includes('/storage/v1/object/public/')) &&
        !/[?&]download=/i.test(trimmedUrl)
          ? `${trimmedUrl}${trimmedUrl.includes('?') ? '&' : '?'}download=${encodeURIComponent(
              cleanZipFilename
            )}`
          : trimmedUrl;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = cleanZipFilename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast(t.downloadLaunchedToast, 'success');
      return downloadUrl;
    },
    [showToast, t]
  );

  const forceBrowserZipSave = useCallback(
    (zipBlob: Blob, rawFilename: string) => {
      const cleanZipFilename = `${rawFilename.replace(/\.zip$/i, '')}.zip`;
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = cleanZipFilename;
      document.body.appendChild(link);
      link.click();
      showToast(t.downloadLaunchedToast, 'success');
      window.setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);
    },
    [showToast, t]
  );

  const triggerZipDownload = useCallback(
    async (pack: MusicPack): Promise<{ success: boolean; blob?: Blob; filename?: string }> => {
      const filename = formatZipFolderFilename(pack);
      const cleanZipFilename = `${filename.replace(/\.zip$/i, '')}.zip`;

      const directZipUrl =
        pack.zipUrl?.trim() ||
        pack.tracks?.find((t) => Boolean(t.zipUrl && t.zipUrl.trim()))?.zipUrl?.trim() ||
        '';

      // INSTANT 1-CLICK .ZIP DOWNLOAD when folder.zipUrl exists (100% original audio, zero 00:00)
      if (
        directZipUrl &&
        (directZipUrl.startsWith('https://') || directZipUrl.startsWith('http://'))
      ) {
        const finalHref = forceBrowserDirectZipUrlSave(directZipUrl, cleanZipFilename);
        setDownloadProgress({
          status: 'completed',
          percent: 100,
          current: pack.trackCount || 1,
          total: pack.trackCount || 1,
          trackName: `${cleanZipFilename} (${pack.fileSize || 'ZIP Dirèk'})`,
          zipUrl: finalHref,
          zipFilename: cleanZipFilename,
        });
        return { success: true, filename: cleanZipFilename };
      }

      setPackagingPackId(pack.id);
      setDownloadProgress({
        status: 'preparing',
        percent: 0,
        current: 0,
        total: pack.tracks?.length || 1,
        trackName: cleanZipFilename,
      });

      try {
        const zipBlob = await buildCleanMp3Zip(pack, (progress) => {
          setDownloadProgress({
            status: progress.phase === 'zipping' ? 'zipping' : 'preparing',
            percent: Math.min(99, Math.max(0, progress.percent)),
            current: progress.current,
            total: progress.total,
            trackName: progress.trackName,
          });
        });

        setDownloadProgress({
          status: 'completed',
          percent: 100,
          current: pack.tracks?.length || 1,
          total: pack.tracks?.length || 1,
          trackName: `${cleanZipFilename} (${(zipBlob.size / (1024 * 1024)).toFixed(1)} MB)`,
          zipBlob,
          zipFilename: cleanZipFilename,
        });

        forceBrowserZipSave(zipBlob, cleanZipFilename);
        return { success: true, blob: zipBlob, filename: cleanZipFilename };
      } catch (err: any) {
        const errMsg =
          err?.message ||
          '⚠️ Folder sa a poko gen fichye MP3 sou Supabase Storage — efase l nan Admin VIP epi re-upload mizik yo!';
        setDownloadProgress({
          status: 'error',
          percent: 0,
          current: 0,
          total: pack.tracks?.length || 0,
          trackName: cleanZipFilename,
          errorMessage: errMsg,
        });
        showToast(errMsg, 'error');
        return { success: false };
      } finally {
        setPackagingPackId(null);
      }
    },
    [forceBrowserDirectZipUrlSave, forceBrowserZipSave, showToast]
  );

  const handleAdminAuthenticated = useCallback(() => {
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setIsAdminAuthenticated(true);
    setIsAdminFreeMode(true);
    setIsWelcomeOpen(false);
    showToast('👑 Mòd Admin Aktif — Telechajman Gratis Ilimite debloke!');
  }, [showToast]);

  const handleAdminLogout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setIsAdminAuthenticated(false);
    setIsAdminFreeMode(false);
    setIsAdminOpen(false);
    showToast('Ou dekonekte nan Mòd Admin lan.');
  }, [showToast]);

  const handleAdminFreeDownloadPack = useCallback(
    async (pack: MusicPack) => {
      if (!isAdminAuthenticated || pack.isComingSoon) return;
      await triggerZipDownload(pack);
    },
    [isAdminAuthenticated, triggerZipDownload]
  );

  const handleUnlockOrDownloadPack = useCallback(
    async (pack: MusicPack) => {
      if (pack.isComingSoon) return;

      // Owner/Admin unlimited free download bypasses VIP Code & folder credit deduction
      if (isAdminAuthenticated && isAdminFreeMode) {
        await handleAdminFreeDownloadPack(pack);
        return;
      }

      const activeKeyUsable = Boolean(
        activeKey &&
          (activeKey.isUnlimited ||
            activeKey.totalFolders >= 999 ||
            (!activeKey.burned && activeKey.remainingFolders > 0))
      );
      const hasBonusToSpend = Boolean(visitorProfile && visitorProfile.bonusCredits > 0);

      // If no active VIP key credits remain, allow spending a Referral Bonus Folder Credit
      if (!activeKeyUsable && hasBonusToSpend && visitorProfile) {
        const dlResult = await triggerZipDownload(pack);
        if (!dlResult.success) {
          return;
        }
        const bonusRes = await consumeVisitorBonusCreditRemote(visitorProfile);
        setVisitorProfile(bonusRes.visitor);
        return;
      }

      if (!activeKey) {
        setPendingPack(pack);
        setIsWelcomeOpen(true);
        return;
      }

      const activeIsUnlimited = Boolean(activeKey.isUnlimited) || activeKey.totalFolders >= 999;
      if (!activeIsUnlimited && (activeKey.burned || activeKey.remainingFolders <= 0)) {
        handleExhaustedAttempt(activeKey.code);
        return;
      }

      // 1. Generate .ZIP blob & trigger browser download first
      const dlResult = await triggerZipDownload(pack);
      if (!dlResult.success) {
        return;
      }

      // 2. Only deduct 1 VIP folder credit AFTER the .ZIP blob is successfully generated and link.click() fires!
      const result = await consumeFolderCreditRemote(activeKey.code, pack.id);
      if (!result.allowed || !result.updatedRecord) {
        window.localStorage.removeItem(ACTIVE_KEY_STORAGE_KEY);
        setActiveKey(null);
        handleExhaustedAttempt(activeKey.code);
        return;
      }

      setActiveKey(result.updatedRecord);

      const updatedIsUnlimited =
        Boolean(result.updatedRecord.isUnlimited) || result.updatedRecord.totalFolders >= 999;

      if (!updatedIsUnlimited && (result.justExhausted || result.updatedRecord.remainingFolders <= 0)) {
        window.localStorage.removeItem(ACTIVE_KEY_STORAGE_KEY);
        setActiveKey(null);
        setIsWelcomeOpen(false);
        setExhaustedKeyCode(result.updatedRecord.code);
        setIsExhaustedOpen(true);
      }
    },
    [
      activeKey,
      visitorProfile,
      handleAdminFreeDownloadPack,
      handleExhaustedAttempt,
      isAdminAuthenticated,
      isAdminFreeMode,
      triggerZipDownload,
    ]
  );

  const hasActiveKey = Boolean(activeKey);
  const hasRemainingCredits = Boolean(
    activeKey &&
      (activeKey.isUnlimited ||
        activeKey.totalFolders >= 999 ||
        (!activeKey.burned && activeKey.remainingFolders > 0))
  );
  const hasBonusCredits = Boolean(visitorProfile && visitorProfile.bonusCredits > 0);
  const isUnlockedForDownload = Boolean(
    (isAdminAuthenticated && isAdminFreeMode) || hasRemainingCredits || hasBonusCredits
  );

  const hasActiveAnnouncement = Boolean(
    siteAnnouncement.isActive && siteAnnouncement.message.trim().length > 0
  );

  return (
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-[#1C1F24] text-[#F3F4F6] flex flex-col">
      {/* Sleek Dark-Green & Gold Top Storefront Announcement Bar */}
      {hasActiveAnnouncement && (
        <div
          role="region"
          aria-label="Anons Ofisyèl Sit la"
          className="pt-[env(safe-area-inset-top)] border-b border-amber-400/50 bg-gradient-to-r from-[#052319] via-[#0B3B2B] to-[#052319] shadow-[0_4px_20px_rgba(16,185,129,0.12)]"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-4 sm:px-6 py-2.5 text-center">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 border border-amber-400/45 text-amber-300">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="text-xs sm:text-sm font-bold tracking-wide text-amber-200 leading-snug">
              {siteAnnouncement.message}
            </p>
          </div>
        </div>
      )}

      {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
      <header
        className={`sticky top-0 z-30 ${
          hasActiveAnnouncement ? '' : 'pt-[env(safe-area-inset-top)]'
        } border-b border-[#363B44] bg-[#262A30]/95 backdrop-blur-md`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 h-16">
          {/* Zone 1: Brand wordmark */}
          <a
            href="#top"
            className="font-display text-sm sm:text-lg font-bold tracking-tight text-[#F3F4F6] whitespace-nowrap truncate min-w-0"
          >
            WESLEY MUSIC PACKS
          </a>

          {/* Zone 2: Clean single-line nav links */}
          <nav
            aria-label="Navigasyon prensipal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#D1D5DB]"
          >
            <a
              href="#pake-mizik"
              className="hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
            >
              {t.navFolders}
            </a>
            <a
              href="#koman-sa-mache"
              className="hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
            >
              {t.navHowItWorks}
            </a>
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navAdmin}
            </button>
          </nav>

          {/* Zone 3: Language Pill + Country & Currency Selector + Primary Action / Quota Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSelector variant="pill" align="right" />

            <CountrySelector
              selectedCountryCode={selectedCountryCode}
              onSelectCountry={handleSelectCountry}
              align="right"
            />

            {hasActiveKey && activeKey ? (
              <button
                type="button"
                onClick={() => {
                  if (!(activeKey.isUnlimited || activeKey.totalFolders >= 999) && activeKey.remainingFolders <= 0) {
                    handleExhaustedAttempt(activeKey.code);
                  } else {
                    setPendingPack(null);
                    setIsWelcomeOpen(true);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 tabular-nums transition-colors cursor-pointer ${
                  hasRemainingCredits
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-emerald-300 hover:bg-[#10B981]/25'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                }`}
              >
                <span>
                  {activeKey.isUnlimited || activeKey.totalFolders >= 999 ? (
                    t.vipUnlimitedShort
                  ) : (
                    <>
                      <span className="hidden sm:inline">{t.folderCreditsRemainingLabel} </span>
                      <span className="sm:hidden">📁 </span>
                      {activeKey.remainingFolders} / {activeKey.totalFolders}
                      <span className="hidden sm:inline"> {t.folderWord}</span>
                    </>
                  )}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPendingPack(null);
                  setIsWelcomeOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B1410] text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.enterVipKeyBtn}</span>
                <span className="sm:hidden">{t.vipKeyShortBtn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Admin Free Mode Toggle Banner when logged in as Admin */}
      {isAdminAuthenticated && (
        <div
          className={`border-b ${
            isAdminFreeMode
              ? 'border-[#10B981]/40 bg-[#10B981]/15'
              : 'border-amber-500/35 bg-amber-500/10'
          }`}
        >
          <div className="mx-auto flex flex-wrap items-center justify-between gap-3 max-w-6xl px-4 sm:px-6 py-2.5">
            <button
              type="button"
              onClick={() => setIsAdminFreeMode((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-tight transition-colors cursor-pointer ${
                isAdminFreeMode
                  ? 'bg-[#10B981] text-[#0B1410] hover:bg-[#059669]'
                  : 'bg-[#262A30] border border-amber-500/50 text-amber-200 hover:bg-[#2E333B]'
              }`}
            >
              <span>
                {isAdminFreeMode ? t.adminModeActive : t.adminVisitorPreview}
              </span>
            </button>

            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => setIsAdminOpen(true)}
                className="font-semibold text-emerald-300 hover:text-[#F3F4F6] underline underline-offset-4 cursor-pointer"
              >
                {t.openAdminPanel}
              </button>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="font-medium text-[#D1D5DB] hover:text-rose-300 cursor-pointer"
              >
                {t.logoutAdmin}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Folder Quota Status Bar when unlocked by buyer VIP Key */}
      {hasActiveKey && activeKey && !isAdminFreeMode && (
        <div
          className={`border-b ${
            hasRemainingCredits
              ? 'border-[#10B981]/30 bg-[#10B981]/10'
              : 'border-rose-500/30 bg-rose-500/10'
          }`}
        >
          <div className="mx-auto flex flex-wrap items-center justify-between gap-3 max-w-6xl px-4 sm:px-6 py-2.5 text-xs sm:text-sm">
            <div
              className={`flex flex-wrap items-center gap-3 tabular-nums ${
                hasRemainingCredits ? 'text-emerald-200' : 'text-rose-200'
              }`}
            >
              <span className="font-semibold">
                {activeKey.isUnlimited || activeKey.totalFolders >= 999
                  ? t.vipUnlimitedActiveBanner
                  : `${t.folderCreditsRemainingLabel} ${activeKey.remainingFolders} / ${activeKey.totalFolders} ${t.folderWord}`}
              </span>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span className="font-mono">{t.gateCodeWord}: {activeKey.code}</span>
            </div>
            <button
              type="button"
              onClick={handleLockSession}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D1D5DB] hover:text-[#F3F4F6] underline underline-offset-4 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t.changeVipKeyBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bonus Free Folder Credit Banner from Viral Referral Program */}
      {!hasRemainingCredits && hasBonusCredits && !isAdminFreeMode && (
        <div className="border-b border-[#10B981]/35 bg-[#10B981]/10">
          <div className="mx-auto flex flex-wrap items-center justify-between gap-3 max-w-6xl px-4 sm:px-6 py-2.5 text-xs sm:text-sm">
            <span className="font-semibold text-emerald-200 tabular-nums">
              {t.bonusCreditsBannerPrefix} {visitorProfile?.bonusCredits} {t.bonusCreditsBannerSuffix}
            </span>
            <a
              href="#pake-mizik"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#10B981] hover:text-emerald-200 underline underline-offset-4"
            >
              {t.chooseYourFolderLink}
            </a>
          </div>
        </div>
      )}

      <main id="top" className="flex-1">
        {/* Hero Section (Clean Text Header without large banner image) */}
        <section className="border-b border-[#363B44]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-3xl">
                <p className="text-xs font-medium text-[#10B981] tracking-wide mb-2">
                  {t.heroEyebrow}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F3F4F6] tracking-tight leading-[1.12]">
                  {t.heroTitle}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
                  {t.heroSubtitlePrefix}{' '}
                  <span className="font-mono text-[#F3F4F6]">.ZIP</span>{' '}
                  {t.heroSubtitleSuffix}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {hasRemainingCredits ? (
                  <>
                    <a
                      href="#pake-mizik"
                      className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-bold text-xs sm:text-sm whitespace-nowrap transition-colors"
                    >
                      <Unlock className="h-4 w-4" />
                      <span>{t.downloadZipsHeroBtn}</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleLockSession}
                      className="inline-flex items-center justify-center gap-2 min-h-[42px] px-3.5 py-2.5 rounded-xl bg-[#262A30] border border-[#363B44] hover:border-[#10B981]/50 text-[#F3F4F6] text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t.changeCodeShortBtn}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPack(null);
                        setIsWelcomeOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-bold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4" />
                      <span>{t.unlockWithVipBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPack(null);
                        setIsWelcomeOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2.5 rounded-xl bg-[#262A30] border border-[#363B44] hover:border-[#10B981]/60 text-[#F3F4F6] text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer"
                    >
                      <Zap className="h-4 w-4 text-[#10B981]" />
                      <span>{t.buyVipKeyBtn}</span>
                    </button>
                  </>
                )}
                <PWAInstallButton variant="hero" />
              </div>
            </div>
          </div>
        </section>

        {/* Viral Referral Program Card ("🎁 PATAJE & GANYEN 1 FOLDER GRATIS") */}
        {visitorProfile && (
          <ReferralProgramCard
            visitor={visitorProfile}
            onVisitorUpdated={setVisitorProfile}
            onRewardClaimedToast={showToast}
          />
        )}

        {/* Clean .ZIP Folder Compact Aligned Rows */}
        <section id="pake-mizik" className="py-12 sm:py-16 border-b border-[#363B44]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3F4F6] tracking-tight tabular-nums">
                  {t.catalogTitle(activePacksCount, comingSoonPacksCount)}
                </h2>
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  {t.catalogSubtitlePrefix} <span className="font-mono text-[#D1D5DB]">.ZIP</span>{' '}
                  {t.catalogSubtitleSuffix}
                </p>
              </div>
            </div>

            {/* Real-time Music & Folder Search Bar with Web Speech API Voice Search (🎙️) */}
            <CatalogSearchBar
              value={catalogSearch}
              onChange={setCatalogSearch}
              totalMatchingFolders={filteredAvailablePacks.length + filteredComingSoonPacks.length}
              totalMatchingTracks={totalMatchingTracksCount}
            />

            {/* 1. REAL OWNER DOWNLOADABLE .ZIP FOLDERS AT THE TOP */}
            <div className="mb-12">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="inline-flex items-center gap-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    {t.availableNowBadge(
                      normalizedCatalogQuery
                        ? `${filteredAvailablePacks.length} / ${activePacksCount}`
                        : String(activePacksCount)
                    )}
                  </span>
                </div>
              </div>

              {filteredAvailablePacks.length === 0 ? (
                <div className="rounded-2xl border border-[#363B44] bg-[#262A30] p-8 text-center space-y-3">
                  <FolderArchive className="h-9 w-9 text-[#9CA3AF] mx-auto" />
                  <p className="text-sm font-semibold text-[#F3F4F6]">
                    {normalizedCatalogQuery
                      ? t.emptySearchText(catalogSearch.trim())
                      : t.emptyCatalogText}
                  </p>
                  {normalizedCatalogQuery && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearch('')}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] text-xs font-bold transition-colors cursor-pointer"
                    >
                      {t.resetSearchBtn}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAvailablePacks.map((pack) => {
                    const isPackaging = packagingPackId === pack.id;
                    const zipFilename = formatZipFolderFilename(pack);
                    const matchedTracks = normalizedCatalogQuery
                      ? matchingTracksByPackId.get(pack.id) || []
                      : [];
                    void colorVersion;

                    return (
                      <article
                        key={pack.id}
                        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
                          isUnlockedForDownload
                            ? 'bg-[#262A30] border-[#10B981]/45 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
                            : 'bg-[#262A30] border-[#363B44] hover:border-[#4B525E]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                              isUnlockedForDownload
                                ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}
                          >
                            <FolderArchive className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#10B981]/15 text-emerald-300 font-mono text-[11px] font-bold">
                                {pack.trackCount} {t.tracksWord}
                              </span>
                              <span className="text-xs text-[#9CA3AF] font-medium">
                                {pack.genre}
                              </span>
                              {matchedTracks.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[11px] font-semibold">
                                  {t.tracksFoundBadge(matchedTracks.length)}
                                </span>
                              )}
                            </div>

                            <h3 className="mt-1 font-mono text-sm sm:text-base font-bold text-[#F3F4F6] tracking-tight truncate">
                              <ZipFilenameText filename={zipFilename} />
                            </h3>

                            {matchedTracks.length > 0 && (
                              <p className="mt-1 text-xs text-emerald-200/90 truncate">
                                {matchedTracks
                                  .slice(0, 3)
                                  .map((tItem) =>
                                    tItem.artist && tItem.artist !== 'Wesley VIP'
                                      ? `${tItem.artist} - ${tItem.title}`
                                      : tItem.title
                                  )
                                  .join(' · ')}
                                {matchedTracks.length > 3
                                  ? ` ${t.moreTracksWord(matchedTracks.length - 3)}`
                                  : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#363B44]">
                          {isUnlockedForDownload ? (
                            <button
                              type="button"
                              disabled={isPackaging}
                              onClick={() => void handleUnlockOrDownloadPack(pack)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-[#0B1410] text-xs sm:text-sm font-extrabold whitespace-nowrap transition-colors cursor-pointer"
                            >
                              <Download className="h-4 w-4 shrink-0" />
                              <span>
                                {isPackaging ? t.preparingZipBtn : t.downloadZipBtn}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isPackaging}
                              onClick={() => {
                                const activeIsUnlimited =
                                  Boolean(activeKey?.isUnlimited) || (activeKey?.totalFolders ?? 0) >= 999;
                                if (activeKey && !activeIsUnlimited && (activeKey.burned || activeKey.remainingFolders <= 0)) {
                                  handleExhaustedAttempt(activeKey.code);
                                } else {
                                  setPendingPack(pack);
                                  setIsWelcomeOpen(true);
                                }
                              }}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C1F24] border border-[#363B44] hover:border-[#10B981] disabled:opacity-60 text-[#F3F4F6] text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer"
                            >
                              <Lock className="h-4 w-4 text-[#10B981] shrink-0" />
                              <span>{t.enterVipToDownloadBtn}</span>
                            </button>
                          )}

                          {isAdminAuthenticated && (
                            <button
                              type="button"
                              title="Efase Pake sa a (Admin)"
                              onClick={async () => {
                                if (window.confirm(`Èske ou vle efase folder "${zipFilename}" nèt?`)) {
                                  await deleteRemoteMusicPack(pack.id);
                                  setCustomPacksVersion((v) => v + 1);
                                  showToast(`🗑️ Pake "${zipFilename}" efase.`);
                                }
                              }}
                              className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. COUNTRY-AWARE TRENDING CATALOG */}
            <div className="pt-8 border-t border-[#363B44]">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/40 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 mb-3">
                    <Flame className="h-4 w-4 shrink-0" />
                    <span>
                      {t.trendingBadgePrefix} {selectedCountry.flag} {selectedCountry.name}
                    </span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F3F4F6] tracking-tight">
                    {t.trendingTitle(
                      normalizedCatalogQuery
                        ? `${filteredComingSoonPacks.length} / ${comingSoonPacksCount}`
                        : String(comingSoonPacksCount)
                    )}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-[#9CA3AF] max-w-2xl">
                    {t.trendingSubtitlePrefix}{' '}
                    <span className="text-[#D1D5DB] font-semibold">
                      {selectedCountry.flag} {selectedCountry.name}
                    </span>
                    . {t.trendingSubtitleSuffix}
                  </p>
                </div>
              </div>

              {filteredComingSoonPacks.length === 0 ? (
                <div className="rounded-2xl border border-[#363B44] bg-[#262A30] p-6 text-center text-xs sm:text-sm text-[#9CA3AF]">
                  {t.emptyTrendingSearch(catalogSearch.trim())}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredComingSoonPacks.map((pack) => {
                  const zipFilename = formatZipFolderFilename(pack);
                  const alreadyRequested = requestedZips.includes(zipFilename);
                  const isSending = requestingZip === zipFilename;

                  return (
                    <article
                      key={pack.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border bg-[#262A30] border-amber-500/40 hover:border-amber-400/60 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-amber-500/15 border-amber-400/45 text-amber-300">
                          <Clock className="h-5 w-5 animate-[spin_6s_linear_infinite]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[11px] font-bold">
                              {t.comingSoonPill}
                            </span>
                            <span className="text-xs text-[#9CA3AF] font-medium">
                              {pack.genre} • {selectedCountry.flag} {selectedCountry.name}
                            </span>
                          </div>

                          <h3 className="mt-1 font-mono text-sm sm:text-base font-bold text-[#F3F4F6] tracking-tight truncate">
                            <ZipFilenameText filename={zipFilename} />
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#363B44]">
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={() => void handleRequestComingSoonPack(pack)}
                          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                            alreadyRequested
                              ? 'bg-[#10B981]/15 border-[#10B981]/45 text-emerald-300 hover:bg-[#10B981]/25'
                              : 'bg-amber-500/15 border-amber-400/60 hover:bg-amber-400 hover:text-[#1C1F24] text-amber-200'
                          }`}
                        >
                          {alreadyRequested ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>{t.requestSentBtn}</span>
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4 shrink-0" />
                              <span>{isSending ? t.sendingRequestBtn : t.requestPackBtn}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="koman-sa-mache" className="py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3F4F6] tracking-tight mb-8">
              {t.howTitle}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-[#262A30] border border-[#363B44] p-6">
                <p className="font-mono text-xs text-[#10B981] font-semibold">{t.step1Tag}</p>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F3F4F6]">
                  {t.step1Title}
                </h3>
                <p className="mt-2 text-sm text-[#D1D5DB] leading-relaxed">
                  {t.step1Desc}
                </p>
              </div>

              <div className="rounded-2xl bg-[#262A30] border border-[#363B44] p-6">
                <p className="font-mono text-xs text-[#10B981] font-semibold">{t.step2Tag}</p>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F3F4F6]">
                  {t.step2Title}
                </h3>
                <p className="mt-2 text-sm text-[#D1D5DB] leading-relaxed">
                  {t.step2Desc}
                </p>
              </div>

              <div className="rounded-2xl bg-[#262A30] border border-[#363B44] p-6">
                <p className="font-mono text-xs text-[#10B981] font-semibold">{t.step3Tag}</p>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F3F4F6]">
                  {t.step3Title}
                </h3>
                <p className="mt-2 text-sm text-[#D1D5DB] leading-relaxed">
                  {t.step3Desc}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#363B44] bg-[#202429]">
        <div className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-6xl px-4 sm:px-6 py-8 text-xs text-[#9CA3AF]">
          <p>{t.footerRights(new Date().getFullYear())}</p>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setPendingPack(null);
                setIsWelcomeOpen(true);
              }}
              className="hover:text-[#F3F4F6] transition-colors cursor-pointer"
            >
              {t.enterVipKeyBtn}
            </button>
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="hover:text-[#F3F4F6] transition-colors cursor-pointer"
            >
              {t.navAdmin}
            </button>
            <PWAInstallButton variant="footer" />
          </div>
        </div>
      </footer>

      {/* Required Country-Validated Visitor Entry Gate */}
      <VisitorEntryGateModal
        isOpen={!visitorProfile && !isAdminAuthenticated && !isAdminOpen}
        selectedCountryCode={selectedCountryCode}
        onSelectCountry={handleSelectCountry}
        onCompleted={(savedVisitor) => {
          setVisitorProfile(savedVisitor);
          if (!activeKey) {
            setIsWelcomeOpen(true);
          }
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Immediate Welcome VIP Modal */}
      <WelcomeVipModal
        isOpen={isWelcomeOpen && (Boolean(visitorProfile) || isAdminAuthenticated)}
        allPacks={allPacks}
        activeKey={activeKey}
        pendingPack={pendingPack}
        selectedCountryCode={selectedCountryCode}
        onSelectCountry={handleSelectCountry}
        onStartDirectCheckout={handleStartDirectCheckout}
        onUnlock={handleUnlock}
        onUnlockOrDownloadPack={(pack) => void handleUnlockOrDownloadPack(pack)}
        onBrowsePacks={() => {
          setIsWelcomeOpen(false);
          setPendingPack(null);
        }}
      />

      {/* Quota Exhausted Renewal Modal (when 0 / Y folders remain) */}
      <QuotaExhaustedModal
        isOpen={isExhaustedOpen}
        exhaustedKeyCode={exhaustedKeyCode}
        selectedCountryCode={selectedCountryCode}
        onSelectCountry={handleSelectCountry}
        onStartDirectCheckout={handleStartDirectCheckout}
        onClose={() => setIsExhaustedOpen(false)}
        onEnterNewKey={() => {
          setIsExhaustedOpen(false);
          setPendingPack(null);
          setIsWelcomeOpen(true);
        }}
      />

      {/* Built-in Country-Aware Direct Checkout (Natcash Haiti / USDT TRC20 International) */}
      <DirectCheckoutModal
        isOpen={isDirectCheckoutOpen}
        plan={checkoutPlan}
        selectedCountryCode={selectedCountryCode}
        initialOrderId={activeOrderId}
        onClose={() => {
          setIsDirectCheckoutOpen(false);
          setActiveOrderId(loadActiveCheckoutOrderId());
        }}
        onUnlockWithKey={(record) => {
          handleUnlock(record);
          setIsDirectCheckoutOpen(false);
        }}
      />

      {/* Password-Protected Admin Key Generator, Folder Deleter & Uploader Modal */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        isAuthenticated={isAdminAuthenticated}
        allPacks={allPacks}
        packagingPackId={packagingPackId}
        onAdminAuthenticated={handleAdminAuthenticated}
        onAdminLogout={handleAdminLogout}
        onAdminFreeDownloadPack={handleAdminFreeDownloadPack}
        onClose={() => setIsAdminOpen(false)}
        onKeysChanged={syncActiveKeyFromStore}
        onColorsChanged={() => setColorVersion((v) => v + 1)}
        onCustomPacksChanged={() => setCustomPacksVersion((v) => v + 1)}
        onCheckoutConfigChanged={() => {}}
      />

      {/* Floating Download Progress Overlay */}
      {downloadProgress && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-6 duration-300">
          {downloadProgress.status === 'error' ? (
            <div
              role="alert"
              className="rounded-2xl bg-rose-950/95 border-2 border-rose-500/80 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.75)] backdrop-blur-xl space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs sm:text-sm font-extrabold text-rose-100 leading-relaxed">
                  {downloadProgress.errorMessage}
                </p>
                <button
                  type="button"
                  onClick={() => setDownloadProgress(null)}
                  aria-label="Fèmen alèt la"
                  className="rounded-md px-2 py-0.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#262A30]/95 border border-[#10B981]/50 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2.5 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-3 w-3 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
                  </span>
                  <span className="font-display font-bold text-xs sm:text-sm text-[#F3F4F6] tracking-tight truncate">
                    {downloadProgress.status === 'completed'
                      ? t.downloadLaunchedToast
                      : t.preparingZipOverlay(
                          downloadProgress.current,
                          downloadProgress.total,
                          downloadProgress.percent
                        )}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-[#10B981] tabular-nums">
                    {downloadProgress.percent}%
                  </span>
                  {downloadProgress.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => setDownloadProgress(null)}
                      aria-label={t.modalCloseAria}
                      className="ml-1 rounded-md px-1.5 py-0.5 text-xs font-bold text-[#9CA3AF] hover:bg-[#363B44] hover:text-[#F3F4F6] cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <p className="font-mono text-xs text-[#D1D5DB] truncate mb-3">
                {downloadProgress.trackName}
              </p>

              {/* Animated Progress Bar */}
              <div className="w-full h-3 bg-[#1C1F24] rounded-full overflow-hidden p-0.5 border border-[#363B44] mb-3">
                <div
                  className="h-full bg-gradient-to-r from-[#059669] to-[#10B981] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  style={{ width: `${Math.max(4, downloadProgress.percent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-[#9CA3AF]">
                <span>
                  {downloadProgress.status === 'completed'
                    ? t.savedToDownloadsNote
                    : t.preparingZipOverlay(
                        downloadProgress.current,
                        downloadProgress.total,
                        downloadProgress.percent
                      )}
                </span>
                {downloadProgress.status === 'completed' &&
                  downloadProgress.zipFilename &&
                  (downloadProgress.zipBlob || downloadProgress.zipUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (downloadProgress.zipBlob) {
                          forceBrowserZipSave(
                            downloadProgress.zipBlob,
                            downloadProgress.zipFilename!
                          );
                        } else if (downloadProgress.zipUrl) {
                          forceBrowserDirectZipUrlSave(
                            downloadProgress.zipUrl,
                            downloadProgress.zipFilename!
                          );
                        }
                      }}
                      className="font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-2 cursor-pointer shrink-0"
                    >
                      {t.clickIfNotStartedBtn}
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Non-intrusive Feedback Toast */}
      {toastState && (
        <div
          role={toastState.variant === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl max-w-sm ${
            toastState.variant === 'error'
              ? 'bg-rose-950/95 border border-rose-500/70 text-rose-100'
              : 'bg-[#262A30] border border-[#10B981]/60 text-emerald-200'
          }`}
        >
          <FolderCheck
            className={`h-4 w-4 shrink-0 ${
              toastState.variant === 'error' ? 'text-rose-400' : 'text-[#10B981]'
            }`}
          />
          <span>{toastState.message}</span>
        </div>
      )}
    </div>
  );
}
