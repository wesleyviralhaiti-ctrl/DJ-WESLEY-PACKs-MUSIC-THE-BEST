import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  AlertCircle,
  KeyRound,
  Search,
  RotateCcw,
  Upload,
  FolderOpen,
  Download,
  FolderUp,
  CheckCircle2,
  FolderArchive,
  Hourglass,
  Plus,
  Save,
  CreditCard,
  Smartphone,
  Clock,
  ExternalLink,
  Users,
  Bell,
} from 'lucide-react';
import {
  COMING_SOON_GENRE_PRESETS,
  ExportFoldersResult,
  FOLDER_PLANS,
  MusicPack,
  TrackItem,
  VipKeyRecord,
  activateComingSoonPack,
  createComingSoonPack,
  createVipKeyRecordRemote,
  deletePackById,
  deleteRemoteMusicPack,
  deleteVipKeyRecordRemote,
  exportCurrentFoldersJson,
  fetchAllVipKeysRemote,
  fetchVipKeysFromSupabaseDirect,
  formatZipFolderFilename,
  generateShortSecretCode,
  generateShortVipCode6Char,
  getVipKeyStatus,
  hasPermanentCustomDefaults,
  hideBuiltInDemoPacks,
  loadAllVipKeys,
  loadDeletedPackIds,
  renameCustomPack,
  restoreDemoPacks,
  slugifyPackTitle,
  subscribeVipKeysRealtime,
  upsertCustomPack,
  upsertRemoteMusicPack,
} from '../data/musicPacks';
import { ZipFilenameText } from './ZipFilenameText';
import {
  AutomatedCheckoutConfig,
  isValidOptionalHttpUrl,
  loadCheckoutConfig,
  saveCheckoutConfig,
} from '../data/checkoutConfig';
import {
  approvePaymentOrderRemote,
  deletePaymentOrderRemote,
  fetchPaymentOrdersRemote,
  insertNatcashSmsReceiptRemote,
  isValidTronTxHash,
  loadPaymentOrders,
  ORDERS_UPDATED_EVENT,
  PAYMENT_ORDERS_STORAGE_KEY,
  PaymentOrder,
  rejectPaymentOrderRemote,
  subscribeAllPaymentsRealtime,
} from '../data/paymentOrders';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase';
import { getCountryByCode } from '../data/countries';
import {
  VisitorProfile,
  VISITORS_CACHE_STORAGE_KEY,
  VISITORS_UPDATED_EVENT,
  deleteVisitorRecordRemote,
  fetchVisitorsFromSupabaseDirect,
  isVisitorCurrentlyOnline,
  loadVisitorsCache,
  subscribeVisitorsRealtime,
} from '../data/visitors';
import {
  PACK_REQUESTS_CACHE_STORAGE_KEY,
  PACK_REQUESTS_UPDATED_EVENT,
  PackRequestRecord,
  deletePackRequestRemote,
  fetchAllPackRequestsRemote,
  loadPackRequestsCache,
  subscribePackRequestsRealtime,
  summarizeTopRequestedPacks,
} from '../data/packRequests';
import {
  analyzeAudioFile,
  clearUploadedMp3sForPack,
  countUploadedMp3sForPack,
  extractDroppedAudioFiles,
  extractFolderNameFromFileList,
  getUploadedAudioExt,
  getUploadedMp3Buffer,
  hasUploadedMp3Buffer,
  isAudioFile,
  sortAudioFilesSequentially,
  storeUploadedMp3Buffer,
} from '../utils/audioAnalyzer';
import { groovePreview } from '../utils/audioPreview';

const ADMIN_PASSWORD = 'DJWESLEY2026#';

interface AdminPanelModalProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  allPacks: MusicPack[];
  packagingPackId: string | null;
  onAdminAuthenticated: () => void;
  onAdminLogout: () => void;
  onAdminFreeDownloadPack: (pack: MusicPack) => Promise<void>;
  onClose: () => void;
  onKeysChanged: () => void;
  onColorsChanged: () => void;
  onCustomPacksChanged: () => void;
  onCheckoutConfigChanged: () => void;
}

const PREFIX_PRESETS = ['VIP', 'W#', 'JW@', 'W$'];

const PRIVATE_PAYMENT_PLANS = [
  { id: '10-folder', label: '9+1 Folder = 10', folders: 10, isUnlimited: false },
  { id: '21-folder', label: '20+1 Folder = 21', folders: 21, isUnlimited: false },
  { id: '36-folder', label: '35+1 Folder = 36', folders: 36, isUnlimited: false },
  { id: '55-folder', label: '55 Folder = 55', folders: 55, isUnlimited: false },
  { id: 'unlimited-vip', label: '👑 KLE VIP ILIMITE', folders: 999, isUnlimited: true },
] as const;

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  isAuthenticated,
  allPacks,
  packagingPackId,
  onAdminAuthenticated,
  onAdminLogout,
  onAdminFreeDownloadPack,
  onClose,
  onKeysChanged,
  onColorsChanged,
  onCustomPacksChanged,
  onCheckoutConfigChanged,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'packs' | 'keys' | 'orders' | 'visitors' | 'requests'
  >('packs');

  // Top Full-Folder Dropzone & Coming Soon Creation State
  const [createAsComingSoon, setCreateAsComingSoon] = useState(false);
  const [comingSoonName, setComingSoonName] = useState('');
  const [comingSoonGenre, setComingSoonGenre] = useState('Konpa / Gouyad');
  const [comingSoonError, setComingSoonError] = useState<string | null>(null);
  const [comingSoonSuccess, setComingSoonSuccess] = useState<string | null>(null);

  const [isDraggingFolder, setIsDraggingFolder] = useState(false);
  const [isProcessingFolder, setIsProcessingFolder] = useState(false);
  const [folderProgressText, setFolderProgressText] = useState<string | null>(null);
  const [folderUploadError, setFolderUploadError] = useState<string | null>(null);
  const [importedPackId, setImportedPackId] = useState<string | null>(null);
  const [importedPackNameInput, setImportedPackNameInput] = useState<string>('');
  const [activatingPackId, setActivatingPackId] = useState<string | null>(null);
  const [exportedFoldersResult, setExportedFoldersResult] = useState<ExportFoldersResult | null>(null);
  const [exportIncludeBuiltIn, setExportIncludeBuiltIn] = useState<boolean>(false);
  const [exportCopiedBanner, setExportCopiedBanner] = useState<boolean>(false);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const activatePackInputRef = useRef<HTMLInputElement | null>(null);

  // VIP Keys state
  const [selectedQuota, setSelectedQuota] = useState<number>(21);
  const [customQuotaInput, setCustomQuotaInput] = useState<string>('');
  const [patternPrefix, setPatternPrefix] = useState<string>('VIP');
  const [customCodeInput, setCustomCodeInput] = useState<string>(() =>
    generateShortVipCode6Char()
  );
  const [clientNote, setClientNote] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [keys, setKeys] = useState<VipKeyRecord[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null);
  const [generatingPrivatePlanId, setGeneratingPrivatePlanId] = useState<string | null>(null);
  const [privateQuickKeySuccess, setPrivateQuickKeySuccess] = useState<{
    code: string;
    planLabel: string;
    record: VipKeyRecord;
  } | null>(null);
  const [supabaseKeysStatus, setSupabaseKeysStatus] = useState<{
    connected: boolean;
    checking: boolean;
    errorMessage?: string;
    errorCode?: string;
  }>({
    connected: false,
    checking: true,
  });

  const [selectedPackId, setSelectedPackId] = useState<string>(
    () => allPacks[0]?.id || 'coming-reggae-dancehall-mwps5k9t'
  );
  const [uploadedCount, setUploadedCount] = useState<number>(() =>
    countUploadedMp3sForPack(allPacks[0]?.id || 'coming-reggae-dancehall-mwps5k9t')
  );

  // Automated Checkout Links state (Crypto USDT / Payhip / Card)
  const [checkoutDraftConfig, setCheckoutDraftConfig] = useState<AutomatedCheckoutConfig>(() =>
    loadCheckoutConfig()
  );
  const [checkoutSaveBanner, setCheckoutSaveBanner] = useState<string | null>(null);
  const [checkoutUrlError, setCheckoutUrlError] = useState<string | null>(null);

  // Incoming Customer Payment Orders Queue (Natcash Haiti & USDT TRC20 International)
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>(() => loadPaymentOrders());
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [orderActionBanner, setOrderActionBanner] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);
  const [smsReceiptTxId, setSmsReceiptTxId] = useState<string>('');
  const [smsReceiptAmount, setSmsReceiptAmount] = useState<string>('500');
  const [isSavingSmsReceipt, setIsSavingSmsReceipt] = useState<boolean>(false);
  const [smsReceiptError, setSmsReceiptError] = useState<string | null>(null);
  const [showSmsWebhookGuide, setShowSmsWebhookGuide] = useState<boolean>(false);

  // Live Visitors & Verified Phone Numbers Directory
  const [visitors, setVisitors] = useState<VisitorProfile[]>(() => loadVisitorsCache());
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'online'>('all');
  const [visitorSearch, setVisitorSearch] = useState<string>('');
  const [copiedVisitorPhoneId, setCopiedVisitorPhoneId] = useState<string | null>(null);
  const [onlineNowMs, setOnlineNowMs] = useState<number>(() => Date.now());
  const [supabaseVisitorsStatus, setSupabaseVisitorsStatus] = useState<{
    connected: boolean;
    checking: boolean;
    lastSyncedAt: number | null;
    errorMessage?: string;
    errorCode?: string;
  }>({
    connected: false,
    checking: true,
    lastSyncedAt: null,
  });
  const [copiedSqlGrant, setCopiedSqlGrant] = useState<boolean>(false);

  // Customer Coming-Soon Pack Requests ("🔔 Mande Pake Sa a")
  const [packRequests, setPackRequests] = useState<PackRequestRecord[]>(() =>
    loadPackRequestsCache()
  );
  const [requestSearch, setRequestSearch] = useState<string>('');
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);

  const syncVisitorsFromSupabase = async () => {
    const res = await fetchVisitorsFromSupabaseDirect();
    setVisitors(res.visitors);
    setOnlineNowMs(Date.now());
    setSupabaseVisitorsStatus((prev) => ({
      connected: res.connected,
      checking: false,
      lastSyncedAt: res.connected ? Date.now() : prev.lastSyncedAt,
      errorMessage: res.errorMessage,
      errorCode: res.errorCode,
    }));
  };

  const syncKeysFromSupabase = async () => {
    const res = await fetchVipKeysFromSupabaseDirect();
    setKeys(res.keys);
    setSupabaseKeysStatus({
      connected: res.connected,
      checking: false,
      errorMessage: res.errorMessage,
      errorCode: res.errorCode,
    });
    return res;
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      const current = loadAllVipKeys();
      setKeys(current);
      setCustomCodeInput((prev) => prev || generateShortSecretCode(patternPrefix, current));
      setUploadedCount(countUploadedMp3sForPack(selectedPackId));
      setCheckoutDraftConfig(loadCheckoutConfig());
      setCheckoutUrlError(null);
      setPaymentOrders(loadPaymentOrders());
      setVisitors(loadVisitorsCache());
      setPackRequests(loadPackRequestsCache());
      setOnlineNowMs(Date.now());

      void syncKeysFromSupabase();
      void fetchPaymentOrdersRemote().then((remoteOrders) => setPaymentOrders(remoteOrders));
      void syncVisitorsFromSupabase();
      void fetchAllPackRequestsRemote().then((remoteReqs) => setPackRequests(remoteReqs));
    }
    if (!isOpen) {
      setIsDraggingFolder(false);
    }
  }, [isOpen, isAuthenticated, patternPrefix, selectedPackId]);

  // Keep payment orders, VIP keys, live visitors & pack requests synced directly with Supabase every 5s
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const refreshFromSupabase = async () => {
      const [remoteOrders, remoteKeysResult, remoteVisitorsResult, remoteRequests] =
        await Promise.all([
          fetchPaymentOrdersRemote(),
          fetchVipKeysFromSupabaseDirect(),
          fetchVisitorsFromSupabaseDirect(),
          fetchAllPackRequestsRemote(),
        ]);
      setPaymentOrders(remoteOrders);
      setKeys(remoteKeysResult.keys);
      setSupabaseKeysStatus({
        connected: remoteKeysResult.connected,
        checking: false,
        errorMessage: remoteKeysResult.errorMessage,
        errorCode: remoteKeysResult.errorCode,
      });
      setVisitors(remoteVisitorsResult.visitors);
      setSupabaseVisitorsStatus((prev) => ({
        connected: remoteVisitorsResult.connected,
        checking: false,
        lastSyncedAt: remoteVisitorsResult.connected ? Date.now() : prev.lastSyncedAt,
        errorMessage: remoteVisitorsResult.errorMessage,
        errorCode: remoteVisitorsResult.errorCode,
      }));
      setPackRequests(remoteRequests);
      setOnlineNowMs(Date.now());
    };

    const unsubscribePayments = subscribeAllPaymentsRealtime(() => {
      void fetchPaymentOrdersRemote().then((remoteOrders) => setPaymentOrders(remoteOrders));
    });
    const unsubscribeKeys = subscribeVipKeysRealtime(() => {
      void syncKeysFromSupabase();
    });
    const unsubscribeVisitors = subscribeVisitorsRealtime(() => {
      void syncVisitorsFromSupabase();
    });
    const unsubscribeRequests = subscribePackRequestsRealtime(() => {
      void fetchAllPackRequestsRemote().then((remoteRequests) => setPackRequests(remoteRequests));
    });

    const onLocalSync = () => {
      setPaymentOrders(loadPaymentOrders());
      setKeys(loadAllVipKeys());
      setVisitors(loadVisitorsCache());
      setPackRequests(loadPackRequestsCache());
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === PAYMENT_ORDERS_STORAGE_KEY ||
        e.key === VISITORS_CACHE_STORAGE_KEY ||
        e.key === PACK_REQUESTS_CACHE_STORAGE_KEY ||
        e.key === null
      ) {
        onLocalSync();
      }
    };

    void refreshFromSupabase();
    window.addEventListener('storage', onStorage);
    window.addEventListener(ORDERS_UPDATED_EVENT, onLocalSync);
    window.addEventListener(VISITORS_UPDATED_EVENT, onLocalSync);
    window.addEventListener(PACK_REQUESTS_UPDATED_EVENT, onLocalSync);
    const poll = window.setInterval(() => void refreshFromSupabase(), 5_000);
    const onlineClock = window.setInterval(() => setOnlineNowMs(Date.now()), 2_000);

    return () => {
      unsubscribePayments();
      unsubscribeKeys();
      unsubscribeVisitors();
      unsubscribeRequests();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ORDERS_UPDATED_EVENT, onLocalSync);
      window.removeEventListener(VISITORS_UPDATED_EVENT, onLocalSync);
      window.removeEventListener(PACK_REQUESTS_UPDATED_EVENT, onLocalSync);
      window.clearInterval(poll);
      window.clearInterval(onlineClock);
    };
  }, [isOpen, isAuthenticated]);

  const selectedPack = useMemo(
    () => allPacks.find((p) => p.id === selectedPackId) ?? allPacks[0] ?? null,
    [allPacks, selectedPackId]
  );

  const importedPack = useMemo(
    () => (importedPackId ? allPacks.find((p) => p.id === importedPackId) ?? null : null),
    [allPacks, importedPackId]
  );

  const pendingOrdersCount = useMemo(
    () => paymentOrders.filter((o) => o.status === 'pending').length,
    [paymentOrders]
  );

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'pending') return paymentOrders.filter((o) => o.status === 'pending');
    if (orderFilter === 'approved') return paymentOrders.filter((o) => o.status === 'approved');
    return paymentOrders;
  }, [paymentOrders, orderFilter]);

  const onlineVisitorsCount = useMemo(
    () => visitors.filter((v) => isVisitorCurrentlyOnline(v, onlineNowMs)).length,
    [visitors, onlineNowMs]
  );

  const filteredVisitors = useMemo(() => {
    const q = visitorSearch.trim().toLowerCase();
    return visitors.filter((v) => {
      if (visitorFilter === 'online' && !isVisitorCurrentlyOnline(v, onlineNowMs)) {
        return false;
      }
      if (!q) return true;
      return (
        v.fullName.toLowerCase().includes(q) ||
        v.country.toLowerCase().includes(q) ||
        v.phoneNumber.toLowerCase().includes(q)
      );
    });
  }, [visitors, visitorFilter, visitorSearch, onlineNowMs]);

  const topRequestedPacks = useMemo(
    () => summarizeTopRequestedPacks(packRequests),
    [packRequests]
  );

  const filteredPackRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    if (!q) return packRequests;
    return packRequests.filter(
      (r) =>
        r.zipFilename.toLowerCase().includes(q) ||
        r.visitorName.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.phoneNumber.toLowerCase().includes(q) ||
        r.genre.toLowerCase().includes(q)
    );
  }, [packRequests, requestSearch]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthError(null);
      onAdminAuthenticated();
      setPasswordInput('');
      const current = loadAllVipKeys();
      setKeys(current);
      setCustomCodeInput(generateShortSecretCode(patternPrefix, current));
      setUploadedCount(countUploadedMp3sForPack(selectedPackId));
      setPaymentOrders(loadPaymentOrders());
      void syncKeysFromSupabase();
      void syncVisitorsFromSupabase();
    } else {
      setAuthError('Modpas Admin lan pa kòrèk. Eseye ankò.');
    }
  };

  const activeQuota =
    customQuotaInput.trim() !== ''
      ? Math.max(1, Math.min(999, parseInt(customQuotaInput, 10) || 1))
      : selectedQuota;

  const handleGenerateRandomShortCode = (overridePrefix?: string) => {
    const prefixToUse = overridePrefix !== undefined ? overridePrefix : patternPrefix;
    setCreateError(null);
    setCustomCodeInput(generateShortSecretCode(prefixToUse, keys));
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeQuota < 1 || isCreatingKey || generatingPrivatePlanId) return;

    const codeToSave =
      customCodeInput.trim() !== ''
        ? customCodeInput
        : generateShortSecretCode(patternPrefix, keys);

    setCreateError(null);
    setPrivateQuickKeySuccess(null);
    setIsCreatingKey(true);
    const result = await createVipKeyRecordRemote(activeQuota, codeToSave, clientNote);
    setIsCreatingKey(false);

    if (!result.success || !result.record) {
      setCreateError(result.error ?? 'Pa kapab sove kòd la nan Supabase.');
      return;
    }

    const synced = await syncKeysFromSupabase();
    const updatedKeys = synced.keys;
    setLastCreatedCode(result.record.code);
    setPrivateQuickKeySuccess({
      code: result.record.code,
      planLabel:
        result.record.planName ||
        (result.record.isUnlimited || result.record.totalFolders >= 999
          ? '👑 KLE VIP ILIMITE'
          : `${result.record.totalFolders} Folder`),
      record: result.record,
    });
    setCreateError(null);
    setClientNote('');
    setCustomCodeInput(generateShortSecretCode(patternPrefix, updatedKeys));
    onKeysChanged();
  };

  const handleQuickPrivateVipKey = async (plan: (typeof PRIVATE_PAYMENT_PLANS)[number]) => {
    if (generatingPrivatePlanId || isCreatingKey) return;
    setCreateError(null);
    setPrivateQuickKeySuccess(null);
    setGeneratingPrivatePlanId(plan.id);

    const newShortCode = generateShortVipCode6Char(keys);
    const result = await createVipKeyRecordRemote(
      plan.folders,
      newShortCode,
      clientNote || undefined,
      plan.label
    );

    setGeneratingPrivatePlanId(null);

    if (!result.success || !result.record) {
      setCreateError(result.error ?? 'Pa kapab sove Kle VIP la nan Supabase.');
      return;
    }

    const synced = await syncKeysFromSupabase();
    setLastCreatedCode(result.record.code);
    setPrivateQuickKeySuccess({
      code: result.record.code,
      planLabel: plan.label,
      record: result.record,
    });
    setClientNote('');
    setCustomCodeInput(generateShortSecretCode(patternPrefix, synced.keys));
    onKeysChanged();
  };

  const handleCopyVipKeyMessage = async (record: VipKeyRecord) => {
    const isUnlimited = Boolean(record.isUnlimited) || record.totalFolders >= 999;
    const planLabel = isUnlimited
      ? "👑 KLE VIP ILIMITE (♾️ Folder a L'Infini)"
      : record.planName || `${record.totalFolders} Folder / ${(record.totalFolders * 100).toLocaleString('en-US')} Mizik`;
    const creditLabel = isUnlimited
      ? "♾️ Telechajman a L'Infini"
      : `${record.remainingFolders} / ${record.totalFolders} Folder`;
    const msg = `Men Kòd VIP ou a pou WESLEY MUSIC PACKS (${planLabel}):\n\n🔑 Kòd VIP (Yon Sèl Fwa): ${record.code}\n📁 Kredi Folder: ${creditLabel}\n⚠️ Kòd sa a fèt pou yon sèl itilizasyon sèlman.`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedCode(record.code);
      window.setTimeout(() => {
        setCopiedCode((curr) => (curr === record.code ? null : curr));
      }, 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = msg;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCode(record.code);
      window.setTimeout(() => {
        setCopiedCode((curr) => (curr === record.code ? null : curr));
      }, 2500);
    }
  };

  const handleSaveCheckoutLinks = (e: React.FormEvent) => {
    e.preventDefault();
    const urlsToValidate = [
      checkoutDraftConfig.defaultCheckoutUrl,
      checkoutDraftConfig.planLinks['10-folder'],
      checkoutDraftConfig.planLinks['21-folder'],
      checkoutDraftConfig.planLinks['36-folder'],
      checkoutDraftConfig.planLinks['55-folder'],
      checkoutDraftConfig.planLinks['unlimited-vip'],
    ];
    if (urlsToValidate.some((u) => !isValidOptionalHttpUrl(u))) {
      setCheckoutUrlError(
        'Tout lyen peman yo dwe kòmanse ak https:// oswa http:// (oswa kite l vid).'
      );
      return;
    }
    setCheckoutUrlError(null);
    const saved = saveCheckoutConfig(checkoutDraftConfig);
    setCheckoutDraftConfig(saved);
    onCheckoutConfigChanged();
    setCheckoutSaveBanner('✅ Lyen Peman Otomatik yo anrejistre sou sit la!');
    window.setTimeout(() => setCheckoutSaveBanner(null), 3500);
  };

  const handleDeleteKey = async (code: string) => {
    await deleteVipKeyRecordRemote(code);
    const updated = await fetchAllVipKeysRemote();
    setKeys(updated);
    onKeysChanged();
  };

  const handleApproveOrder = async (orderId: string) => {
    if (approvingOrderId) return;
    setApprovingOrderId(orderId);
    const res = await approvePaymentOrderRemote(orderId, 'admin');
    setApprovingOrderId(null);

    if (!res.success || !res.order) {
      setOrderActionBanner(res.error ?? 'Pa kapab valide kòmand lan.');
      return;
    }

    const [remoteOrders, remoteKeys] = await Promise.all([
      fetchPaymentOrdersRemote(),
      fetchAllVipKeysRemote(),
    ]);
    setPaymentOrders(remoteOrders);
    setKeys(remoteKeys);
    onKeysChanged();
    setOrderActionBanner(
      `✅ Kòmand ${res.order.id} valide! Kle VIP (${res.order.issuedVipKey}) anrejistre sou Supabase & voye sou telefòn kliyan an touswit.`
    );
    window.setTimeout(() => setOrderActionBanner(null), 5000);
  };

  const handleRejectOrder = async (orderId: string) => {
    await rejectPaymentOrderRemote(orderId);
    setPaymentOrders(await fetchPaymentOrdersRemote());
    setOrderActionBanner('❌ Peman an make kòm refize. Kliyan an ap kapab korije l.');
    window.setTimeout(() => setOrderActionBanner(null), 4000);
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deletePaymentOrderRemote(orderId);
    setPaymentOrders(await fetchPaymentOrdersRemote());
  };

  const handleCopyOrderValue = async (id: string, value: string) => {
    await copyPlainText(value);
    setCopiedOrderId(id);
    window.setTimeout(() => {
      setCopiedOrderId((curr) => (curr === id ? null : curr));
    }, 2200);
  };

  const handleCopyVisitorPhone = async (visitorId: string, phoneNumber: string) => {
    await copyPlainText(phoneNumber);
    setCopiedVisitorPhoneId(visitorId);
    window.setTimeout(() => {
      setCopiedVisitorPhoneId((curr) => (curr === visitorId ? null : curr));
    }, 2200);
  };

  const handleDeleteVisitor = async (visitorId: string) => {
    await deleteVisitorRecordRemote(visitorId);
    await syncVisitorsFromSupabase();
  };

  const handleCopyRequestPhone = async (reqId: string, phoneNumber: string) => {
    await copyPlainText(phoneNumber);
    setCopiedRequestId(reqId);
    window.setTimeout(() => {
      setCopiedRequestId((curr) => (curr === reqId ? null : curr));
    }, 2200);
  };

  const handleDeletePackRequest = async (reqId: string) => {
    await deletePackRequestRemote(reqId);
    setPackRequests(await fetchAllPackRequestsRemote());
  };

  const handleSaveNatcashSmsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSmsReceipt) return;
    setSmsReceiptError(null);
    setIsSavingSmsReceipt(true);
    const parsedAmount = Number(smsReceiptAmount) || 0;
    const res = await insertNatcashSmsReceiptRemote({
      txId: smsReceiptTxId,
      amountHtg: parsedAmount,
    });
    setIsSavingSmsReceipt(false);

    if (!res.success) {
      setSmsReceiptError(res.error ?? 'Pa kapab anrejistre resi SMS Natcash la.');
      return;
    }

    setSmsReceiptTxId('');
    const [remoteOrders, remoteKeys] = await Promise.all([
      fetchPaymentOrdersRemote(),
      fetchAllVipKeysRemote(),
    ]);
    setPaymentOrders(remoteOrders);
    setKeys(remoteKeys);
    if (res.autoMatchedOrderId) {
      onKeysChanged();
      setOrderActionBanner(
        `✅ Resi Natcash anrejistre & Kòmand ${res.autoMatchedOrderId} valide otomatikman ak Kle VIP!`
      );
    } else {
      setOrderActionBanner(
        `📩 Resi SMS Natcash (${parsedAmount.toLocaleString('en-US')} HTG) anrejistre — kliyan an ka debloke Kle VIP li otomatikman kounye a.`
      );
    }
    window.setTimeout(() => setOrderActionBanner(null), 5000);
  };

  const processWholeMusicFolder = async (
    rawFiles: File[],
    detectedFolderName: string | null
  ) => {
    const audioFiles = sortAudioFilesSequentially(rawFiles.filter(isAudioFile));
    if (audioFiles.length === 0) {
      setFolderUploadError(
        'Pa gen okenn fichye mizik (.MP3, .WAV, .M4A, elatriye) yo jwenn nan folder sa a.'
      );
      return;
    }

    const folderTitle =
      (detectedFolderName && detectedFolderName.trim()) ||
      extractFolderNameFromFileList(audioFiles) ||
      `Folder Mizik VIP (${audioFiles.length} Mizik)`;

    const packSlug = slugifyPackTitle(folderTitle);
    const packId = `custom-${packSlug}-${Date.now().toString(36)}`;

    setIsProcessingFolder(true);
    setFolderUploadError(null);
    setFolderProgressText(
      `Ap triye & eskane ${audioFiles.length} mizik nan "${folderTitle}"...`
    );

    const tracks: TrackItem[] = [];
    let totalBytes = 0;

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const trackNum = i + 1;
      const numStr = String(trackNum).padStart(3, '0');
      totalBytes += file.size;

      setFolderProgressText(
        `Ap prepare odyo (${trackNum}/${audioFiles.length}): ${file.name}...`
      );

      const { metadata, rawBuffer, fileExt } = await analyzeAudioFile(file);
      storeUploadedMp3Buffer(packId, trackNum, rawBuffer, fileExt);

      setFolderProgressText(
        `Ap voye nan Supabase Storage (${trackNum}/${audioFiles.length}): ${file.name}...`
      );

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${packSlug}/${numStr}_${sanitizedName}`;
      let audioUrl: string | undefined = undefined;

      try {
        const { error: uploadError } = await supabase.storage
          .from('music-packs')
          .upload(storagePath, file, {
            contentType: file.type || 'audio/mpeg',
            upsert: true,
          });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('music-packs')
            .getPublicUrl(storagePath);
          audioUrl = publicUrlData?.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase storage upload error:', err);
      }

      tracks.push({
        number: trackNum,
        title: metadata.titleGuess,
        artist: metadata.artistGuess,
        bpm: 105,
        duration: metadata.durationFormatted,
        mixType: 'Original Audio',
        audioUrl,
        storagePath,
        fileSizeBytes: file.size,
      });
    }

    const totalMb = Math.max(1, Math.round(totalBytes / (1024 * 1024)));
    const fileSizeLabel =
      totalMb >= 1024 ? `${(totalMb / 1024).toFixed(2)} GB` : `${totalMb} MB`;

    const newPack: MusicPack = {
      id: packId,
      slug: packSlug,
      title: folderTitle,
      subtitle: `${tracks.length} mizik enpòte an lòd (001–${String(tracks.length).padStart(
        3,
        '0'
      )}).`,
      genre: 'Folder Enpòte VIP',
      trackCount: tracks.length,
      fileSize: fileSizeLabel,
      bitrate: 'MP3 320kbps',
      bpmRange: 'Auto Scan',
      coverImage: '/src/assets/images/hero_studio_console_1795118961756.jpg',
      tracks,
      isCustomUpload: true,
      isComingSoon: false,
    };

    upsertCustomPack(newPack);
    void upsertRemoteMusicPack(newPack);

    setImportedPackId(packId);
    setImportedPackNameInput(folderTitle);
    setSelectedPackId(packId);
    setUploadedCount(tracks.length);

    setIsProcessingFolder(false);
    setFolderProgressText(
      `✅ Folder "${folderTitle}" pare! ${tracks.length} mizik nimewote ak odyo konplè pare pou telechaje.`
    );

    onCustomPacksChanged();
    if (onColorsChanged) onColorsChanged();

    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleFolderPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const folderName = extractFolderNameFromFileList(files);
    void processWholeMusicFolder(files, folderName);
  };

  const handleFolderDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFolder(false);
    if (isProcessingFolder) return;

    const { files, folderName } = await extractDroppedAudioFiles(e.dataTransfer);
    void processWholeMusicFolder(files, folderName);
  };

  const handleCreateComingSoonFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = comingSoonName.trim();
    if (!trimmedName) {
      setComingSoonError(
        'Tanpri antre non folder la (egzanp: Rabòday_Kanaval_2027_VIP.zip).'
      );
      return;
    }

    const created = createComingSoonPack(trimmedName, comingSoonGenre);
    setComingSoonName('');
    setComingSoonError(null);
    setComingSoonSuccess(
      `⏳ Folder "${formatZipFolderFilename(created)}" kreye kòm « AN PREPARASYON »! Lè w pare pou w lanse l, klike sou « 📂 Ajoute Mizik & Aktive Folder Sa a ».`
    );
    setSelectedPackId(created.id);
    setActiveTab('packs');
    onCustomPacksChanged();
  };

  const processActivateComingSoonPack = async (pack: MusicPack, rawFiles: File[]) => {
    const audioFiles = sortAudioFilesSequentially(rawFiles.filter(isAudioFile));
    if (audioFiles.length === 0) {
      setFolderUploadError(
        'Pa gen okenn fichye mizik (.MP3, .WAV, .M4A, elatriye) yo jwenn pou aktive folder sa a.'
      );
      setActivatingPackId(null);
      return;
    }

    setIsProcessingFolder(true);
    setFolderUploadError(null);
    setComingSoonSuccess(null);
    setFolderProgressText(
      `Ap prepare ${audioFiles.length} mizik pou aktive "${formatZipFolderFilename(pack)}"...`
    );

    const tracks: TrackItem[] = [];
    let totalBytes = 0;

    clearUploadedMp3sForPack(pack.id);

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const trackNum = i + 1;
      const numStr = String(trackNum).padStart(3, '0');
      totalBytes += file.size;

      setFolderProgressText(
        `Ap prepare odyo (${trackNum}/${audioFiles.length}): ${file.name}...`
      );

      const { metadata, rawBuffer, fileExt } = await analyzeAudioFile(file);
      storeUploadedMp3Buffer(pack.id, trackNum, rawBuffer, fileExt);

      setFolderProgressText(
        `Ap voye nan Supabase Storage (${trackNum}/${audioFiles.length}): ${file.name}...`
      );

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${pack.slug}/${numStr}_${sanitizedName}`;
      let audioUrl: string | undefined = undefined;

      try {
        const { error: uploadError } = await supabase.storage
          .from('music-packs')
          .upload(storagePath, file, {
            contentType: file.type || 'audio/mpeg',
            upsert: true,
          });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('music-packs')
            .getPublicUrl(storagePath);
          audioUrl = publicUrlData?.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase storage upload error:', err);
      }

      tracks.push({
        number: trackNum,
        title: metadata.titleGuess,
        artist: metadata.artistGuess,
        bpm: 105,
        duration: metadata.durationFormatted,
        mixType: 'Original Audio',
        audioUrl,
        storagePath,
        fileSizeBytes: file.size,
      });
    }

    const totalMb = Math.max(1, Math.round(totalBytes / (1024 * 1024)));
    const fileSizeLabel =
      totalMb >= 1024 ? `${(totalMb / 1024).toFixed(2)} GB` : `${totalMb} MB`;

    const activatedPack = activateComingSoonPack(pack, tracks, fileSizeLabel);
    void upsertRemoteMusicPack(activatedPack);

    setImportedPackId(activatedPack.id);
    setImportedPackNameInput(activatedPack.title);
    setSelectedPackId(activatedPack.id);
    setUploadedCount(tracks.length);
    setActivatingPackId(null);
    setIsProcessingFolder(false);
    setFolderProgressText(
      `✅ Folder "${formatZipFolderFilename(activatedPack)}" aktive ak ${tracks.length} mizik! Kounye a li disponib pou telechaje sou sit la.`
    );

    onCustomPacksChanged();
    if (onColorsChanged) onColorsChanged();

    if (activatePackInputRef.current) {
      activatePackInputRef.current.value = '';
    }
  };

  const handleStartActivateComingSoon = (packId: string) => {
    setActivatingPackId(packId);
    setFolderUploadError(null);
    window.setTimeout(() => {
      activatePackInputRef.current?.click();
    }, 0);
  };

  const handleActivateFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const targetPack = allPacks.find((p) => p.id === activatingPackId);
    if (files.length === 0 || !targetPack) {
      setActivatingPackId(null);
      return;
    }
    void processActivateComingSoonPack(targetPack, files);
  };

  const handleRenameImportedPack = (nextTitle: string) => {
    setImportedPackNameInput(nextTitle);
    if (importedPackId) {
      renameCustomPack(importedPackId, nextTitle);
      onCustomPacksChanged();
    }
  };

  const handleDeletePack = (packId: string) => {
    deletePackById(packId);
    clearUploadedMp3sForPack(packId);
    if (importedPackId === packId) {
      setImportedPackId(null);
      setImportedPackNameInput('');
      setFolderProgressText(null);
    }
    if (selectedPackId === packId) {
      const remaining = allPacks.filter((p) => p.id !== packId);
      if (remaining[0]) {
        setSelectedPackId(remaining[0].id);
      }
    }
    onCustomPacksChanged();
    onColorsChanged();
  };

  const handleRestoreDemoPacks = () => {
    restoreDemoPacks();
    onCustomPacksChanged();
    onColorsChanged();
  };

  const copyPlainText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleExportFoldersCode = async (includeDemosOverride?: boolean) => {
    const includeBuiltInDemos =
      includeDemosOverride !== undefined ? includeDemosOverride : exportIncludeBuiltIn;
    const res = exportCurrentFoldersJson({ includeBuiltInDemos });
    setExportedFoldersResult(res);
    await copyPlainText(res.json);
    setExportCopiedBanner(true);
    window.setTimeout(() => {
      setExportCopiedBanner(false);
    }, 3500);
  };

  const handleHideOldDemoPacks = () => {
    hideBuiltInDemoPacks();
    onCustomPacksChanged();
    if (onColorsChanged) onColorsChanged();
    if (exportedFoldersResult) {
      const res = exportCurrentFoldersJson({ includeBuiltInDemos: exportIncludeBuiltIn });
      setExportedFoldersResult(res);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161A]/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-heading"
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-[#262A30] border border-[#363B44] shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#363B44] bg-[#202429]">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="h-5 w-5 text-[#10B981] shrink-0" />
            <h2
              id="admin-panel-heading"
              className="font-display text-base sm:text-lg font-bold text-[#F3F4F6] tracking-tight truncate"
            >
              WESLEY MUSIC PACKS — Admin Panel
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={onAdminLogout}
                className="px-3 py-1.5 rounded-lg border border-[#363B44] bg-[#262A30] hover:border-rose-500/60 text-xs font-medium text-[#D1D5DB] hover:text-rose-300 transition-colors cursor-pointer"
              >
                Dekonekte Admin
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fèmen Admin Panel la"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#363B44] hover:text-[#F3F4F6] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="p-6 sm:p-8 max-w-md mx-auto space-y-4">
            <div className="text-center space-y-1.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1C1F24] border border-[#363B44] text-[#10B981] mb-3">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#F3F4F6]">Aksè Admin Pwoteje</h3>
              <p className="text-sm text-[#9CA3AF]">
                Antre PIN Admin nan pou w debloke telechajman gratis ilimite, jere pake yo,
                epi kreye Kòd VIP.
              </p>
            </div>

            <div className="relative">
              <label htmlFor="admin-password-input" className="sr-only">
                Modpas Admin
              </label>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Antre PIN Admin nan..."
                autoFocus
                className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] pl-4 pr-11 py-3 text-sm text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Kache modpas' : 'Montre modpas'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {authError && (
              <p role="alert" className="text-xs text-rose-400 text-center">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-bold text-sm transition-colors cursor-pointer"
            >
              Ouvri Admin Panel la
            </button>
          </form>
        ) : (
          <div className="flex flex-col max-h-[86vh]">
            {/* Admin Section Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-[#363B44] bg-[#202429]">
              <button
                type="button"
                onClick={() => setActiveTab('packs')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'packs'
                    ? 'bg-[#10B981] text-[#0B1410]'
                    : 'bg-[#262A30] text-[#D1D5DB] hover:text-[#F3F4F6] border border-[#363B44]'
                }`}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span>📁 Jere Pake Mizik Yo</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('keys')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'keys'
                    ? 'bg-[#10B981] text-[#0B1410]'
                    : 'bg-[#262A30] text-[#D1D5DB] hover:text-[#F3F4F6] border border-[#363B44]'
                }`}
              >
                <KeyRound className="h-4 w-4 shrink-0" />
                <span>🔑 Kòd VIP (Yon Sèl Fwa)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentOrders(loadPaymentOrders());
                  setActiveTab('orders');
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#10B981] text-[#0B1410]'
                    : 'bg-[#262A30] text-[#D1D5DB] hover:text-[#F3F4F6] border border-[#363B44]'
                }`}
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>💳 Kòmand &amp; Peman Kliyan</span>
                {pendingOrdersCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                      activeTab === 'orders'
                        ? 'bg-[#1C1F24] text-emerald-300'
                        : 'bg-amber-400 text-[#1C1F24]'
                    }`}
                  >
                    {pendingOrdersCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisitors(loadVisitorsCache());
                  setOnlineNowMs(Date.now());
                  setActiveTab('visitors');
                  void syncVisitorsFromSupabase();
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'visitors'
                    ? 'bg-[#10B981] text-[#0B1410]'
                    : 'bg-[#262A30] text-[#D1D5DB] hover:text-[#F3F4F6] border border-[#363B44]'
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>👥 Vizitè &amp; Kliyan An Dirèk</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                    activeTab === 'visitors'
                      ? 'bg-[#1C1F24] text-emerald-300'
                      : 'bg-[#10B981]/20 text-emerald-300 border border-[#10B981]/35'
                  }`}
                >
                  🟢 {onlineVisitorsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPackRequests(loadPackRequestsCache());
                  setActiveTab('requests');
                  void fetchAllPackRequestsRemote().then((remoteReqs) =>
                    setPackRequests(remoteReqs)
                  );
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-[#10B981] text-[#0B1410]'
                    : 'bg-[#262A30] text-[#D1D5DB] hover:text-[#F3F4F6] border border-[#363B44]'
                }`}
              >
                <Bell className="h-4 w-4 shrink-0" />
                <span>📩 Demann Pake Kliyan</span>
                {packRequests.length > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                      activeTab === 'requests'
                        ? 'bg-[#1C1F24] text-emerald-300'
                        : 'bg-amber-400 text-[#1C1F24]'
                    }`}
                  >
                    {packRequests.length}
                  </span>
                )}
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* TOP OF PACKS TAB: + Kreye Nouvo Folder (Upload Real Folder OR Coming Soon Placeholder) */}
              {activeTab === 'packs' && (
              <div className="rounded-2xl border border-[#363B44] bg-[#202429] p-5 sm:p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#363B44] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/15 border border-[#10B981]/35 text-[#10B981]">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-[#F3F4F6]">
                        + Kreye Nouvo Folder
                      </h3>
                      <p className="text-xs text-[#9CA3AF]">
                        Voye yon folder mizik konplè kounye a, oswa prepare yon folder « An
                        Preparasyon » pou w plen sit la.
                      </p>
                    </div>
                  </div>

                  {/* Toggle: Coming Soon Placeholder Mode */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={createAsComingSoon}
                    onClick={() => {
                      setCreateAsComingSoon((v) => !v);
                      setComingSoonError(null);
                      setFolderUploadError(null);
                    }}
                    className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      createAsComingSoon
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                        : 'bg-[#1C1F24] border-[#363B44] hover:border-amber-400/60 text-[#D1D5DB]'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                        createAsComingSoon ? 'bg-amber-400 justify-end' : 'bg-[#363B44] justify-start'
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-[#F3F4F6] shadow-sm" />
                    </span>
                    <span className="text-left">
                      ⏳ Kreye kòm Folder &apos;An Preparasyon&apos; (San Mizik Pou Kounye a)
                    </span>
                  </button>
                </div>

                {createAsComingSoon ? (
                  /* Coming Soon Placeholder Form — Name & Genre ONLY, zero MP3 upload needed */
                  <form
                    onSubmit={handleCreateComingSoonFolder}
                    className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-[#262A30] to-[#1C1F24] p-5 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-400/45 text-amber-300">
                        <Hourglass className="h-5 w-5 animate-[spin_6s_linear_infinite]" />
                      </div>
                      <div>
                        <h4 className="font-display text-sm sm:text-base font-bold text-amber-300">
                          ⏳ Nouvo Folder &apos;An Preparasyon&apos; (San Mizik Pou Kounye a)
                        </h4>
                        <p className="text-xs text-[#D1D5DB] mt-0.5">
                          Tape non folder la ak estil li sèlman — pa gen okenn fichye MP3 ki
                          obligatwa! Kliyan VIP yo ap wè l sou sit la san yo pa ka depanse kredi
                          sou li jiskaske ou mete mizik yo ladan l.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <label
                          htmlFor="coming-soon-folder-name"
                          className="block text-xs font-semibold text-[#D1D5DB] mb-1.5"
                        >
                          Non Folder la (.ZIP)
                        </label>
                        <input
                          id="coming-soon-folder-name"
                          type="text"
                          value={comingSoonName}
                          onChange={(e) => {
                            setComingSoonName(e.target.value);
                            if (comingSoonError) setComingSoonError(null);
                          }}
                          placeholder="Ex: Rabòday_Kanaval_2027_VIP.zip oswa Konpa_Gouyad_Vol_18.zip"
                          className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-sm font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-amber-400 focus:outline-none"
                        />
                        {comingSoonName.trim() && (
                          <p className="mt-1.5 text-[11px] font-mono text-amber-300">
                            📦 Ap parèt sou sit la kòm:{' '}
                            {formatZipFolderFilename({
                              id: 'preview',
                              slug: slugifyPackTitle(comingSoonName),
                              title: comingSoonName,
                              subtitle: '',
                              genre: comingSoonGenre,
                              trackCount: 0,
                              fileSize: '',
                              bitrate: '',
                              bpmRange: '',
                              coverImage: '',
                              tracks: [],
                            })}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-6">
                        <label
                          htmlFor="coming-soon-folder-genre"
                          className="block text-xs font-semibold text-[#D1D5DB] mb-1.5"
                        >
                          Estil Mizik (Genre)
                        </label>
                        <input
                          id="coming-soon-folder-genre"
                          type="text"
                          value={comingSoonGenre}
                          onChange={(e) => setComingSoonGenre(e.target.value)}
                          placeholder="Ex: Rabòday / Kanaval"
                          className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:border-amber-400 focus:outline-none"
                        />
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {COMING_SOON_GENRE_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setComingSoonGenre(preset)}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                                comingSoonGenre === preset
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                  : 'bg-[#262A30] border-[#363B44] text-[#9CA3AF] hover:text-[#F3F4F6]'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {comingSoonError && (
                      <p role="alert" className="text-xs font-medium text-rose-400">
                        {comingSoonError}
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1C1F24] font-display font-extrabold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer"
                      >
                        <Hourglass className="h-4 w-4 shrink-0" />
                        <span>⏳ Kreye Folder &apos;An Preparasyon&apos;</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Full-Folder Upload & Drag-and-Drop Zone */
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingFolder(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDraggingFolder) setIsDraggingFolder(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setIsDraggingFolder(false);
                    }}
                    onDrop={(e) => void handleFolderDrop(e)}
                    className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 transition-all ${
                      isDraggingFolder
                        ? 'border-emerald-400 bg-[#10B981]/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                        : 'border-amber-400/70 bg-gradient-to-br from-[#10B981]/10 via-[#262A30] to-amber-500/10 hover:border-emerald-400/90'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981]/25 to-amber-500/25 border border-amber-400/40 text-amber-300">
                          <FolderUp className="h-7 w-7" />
                        </div>
                        <div>
                          <h4 className="font-display text-base sm:text-lg font-extrabold text-amber-300 tracking-tight">
                            📂 CHWAZI OSWA GLISE TOUT YON FOLDER MIZIK ISIT LA
                          </h4>
                          <p className="text-xs sm:text-sm text-[#D1D5DB] mt-1 leading-relaxed">
                            Chwazi tout yon folder mizik sou òdinatè Windows/Mac ou an 1 klik, oswa
                            glise l dirèkteman anndan bwat sa a. Sistèm nan ap mete non folder la,
                            nimewote tout mizik yo an lòd (
                            <span className="font-mono text-emerald-300">001 - ...</span>), epi
                            mete yo pare pou telechaje nan .ZIP!
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <input
                          ref={folderInputRef}
                          id="admin-full-folder-input"
                          type="file"
                          multiple
                          accept="audio/*"
                          {...({
                            webkitdirectory: '',
                            directory: '',
                          } as React.InputHTMLAttributes<HTMLInputElement>)}
                          onChange={handleFolderPickerChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="admin-full-folder-input"
                          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-amber-400 hover:brightness-110 text-[#0B1410] font-display font-extrabold text-xs sm:text-sm whitespace-nowrap shadow-lg cursor-pointer transition-all ${
                            isProcessingFolder ? 'opacity-60 pointer-events-none' : ''
                          }`}
                        >
                          <FolderOpen className="h-4 w-4 shrink-0" />
                          <span>
                            {isProcessingFolder
                              ? 'Ap Eskane Folder la...'
                              : '📁 CHWAZI YON FOLDER SOU LAPTOP LA'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {comingSoonSuccess && (
                  <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-2.5 text-xs font-medium text-amber-200 flex items-center gap-2">
                    <Hourglass className="h-4 w-4 shrink-0 text-amber-300" />
                    <span>{comingSoonSuccess}</span>
                  </div>
                )}

                {folderProgressText && (
                  <div className="rounded-xl bg-[#1C1F24] border border-[#10B981]/35 px-4 py-2.5 text-xs font-medium text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                    <span>{folderProgressText}</span>
                  </div>
                )}

                {folderUploadError && (
                  <div
                    role="alert"
                    className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 text-xs font-medium text-rose-300"
                  >
                    {folderUploadError}
                  </div>
                )}

                {/* Auto-filled Pack Name + Ready Test Download Card */}
                {importedPack && !importedPack.isComingSoon && (
                  <div className="rounded-xl bg-[#1C1F24] border border-[#10B981]/45 p-4 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                      <div className="lg:col-span-6">
                        <label
                          htmlFor="imported-pack-name-input"
                          className="block text-xs font-semibold text-amber-300 mb-1.5"
                        >
                          Non Folder .ZIP la (Ranpli Otomatikman ak Non Folder la):
                        </label>
                        <input
                          id="imported-pack-name-input"
                          type="text"
                          value={importedPackNameInput}
                          onChange={(e) => handleRenameImportedPack(e.target.value)}
                          className="w-full rounded-xl bg-[#262A30] border border-[#363B44] px-3.5 py-2.5 text-sm font-bold text-[#F3F4F6] focus:border-[#10B981] focus:outline-none"
                        />
                        <p className="text-[11px] font-mono text-[#10B981] mt-1.5">
                          📦 {formatZipFolderFilename(importedPack)} · {importedPack.trackCount}{' '}
                          Mizik an Lòd • .ZIP
                        </p>
                      </div>

                      <div className="lg:col-span-6 flex flex-wrap items-center gap-2.5 justify-end">
                        <button
                          type="button"
                          disabled={packagingPackId === importedPack.id}
                          onClick={() => void onAdminFreeDownloadPack(importedPack)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-[#0B1410] font-display font-extrabold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer"
                        >
                          <Download className="h-4 w-4 shrink-0" />
                          <span>
                            {packagingPackId === importedPack.id
                              ? 'Ap prepare .ZIP...'
                              : '⚡ Telechaje Gratis Admin'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Hidden file input for activating any "An Preparasyon" folder with real MP3s */}
              <input
                ref={activatePackInputRef}
                type="file"
                multiple
                accept="audio/*"
                onChange={handleActivateFilesChange}
                className="hidden"
              />

              {activeTab === 'orders' ? (
                /* 💳 Kòmand & Peman Kliyan — Live Natcash Haiti & USDT TRC20 Order Queue */
                <div className="space-y-5">
                  <div className="rounded-xl bg-[#202429] border border-[#10B981]/30 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-[#F3F4F6]">
                          💳 Kòmand &amp; Peman Kliyan (Natcash Ayiti &amp; USDT TRC20)
                        </h3>
                        <p className="text-xs text-[#9CA3AF] mt-1">
                          Verifye kòd tranzaksyon Natcash (+509 56568810) oswa TxID USDT TRC20 yo,
                          epi klike « ✔ Valide &amp; Voye Kle VIP » pou debloke ekran kliyan an
                          touswit.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {(
                          [
                            { id: 'all', label: `Tout (${paymentOrders.length})` },
                            { id: 'pending', label: `⏳ Ap Tann (${pendingOrdersCount})` },
                            {
                              id: 'approved',
                              label: `✅ Valide (${paymentOrders.filter((o) => o.status === 'approved').length})`,
                            },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setOrderFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              orderFilter === tab.id
                                ? 'bg-[#10B981] text-[#0B1410] border-emerald-400'
                                : 'bg-[#1C1F24] text-[#D1D5DB] border-[#363B44] hover:border-[#10B981]/50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => void handleSaveNatcashSmsReceipt(e)}
                      className="rounded-xl bg-[#1C1F24] border border-[#363B44] p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-emerald-300">
                            📩 Anrejistre Resi SMS Natcash (+509 56568810) pou Auto-Deblokaj
                          </h4>
                          <p className="text-[11px] text-[#9CA3AF]">
                            Lè w antre yon Kòd ID Natcash + Montan HTG isit la, kliyan an ap kapab
                            debloke Kle VIP li otomatikman san w pa bezwen prezan.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-5">
                          <label
                            htmlFor="admin-sms-tx-id"
                            className="block text-[11px] font-medium text-[#D1D5DB] mb-1"
                          >
                            Kòd Tranzaksyon (ID) SMS Natcash
                          </label>
                          <input
                            id="admin-sms-tx-id"
                            type="text"
                            value={smsReceiptTxId}
                            onChange={(e) => {
                              setSmsReceiptTxId(e.target.value.toUpperCase());
                              if (smsReceiptError) setSmsReceiptError(null);
                            }}
                            placeholder="Ex: 9482710583 oswa NC94827105"
                            className="w-full rounded-lg bg-[#262A30] border border-[#363B44] px-3 py-2 text-xs font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label
                            htmlFor="admin-sms-htg-amount"
                            className="block text-[11px] font-medium text-[#D1D5DB] mb-1"
                          >
                            Montan HTG Resevwa
                          </label>
                          <select
                            id="admin-sms-htg-amount"
                            value={smsReceiptAmount}
                            onChange={(e) => setSmsReceiptAmount(e.target.value)}
                            className="w-full rounded-lg bg-[#262A30] border border-[#363B44] px-3 py-2 text-xs font-mono text-[#F3F4F6] focus:border-[#10B981] focus:outline-none"
                          >
                            <option value="500">500 HTG (10 Folder)</option>
                            <option value="1000">1,000 HTG (21 Folder)</option>
                            <option value="1500">1,500 HTG (36 Folder)</option>
                            <option value="2000">2,000 HTG (55 Folder)</option>
                            <option value="7800">7,800 HTG (VIP Ilimite)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <button
                            type="submit"
                            disabled={isSavingSmsReceipt || !smsReceiptTxId.trim()}
                            className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-55 px-3 py-2 text-xs font-extrabold text-[#0B1410] transition-colors cursor-pointer"
                          >
                            <Save className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {isSavingSmsReceipt ? 'Ap anrejistre...' : 'Anrejistre Resi SMS'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {smsReceiptError && (
                        <p className="text-xs text-rose-300">{smsReceiptError}</p>
                      )}

                      <div className="pt-2 border-t border-[#363B44]">
                        <button
                          type="button"
                          onClick={() => setShowSmsWebhookGuide((v) => !v)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                        >
                          <span>
                            {showSmsWebhookGuide
                              ? '▾ Kache Konfigirasyon SMS Webhook / Forwarder'
                              : '▸ 🔗 SMS Webhook / Forwarder Endpoint (Otomatik pou Telefòn Android)'}
                          </span>
                        </button>

                        {showSmsWebhookGuide && (
                          <div className="mt-3 rounded-lg bg-[#262A30] border border-[#363B44] p-3.5 space-y-2.5 text-[11px] text-[#D1D5DB]">
                            <p className="leading-relaxed">
                              Enstale yon app{' '}
                              <strong className="text-[#F3F4F6]">SMS Forwarder / MacroDroid</strong> sou
                              telefòn ki resevwa SMS Natcash (+509 56568810) yo epi voye yon{' '}
                              <span className="font-mono text-emerald-300">POST</span> otomatik sou
                              endpoint Supabase sa a pou kwaze-verifye tout SMS Natcash an tan reyèl:
                            </p>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#9CA3AF]">
                                  POST Endpoint URL (Raw SMS Parser RPC):
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyOrderValue(
                                      'webhook-url',
                                      `${SUPABASE_URL}/rest/v1/rpc/ingest_natcash_sms_webhook`
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-[#363B44] hover:bg-[#4B525E] text-[10px] font-bold text-emerald-300 cursor-pointer"
                                >
                                  {copiedOrderId === 'webhook-url' ? '✔ Kopye!' : 'Kopye URL'}
                                </button>
                              </div>
                              <div className="rounded bg-[#1C1F24] border border-[#363B44] px-2.5 py-1.5 font-mono text-[10px] text-emerald-200 break-all select-all">
                                {SUPABASE_URL}/rest/v1/rpc/ingest_natcash_sms_webhook
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#9CA3AF]">
                                  HTTP Headers:
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyOrderValue(
                                      'webhook-headers',
                                      `apikey: ${SUPABASE_ANON_KEY}\nAuthorization: Bearer ${SUPABASE_ANON_KEY}\nContent-Type: application/json`
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-[#363B44] hover:bg-[#4B525E] text-[10px] font-bold text-emerald-300 cursor-pointer"
                                >
                                  {copiedOrderId === 'webhook-headers'
                                    ? '✔ Kopye!'
                                    : 'Kopye Headers'}
                                </button>
                              </div>
                              <pre className="rounded bg-[#1C1F24] border border-[#363B44] px-2.5 py-1.5 font-mono text-[10px] text-[#D1D5DB] overflow-x-auto select-all">{`apikey: ${SUPABASE_ANON_KEY}\nAuthorization: Bearer ${SUPABASE_ANON_KEY}\nContent-Type: application/json`}</pre>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#9CA3AF]">
                                  JSON Body Template:
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyOrderValue(
                                      'webhook-body',
                                      JSON.stringify(
                                        {
                                          p_raw_sms: '%sms_body%',
                                          p_sender_phone: '%from%',
                                        },
                                        null,
                                        2
                                      )
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-[#363B44] hover:bg-[#4B525E] text-[10px] font-bold text-emerald-300 cursor-pointer"
                                >
                                  {copiedOrderId === 'webhook-body' ? '✔ Kopye!' : 'Kopye JSON'}
                                </button>
                              </div>
                              <pre className="rounded bg-[#1C1F24] border border-[#363B44] px-2.5 py-1.5 font-mono text-[10px] text-amber-200 overflow-x-auto select-all">{`{\n  "p_raw_sms": "%sms_body%",\n  "p_sender_phone": "%from%"\n}`}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </form>

                    {orderActionBanner && (
                      <div
                        role="status"
                        className="rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 px-4 py-3 text-xs font-semibold text-emerald-200 flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                        <span>{orderActionBanner}</span>
                      </div>
                    )}

                    {filteredOrders.length === 0 ? (
                      <div className="rounded-xl border border-[#363B44] bg-[#1C1F24] p-8 text-center space-y-2">
                        <CreditCard className="h-9 w-9 text-[#9CA3AF] mx-auto" />
                        <p className="text-sm font-semibold text-[#F3F4F6]">
                          {orderFilter === 'pending'
                            ? 'Pa gen okenn peman k ap tann verifikasyon kounye a.'
                            : 'Pa gen okenn kòmand kliyan anrejistre ankò.'}
                        </p>
                        <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
                          Lè yon kliyan voye yon peman Natcash oswa USDT TRC20 sou sit la, kòmand li
                          ap parèt isit la otomatikman pou w kapab valide l nan 1 klik.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredOrders.map((order) => {
                          const isPending = order.status === 'pending';
                          const isApproved = order.status === 'approved';
                          const isRejected = order.status === 'rejected';
                          const isNatcash = order.method === 'natcash';
                          const showTronScanLink =
                            !isNatcash && isValidTronTxHash(order.transactionId);

                          return (
                            <div
                              key={order.id}
                              className={`rounded-xl border p-4 transition-colors ${
                                isPending
                                  ? 'bg-amber-500/[0.06] border-amber-500/45'
                                  : isApproved
                                    ? 'bg-[#10B981]/[0.06] border-[#10B981]/35'
                                    : 'bg-rose-500/[0.06] border-rose-500/35'
                              }`}
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-2 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold ${
                                        isNatcash
                                          ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                                          : 'bg-[#10B981]/20 text-emerald-200 border border-[#10B981]/40'
                                      }`}
                                    >
                                      {isNatcash ? (
                                        <>
                                          <Smartphone className="h-3 w-3" />
                                          <span>🇭🇹 NATCASH</span>
                                        </>
                                      ) : (
                                        <span>🌐 USDT (TRC20)</span>
                                      )}
                                    </span>

                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                        isPending
                                          ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                                          : isApproved
                                            ? 'bg-[#10B981]/20 text-emerald-300 border border-[#10B981]/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      }`}
                                    >
                                      {isPending && (
                                        <>
                                          <Clock className="h-3 w-3" />
                                          <span>⏳ Ap Tann Verifikasyon</span>
                                        </>
                                      )}
                                      {isApproved && (
                                        <span>
                                          {order.verifiedBy === 'trongrid'
                                            ? '✅ Valide Otomatik (TRON)'
                                            : '✅ Valide pa Admin'}
                                        </span>
                                      )}
                                      {isRejected && <span>❌ Refize</span>}
                                    </span>

                                    <span className="font-mono text-[11px] text-[#9CA3AF]">
                                      {order.id}
                                    </span>
                                    <span className="text-[11px] text-[#9CA3AF]">
                                      · {new Date(order.createdAt).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                    <div className="rounded-lg bg-[#1C1F24] border border-[#363B44] px-3 py-2">
                                      <span className="text-[#9CA3AF] block text-[10px]">
                                        Plan &amp; Montan
                                      </span>
                                      <span className="font-bold text-[#F3F4F6]">
                                        {order.planTitle}
                                      </span>
                                      <span className="block font-mono text-emerald-300 font-bold mt-0.5">
                                        {order.amountLabel}
                                      </span>
                                    </div>

                                    <div className="rounded-lg bg-[#1C1F24] border border-[#363B44] px-3 py-2">
                                      <span className="text-[#9CA3AF] block text-[10px]">
                                        Peyi / Telefòn Kliyan
                                      </span>
                                      <span className="font-semibold text-[#D1D5DB]">
                                        {order.countryName} ({order.countryCode})
                                      </span>
                                      {order.buyerPhone && (
                                        <span className="block font-mono text-[#D1D5DB] mt-0.5">
                                          📞 {order.buyerPhone}
                                        </span>
                                      )}
                                    </div>

                                    <div className="rounded-lg bg-[#1C1F24] border border-[#363B44] px-3 py-2">
                                      <span className="text-[#9CA3AF] block text-[10px]">
                                        {isNatcash
                                          ? 'Kòd Tranzaksyon (ID) Natcash'
                                          : 'Transaction ID / Hash (TxID)'}
                                      </span>
                                      <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                        <span className="font-mono text-amber-200 font-bold truncate">
                                          {order.transactionId}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void handleCopyOrderValue(
                                                `tx-${order.id}`,
                                                order.transactionId
                                              )
                                            }
                                            title="Kopye TxID"
                                            className="p-1 rounded bg-[#262A30] hover:bg-[#363B44] text-[#D1D5DB] cursor-pointer"
                                          >
                                            {copiedOrderId === `tx-${order.id}` ? (
                                              <Check className="h-3 w-3 text-[#10B981]" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                          </button>
                                          {showTronScanLink && (
                                            <a
                                              href={`https://tronscan.org/#/transaction/${encodeURIComponent(
                                                order.transactionId.trim()
                                              )}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              title="Verifye sou TronScan"
                                              className="p-1 rounded bg-[#262A30] hover:bg-[#363B44] text-emerald-300"
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {isApproved && order.issuedVipKey && (
                                    <div className="inline-flex items-center gap-2 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 px-3 py-1.5 text-xs">
                                      <span className="text-emerald-200 font-semibold">
                                        🔑 Kle VIP Voye bay Kliyan an:
                                      </span>
                                      <span className="font-mono font-extrabold text-[#F3F4F6] tracking-wider">
                                        {order.issuedVipKey}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleCopyOrderValue(
                                            `key-${order.id}`,
                                            order.issuedVipKey || ''
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#10B981] text-[#0B1410] font-bold text-[11px] cursor-pointer"
                                      >
                                        {copiedOrderId === `key-${order.id}` ? (
                                          <>
                                            <Check className="h-3 w-3" />
                                            <span>Kopye!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-3 w-3" />
                                            <span>Kopye</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0">
                                  {!isApproved && (
                                    <button
                                      type="button"
                                      disabled={approvingOrderId === order.id}
                                      onClick={() => void handleApproveOrder(order.id)}
                                      className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-65 text-[#0B1410] font-display font-extrabold text-xs whitespace-nowrap transition-colors cursor-pointer"
                                    >
                                      <span>
                                        {approvingOrderId === order.id
                                          ? '⏳ Ap voye Kle VIP...'
                                          : '✔ Valide & Voye Kle VIP'}
                                      </span>
                                    </button>
                                  )}

                                  {isPending && (
                                    <button
                                      type="button"
                                      onClick={() => void handleRejectOrder(order.id)}
                                      className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                                    >
                                      <span>✖ Refize</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteOrder(order.id)}
                                    aria-label={`Efase kòmand ${order.id}`}
                                    className="inline-flex items-center justify-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-xl bg-[#1C1F24] border border-[#363B44] hover:border-rose-500/40 text-[#9CA3AF] hover:text-rose-300 text-xs whitespace-nowrap transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Efase</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'visitors' ? (
                /* 👥 Vizitè & Kliyan An Dirèk — Live Visitors Directory synced directly from Supabase every 5s */
                <div className="space-y-5">
                  <div className="rounded-xl bg-[#202429] border border-[#10B981]/30 p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-display text-base sm:text-lg font-bold text-[#F3F4F6]">
                            👥 Vizitè &amp; Kliyan An Dirèk (Live)
                          </h3>
                          {supabaseVisitorsStatus.connected ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/50 px-3 py-0.5 text-[11px] font-extrabold text-emerald-300">
                              🟢 Supabase Konekte
                            </span>
                          ) : supabaseVisitorsStatus.checking ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 px-3 py-0.5 text-[11px] font-bold text-amber-200">
                              ⏳ Ap konekte ak Supabase...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 px-3 py-0.5 text-[11px] font-extrabold text-rose-200">
                              🔴 Supabase Pa Konekte
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#9CA3AF] mt-1">
                          Lis tout vizitè ki verifye non yo, peyi yo, ak vrè nimewo telefòn yo
                          anvan yo antre sou sit la — ap rafrechi dirèkteman sou Supabase chak 5
                          segond (🟢 Online nan 30s / 🔴 Offline).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setVisitorFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            visitorFilter === 'all'
                              ? 'bg-[#10B981] text-[#0B1410] border-emerald-400'
                              : 'bg-[#1C1F24] text-[#D1D5DB] border-[#363B44] hover:border-[#10B981]/50'
                          }`}
                        >
                          Tout ({visitors.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisitorFilter('online')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            visitorFilter === 'online'
                              ? 'bg-[#10B981] text-[#0B1410] border-emerald-400'
                              : 'bg-[#1C1F24] text-[#D1D5DB] border-[#363B44] hover:border-[#10B981]/50'
                          }`}
                        >
                          🟢 Online ({onlineVisitorsCount})
                        </button>
                      </div>
                    </div>

                    {!supabaseVisitorsStatus.connected &&
                      !supabaseVisitorsStatus.checking &&
                      supabaseVisitorsStatus.errorMessage && (
                        <div className="rounded-xl bg-rose-500/10 border border-rose-500/45 p-4 space-y-2.5 text-xs">
                          <div className="flex items-start gap-2 text-rose-200 font-semibold">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                            <div>
                              <p>
                                Erè Supabase ({supabaseVisitorsStatus.errorCode || 'SQL'}):{' '}
                                <span className="font-mono">{supabaseVisitorsStatus.errorMessage}</span>
                              </p>
                              <p className="text-[#D1D5DB] font-normal mt-1">
                                Pou tout telefòn parèt an dirèk sou laptop ou a, kouri kòmand SQL sa a
                                nan Supabase SQL Editor (pou bay kle piblik la pèmisyon sou tab la):
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#1C1F24] border border-[#363B44] p-2.5">
                            <code className="font-mono text-[11px] text-emerald-300 break-all">
                              GRANT USAGE ON SCHEMA public TO anon, authenticated; GRANT SELECT,
                              INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon,
                              authenticated;
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                void copyPlainText(
                                  'GRANT USAGE ON SCHEMA public TO anon, authenticated;\nGRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;'
                                );
                                setCopiedSqlGrant(true);
                                window.setTimeout(() => setCopiedSqlGrant(false), 2500);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#10B981] text-[#0B1410] text-[11px] font-extrabold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {copiedSqlGrant ? '✔ Kopye!' : 'Kopye SQL'}
                            </button>
                          </div>
                        </div>
                      )}

                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
                      <input
                        type="text"
                        value={visitorSearch}
                        onChange={(e) => setVisitorSearch(e.target.value)}
                        placeholder="🔍 Chèche non kliyan, peyi, oswa nimewo telefòn..."
                        className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                      />
                    </div>

                    {filteredVisitors.length === 0 ? (
                      <div className="rounded-xl border border-[#363B44] bg-[#1C1F24] p-8 text-center space-y-2">
                        <Users className="h-9 w-9 text-[#9CA3AF] mx-auto" />
                        <p className="text-sm font-semibold text-[#F3F4F6]">
                          {visitorFilter === 'online'
                            ? 'Pa gen okenn vizitè ki Online kounye a.'
                            : 'Pa gen okenn vizitè anrejistre ankò.'}
                        </p>
                        <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
                          Chak fwa yon vizitè antre non li, peyi li, ak nimewo telefòn li nan pòtay
                          aksè a, li ap parèt isit la otomatikman ak estati Online li.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredVisitors.map((visitor) => {
                          const online = isVisitorCurrentlyOnline(visitor, onlineNowMs);
                          const country = getCountryByCode(visitor.countryCode);

                          return (
                            <div
                              key={visitor.id}
                              className={`rounded-xl border p-4 transition-colors ${
                                online
                                  ? 'bg-[#10B981]/[0.08] border-[#10B981]/45'
                                  : 'bg-[#1C1F24] border-[#363B44]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${
                                        online
                                          ? 'bg-[#10B981]/20 text-emerald-300 border-[#10B981]/45'
                                          : 'bg-[#262A30] text-[#9CA3AF] border-[#363B44]'
                                      }`}
                                    >
                                      <span aria-hidden="true">{online ? '🟢' : '🔴'}</span>
                                      <span>{online ? 'Online' : 'Offline'}</span>
                                    </span>
                                    <span className="text-[11px] text-[#9CA3AF]">
                                      {new Date(visitor.lastSeenAt).toLocaleString()}
                                    </span>
                                  </div>

                                  <h4 className="font-display text-sm sm:text-base font-bold text-[#F3F4F6] truncate">
                                    {visitor.fullName}
                                  </h4>

                                  <p className="text-xs text-[#D1D5DB] flex items-center gap-1.5">
                                    <span className="text-base leading-none" aria-hidden="true">
                                      {country.flag}
                                    </span>
                                    <span>
                                      {country.name} ({country.code})
                                    </span>
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => void handleDeleteVisitor(visitor.id)}
                                  aria-label={`Efase vizitè ${visitor.fullName}`}
                                  className="p-1.5 rounded-lg bg-[#262A30] border border-[#363B44] hover:border-rose-500/40 text-[#9CA3AF] hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#262A30] border border-[#363B44] px-3 py-2">
                                <div className="min-w-0">
                                  <span className="block text-[10px] text-[#9CA3AF]">
                                    Nimewo Telefòn Verifye
                                  </span>
                                  <span className="font-mono text-xs sm:text-sm font-bold text-emerald-300 select-all">
                                    {visitor.phoneNumber}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyVisitorPhone(visitor.id, visitor.phoneNumber)
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B1410] text-[11px] font-extrabold whitespace-nowrap transition-colors cursor-pointer shrink-0"
                                >
                                  {copiedVisitorPhoneId === visitor.id ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Kopye!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Kopye</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'requests' ? (
                /* 📩 Demann Pake Kliyan — Most Requested Trending Folders & Individual Visitor Requests */
                <div className="space-y-5">
                  <div className="rounded-xl bg-[#202429] border border-amber-500/35 p-5 space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-[#F3F4F6]">
                          📩 Demann Pake Kliyan (Ki Pake Yo Plis Mande?)
                        </h3>
                        <p className="text-xs text-[#9CA3AF] mt-1">
                          Chak fwa yon vizitè klike « 🔔 Mande Pake Sa a » sou yon pake An Preparasyon,
                          demann li ak nimewo telefòn li parèt isit la an tan reyèl.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 px-3 py-1.5 text-xs font-extrabold text-amber-300 shrink-0">
                        Total Demann: {packRequests.length}
                      </span>
                    </div>

                    {/* Top Requested Leaderboard */}
                    {topRequestedPacks.length > 0 && (
                      <div className="rounded-xl bg-[#1C1F24] border border-[#363B44] p-4 space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                          🔥 Klasman Pake Ki Plis Mande Yo (Top Demann)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {topRequestedPacks.slice(0, 9).map((item, idx) => (
                            <div
                              key={item.zipFilename}
                              className="flex items-center justify-between gap-2 rounded-lg bg-[#262A30] border border-[#363B44] px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-bold text-[#F3F4F6] truncate">
                                  #{idx + 1} · {item.zipFilename}
                                </p>
                                <p className="text-[11px] text-[#9CA3AF] truncate">
                                  {item.genre} ·{' '}
                                  {item.countries.map((cc) => getCountryByCode(cc).flag).join(' ')}
                                </p>
                              </div>
                              <span className="rounded-full bg-amber-400 text-[#1C1F24] px-2 py-0.5 text-[11px] font-extrabold tabular-nums shrink-0">
                                {item.count}x
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
                      <input
                        type="text"
                        value={requestSearch}
                        onChange={(e) => setRequestSearch(e.target.value)}
                        placeholder="🔍 Chèche non pake .ZIP, non kliyan, peyi, oswa nimewo telefòn..."
                        className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    {filteredPackRequests.length === 0 ? (
                      <div className="rounded-xl border border-[#363B44] bg-[#1C1F24] p-8 text-center space-y-2">
                        <Bell className="h-9 w-9 text-[#9CA3AF] mx-auto" />
                        <p className="text-sm font-semibold text-[#F3F4F6]">
                          Poko gen okenn demann pake anrejistre.
                        </p>
                        <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
                          Lè vizitè yo klike sou « 🔔 Mande Pake Sa a » sou nenpòt pake An Preparasyon,
                          w ap wè lis la isit la pou w konnen ki folder pou w upload aprè!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {filteredPackRequests.map((req) => {
                          const country = getCountryByCode(req.countryCode);
                          return (
                            <div
                              key={req.id}
                              className="rounded-xl border border-[#363B44] bg-[#1C1F24] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-300 break-all">
                                    📦 {req.zipFilename}
                                  </span>
                                  <span className="rounded bg-[#262A30] border border-[#363B44] px-2 py-0.5 text-[10px] font-semibold text-[#D1D5DB]">
                                    {req.genre}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#D1D5DB]">
                                  <span className="font-bold text-[#F3F4F6]">
                                    👤 {req.visitorName}
                                  </span>
                                  <span>
                                    {country.flag} {country.name} ({country.code})
                                  </span>
                                  <span className="font-mono text-emerald-300 font-semibold">
                                    📞 {req.phoneNumber}
                                  </span>
                                  <span className="text-[11px] text-[#9CA3AF]">
                                    · {new Date(req.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyRequestPhone(req.id, req.phoneNumber)
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B1410] text-[11px] font-extrabold whitespace-nowrap transition-colors cursor-pointer"
                                >
                                  {copiedRequestId === req.id ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Kopye!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Kopye Tel</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeletePackRequest(req.id)}
                                  aria-label={`Efase demann ${req.zipFilename}`}
                                  className="p-2 rounded-lg bg-[#262A30] border border-[#363B44] hover:border-rose-500/40 text-[#9CA3AF] hover:text-rose-300 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'packs' ? (
                /* 📁 Jere Pake Mizik Yo — Activate Coming Soon Folders + Free Admin Test Download + Delete */
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 p-4 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-bold text-emerald-300">
                          👑 Jere Folder .ZIP yo — Telechaje Gratis, Aktive oswa Siprime nenpòt
                          Folder
                        </h3>
                        <p className="text-xs text-[#D1D5DB] mt-1">
                          Teste nenpòt folder .ZIP gratis, ajoute mizik sou yon folder « An
                          Preparasyon » pou w aktive l, oswa kopye kòd folder ou yo pou mete sou
                          entènèt.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleExportFoldersCode()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer"
                        >
                          {exportCopiedBanner ? (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span>📋 Kopye Kòd Tout Folder Mwen Yo (Pou Met Sou Entènèt)</span>
                        </button>
                        {loadDeletedPackIds().length > 0 && (
                          <button
                            type="button"
                            onClick={handleRestoreDemoPacks}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1F24] border border-[#363B44] hover:border-[#10B981] text-xs font-semibold text-[#F3F4F6] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-[#10B981]" />
                            <span>
                              {hasPermanentCustomDefaults()
                                ? `Reyajiste Folder Ofisyèl yo (${loadDeletedPackIds().length})`
                                : `Reyajiste Demo yo (${loadDeletedPackIds().length})`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {exportedFoldersResult && (
                      <div className="rounded-xl bg-[#1C1F24] border border-[#10B981]/40 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>
                              Kòd JSON pou {exportedFoldersResult.count} Folder kopye nan prespapye
                              ou!
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleExportFoldersCode()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 hover:bg-[#10B981]/25 text-xs font-semibold text-emerald-200 cursor-pointer"
                            >
                              <Copy className="h-3 w-3" />
                              <span>{exportCopiedBanner ? 'Kopye!' : 'Kopye Ankò'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setExportedFoldersResult(null)}
                              className="px-2.5 py-1.5 rounded-lg text-xs text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer"
                            >
                              Fèmen
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#D1D5DB] leading-relaxed">
                          <strong className="text-[#F3F4F6]">Kòman pou w mete l pèmanan:</strong> Kòd
                          JSON sa a gen tout vrè folder pa w yo ak tout emoji yo (
                          <span className="font-mono text-emerald-300">
                            RABODAY_VIBE_👯‍♂️🥶🥵.zip
                          </span>
                          , elatriye). Kole l nan chat AI Studio a (oswa dirèkteman nan fichye{' '}
                          <span className="font-mono text-[#F3F4F6]">
                            src/data/customDefaultFolders.json
                          </span>
                          ) pou mete tout nouvo folder ou yo ofisyèl pou tout vizitè sou iPhone ak
                          Android!
                        </p>

                        {!hasPermanentCustomDefaults() &&
                          exportedFoldersResult.ownerFolderCount > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <label className="inline-flex items-center gap-2 text-xs text-[#D1D5DB] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportIncludeBuiltIn}
                                onChange={(e) => {
                                  const next = e.target.checked;
                                  setExportIncludeBuiltIn(next);
                                  void handleExportFoldersCode(next);
                                }}
                                className="rounded border-[#363B44] bg-[#262A30] text-[#10B981] focus:ring-[#10B981]"
                              />
                              <span>
                                Mete ansyen folder demo yo tou ({exportedFoldersResult.ownerFolderCount}{' '}
                                vrè folder pa m yo sèlman lè l pa tcheke)
                              </span>
                            </label>

                            {exportedFoldersResult.totalVisibleCount >
                              exportedFoldersResult.ownerFolderCount && (
                              <button
                                type="button"
                                onClick={handleHideOldDemoPacks}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-semibold text-amber-200 cursor-pointer"
                              >
                                <span>🧹 Kache Ansyen Demo Yo Sou Laptop La</span>
                              </button>
                            )}
                          </div>
                        )}

                        <textarea
                          readOnly
                          value={exportedFoldersResult.json}
                          onFocus={(e) => e.currentTarget.select()}
                          rows={6}
                          aria-label="JSON tout folder ou yo"
                          className="w-full rounded-lg bg-[#262A30] border border-[#363B44] p-3 font-mono text-[11px] text-emerald-200 focus:border-[#10B981] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {allPacks.length === 0 ? (
                    <div className="rounded-xl border border-[#363B44] bg-[#202429] p-8 text-center space-y-3">
                      <p className="text-sm font-semibold text-[#F3F4F6]">
                        Pa gen okenn folder .ZIP aktif kounye a.
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        Chwazi yon folder mizik sou laptop ou anlè a oswa reyajiste folder ofisyèl yo.
                      </p>
                      {loadDeletedPackIds().length > 0 && (
                        <button
                          type="button"
                          onClick={handleRestoreDemoPacks}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#262A30] border border-[#363B44] hover:bg-[#2E333B] text-xs font-bold text-[#F3F4F6] cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-[#10B981]" />
                          <span>
                            {hasPermanentCustomDefaults()
                              ? 'Reyajiste Folder Ofisyèl yo'
                              : 'Reyajiste Pake Demo yo'}
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allPacks.map((pack) => {
                        const isComingSoon = Boolean(pack.isComingSoon);
                        const isDownloading = packagingPackId === pack.id;
                        const isActivatingThis = isProcessingFolder && activatingPackId === pack.id;

                        return (
                          <div
                            key={pack.id}
                            className={`flex flex-col justify-between rounded-xl border p-4 gap-4 ${
                              isComingSoon
                                ? 'bg-amber-500/[0.05] border-amber-500/50'
                                : pack.isCustomUpload
                                  ? 'bg-[#202429] border-amber-500/45'
                                  : 'bg-[#202429] border-[#363B44]'
                            }`}
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                                  isComingSoon
                                    ? 'bg-amber-500/15 border-amber-400/45 text-amber-300'
                                    : 'bg-[#10B981]/15 border-[#10B981]/35 text-[#10B981]'
                                }`}
                              >
                                {isComingSoon ? (
                                  <Hourglass className="h-6 w-6 animate-[spin_6s_linear_infinite]" />
                                ) : (
                                  <FolderArchive className="h-6 w-6" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                {isComingSoon ? (
                                  <p className="text-[11px] font-bold text-amber-300">
                                    ⏳ AN PREPARASYON · {pack.genre}
                                  </p>
                                ) : (
                                  <p className="text-xs text-[#10B981] font-medium">
                                    {pack.genre} · {pack.trackCount} Mizik an Lòd • .ZIP
                                  </p>
                                )}
                                <h4 className="font-mono text-sm leading-snug font-bold text-[#F3F4F6] mt-0.5">
                                  <ZipFilenameText filename={formatZipFolderFilename(pack)} />
                                </h4>
                                <p className="text-[11px] text-[#9CA3AF] mt-1 tabular-nums">
                                  {isComingSoon
                                    ? 'Poko gen mizik — klike bouton jòn/vèt la pou w ajoute MP3 yo'
                                    : `${pack.trackCount} Mizik · ${pack.fileSize}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#363B44]">
                              {isComingSoon ? (
                                <button
                                  type="button"
                                  disabled={isProcessingFolder}
                                  onClick={() => handleStartActivateComingSoon(pack.id)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-[#1C1F24] text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer"
                                >
                                  <FolderUp className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    {isActivatingThis
                                      ? 'Ap Eskane Mizik...'
                                      : '📂 Ajoute Mizik & Aktive Folder Sa a'}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isDownloading}
                                  onClick={() => void onAdminFreeDownloadPack(pack)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-[#0B1410] text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    {isDownloading
                                      ? 'Ap prepare .ZIP...'
                                      : '⚡ Telechaje Gratis Admin'}
                                  </span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeletePack(pack.id)}
                                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/45 hover:bg-rose-500 text-rose-300 hover:text-[#F3F4F6] text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                              >
                                <span>🗑️ Siprime Folder</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeTab === 'keys' ? (
                <>
                  {/* PROMINENT 1-CLICK BOX: ⚡ KREYE KLE VIP POU PEMAN PRIVE */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#10B981]/15 via-[#202429] to-[#1C1F24] border-2 border-[#10B981]/50 p-5 sm:p-6 space-y-4 shadow-[0_12px_40px_rgba(16,185,129,0.12)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#F3F4F6] tracking-tight">
                            ⚡ KREYE KLE VIP POU PEMAN PRIVE
                          </h3>
                          {supabaseKeysStatus.connected ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/50 px-3 py-0.5 text-[11px] font-extrabold text-emerald-300">
                              🟢 Supabase Konekte
                            </span>
                          ) : supabaseKeysStatus.checking ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 px-3 py-0.5 text-[11px] font-bold text-amber-200">
                              ⏳ Ap konekte ak Supabase...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 px-3 py-0.5 text-[11px] font-extrabold text-rose-200">
                              🔴 Supabase Erè
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-[#D1D5DB] mt-1">
                          Klike sou nenpòt plan anba a pou w jenere yon kòd VIP kout (ex:{' '}
                          <span className="font-mono font-bold text-emerald-300">VIP842</span>),
                          anrejistre l dirèkteman nan bazdone Supabase la, epi kopye l voye bay
                          kliyan an nan 1 klik!
                        </p>
                      </div>
                    </div>

                    {!supabaseKeysStatus.connected &&
                      !supabaseKeysStatus.checking &&
                      supabaseKeysStatus.errorMessage && (
                        <div className="rounded-xl bg-rose-500/10 border border-rose-500/45 p-4 space-y-2 text-xs">
                          <p className="text-rose-200 font-semibold">
                            ⚠️ Supabase ({supabaseKeysStatus.errorCode || 'SQL'}):{' '}
                            <span className="font-mono">{supabaseKeysStatus.errorMessage}</span>
                          </p>
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#1C1F24] border border-[#363B44] p-2.5">
                            <code className="font-mono text-[11px] text-emerald-300 break-all">
                              GRANT USAGE ON SCHEMA public TO anon, authenticated; GRANT SELECT,
                              INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon,
                              authenticated;
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                void copyPlainText(
                                  'GRANT USAGE ON SCHEMA public TO anon, authenticated;\nGRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;'
                                );
                                setCopiedSqlGrant(true);
                                window.setTimeout(() => setCopiedSqlGrant(false), 2500);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#10B981] text-[#0B1410] text-[11px] font-extrabold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {copiedSqlGrant ? '✔ Kopye!' : 'Kopye SQL'}
                            </button>
                          </div>
                        </div>
                      )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {PRIVATE_PAYMENT_PLANS.map((plan) => {
                        const isGeneratingThis = generatingPrivatePlanId === plan.id;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            disabled={Boolean(generatingPrivatePlanId) || isCreatingKey}
                            onClick={() => void handleQuickPrivateVipKey(plan)}
                            className={`flex flex-col items-start justify-between gap-1.5 rounded-xl border p-4 text-left transition-all cursor-pointer disabled:opacity-60 ${
                              plan.isUnlimited
                                ? 'sm:col-span-2 lg:col-span-1 bg-gradient-to-r from-amber-500/20 to-[#10B981]/20 border-amber-400/70 hover:border-amber-300 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                : 'bg-[#1C1F24] border-[#363B44] hover:border-[#10B981] hover:bg-[#10B981]/10 text-[#F3F4F6]'
                            }`}
                          >
                            <span
                              className={`font-display text-sm sm:text-base font-extrabold ${
                                plan.isUnlimited ? 'text-amber-300' : 'text-emerald-300'
                              }`}
                            >
                              {isGeneratingThis ? '⏳ Ap sove nan Supabase...' : plan.label}
                            </span>
                            <span className="text-[11px] text-[#9CA3AF]">
                              {plan.isUnlimited
                                ? "♾️ Telechajman a L'Infini"
                                : `${plan.folders} Kredi Folder (.ZIP)`}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {privateQuickKeySuccess && (
                      <div
                        role="status"
                        className="rounded-xl bg-[#10B981]/20 border border-[#10B981] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-extrabold text-emerald-200 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                            <span>
                              ✅ Kle VIP Sove Nan Supabase — Kopye l Voye Bay Kliyan an!
                            </span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2.5 text-xs">
                            <span className="font-mono text-lg sm:text-xl font-extrabold tracking-widest text-[#F3F4F6] bg-[#1C1F24] border border-[#10B981]/50 rounded-lg px-3 py-1 select-all">
                              {privateQuickKeySuccess.code}
                            </span>
                            <span className="text-emerald-200 font-semibold">
                              Plan: {privateQuickKeySuccess.planLabel}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleCopyVipKeyMessage(privateQuickKeySuccess.record)}
                          className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-extrabold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer shrink-0"
                        >
                          {copiedCode === privateQuickKeySuccess.code ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>✔ Kopye!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>📋 Kopye Mesaj VIP la</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {createError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl bg-rose-500/15 border border-rose-500/45 px-4 py-3 text-xs font-semibold text-rose-200"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{createError}</span>
                      </div>
                    )}
                  </div>

                  {/* Short VIP Code & Folder Quota Generator Form (Custom Code / Note) */}
                  <form
                    onSubmit={(e) => void handleCreateKey(e)}
                    className="rounded-xl bg-[#202429] border border-[#363B44] p-5 space-y-5"
                  >
                    <div>
                      <h3 className="font-display text-base font-bold text-[#F3F4F6]">
                        Kreye Kòd VIP Pèsonalize (Opsyonèl)
                      </h3>
                      <p className="text-xs text-[#9CA3AF] mt-1">
                        Chak kòd anrejistre nan Supabase imedyatman epi li travay sou nenpòt telefòn
                        oswa òdinatè jiskaske kredi li yo rive 0.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {FOLDER_PLANS.map((plan) => {
                        const isSelected =
                          customQuotaInput.trim() === '' && selectedQuota === plan.folders;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => {
                              setSelectedQuota(plan.folders);
                              setCustomQuotaInput('');
                            }}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer ${
                              plan.id === 'unlimited-vip' ? 'sm:col-span-2' : ''
                            } ${
                              isSelected
                                ? 'bg-[#10B981]/15 border-[#10B981] text-emerald-200'
                                : 'bg-[#1C1F24] border-[#363B44] text-[#D1D5DB] hover:border-[#10B981]/50'
                            }`}
                          >
                            <span>{plan.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Short Code Pattern & Manual Override */}
                    <div className="border-t border-[#363B44] pt-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-display text-sm font-bold text-[#F3F4F6]">
                            2. Modèl Kòd Kout Sekrè &amp; Pèsonalizasyon
                          </h4>
                          <p className="text-xs text-[#9CA3AF] mt-0.5">
                            Jenere yon kòd 6–8 karaktè ak senbòl (ex: W#84K2, JW@91X) oswa tape
                            pwòp kòd ou (ex: W*94K#).
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PREFIX_PRESETS.map((prefix) => (
                            <button
                              key={prefix}
                              type="button"
                              onClick={() => {
                                setPatternPrefix(prefix);
                                handleGenerateRandomShortCode(prefix);
                              }}
                              className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors cursor-pointer ${
                                patternPrefix === prefix
                                  ? 'bg-[#10B981]/15 border-[#10B981] text-emerald-300'
                                  : 'bg-[#1C1F24] border-[#363B44] text-[#9CA3AF] hover:text-[#F3F4F6]'
                              }`}
                            >
                              {prefix}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-3">
                          <label
                            htmlFor="pattern-prefix-input"
                            className="block text-xs font-medium text-[#D1D5DB] mb-1.5"
                          >
                            Prefiks / Senbòl
                          </label>
                          <input
                            id="pattern-prefix-input"
                            type="text"
                            maxLength={5}
                            value={patternPrefix}
                            onChange={(e) => setPatternPrefix(e.target.value.toUpperCase())}
                            placeholder="W#"
                            className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-sm font-mono text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <label
                            htmlFor="editable-short-code"
                            className="block text-xs font-medium text-[#D1D5DB] mb-1.5"
                          >
                            Kòd VIP Kout (Ou ka modifye l)
                          </label>
                          <input
                            id="editable-short-code"
                            type="text"
                            maxLength={16}
                            value={customCodeInput}
                            onChange={(e) => {
                              setCustomCodeInput(
                                e.target.value.toUpperCase().replace(/\s+/g, '')
                              );
                              if (createError) setCreateError(null);
                            }}
                            placeholder="Ex: W#84K2 oswa W*94K#"
                            className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-sm font-mono font-bold tracking-wider text-emerald-300 placeholder:font-normal placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <button
                            type="button"
                            onClick={() => handleGenerateRandomShortCode()}
                            className="w-full inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 py-2.5 rounded-xl bg-[#262A30] hover:bg-[#2E333B] border border-[#363B44] text-xs font-bold text-[#F3F4F6] whitespace-nowrap transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                            <span>⚡ Jenere Kòd Kout Sekrè</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="custom-folder-quota"
                          className="block text-xs font-medium text-[#D1D5DB] mb-1.5"
                        >
                          Kantite Folder Pèsonalize
                        </label>
                        <input
                          id="custom-folder-quota"
                          type="number"
                          min={1}
                          max={999}
                          value={customQuotaInput}
                          onChange={(e) => setCustomQuotaInput(e.target.value)}
                          placeholder="Egzanp: 2, 15, 20"
                          className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-sm font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="client-note-input"
                          className="block text-xs font-medium text-[#D1D5DB] mb-1.5"
                        >
                          Non Kliyan / Nòt (Opsyonèl)
                        </label>
                        <input
                          id="client-note-input"
                          type="text"
                          value={clientNote}
                          onChange={(e) => setClientNote(e.target.value)}
                          placeholder="Egzanp: DJ Marc - TikTok"
                          className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                        />
                      </div>
                    </div>

                    {createError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{createError}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-[#9CA3AF] tabular-nums">
                        Plan seleksyone:{' '}
                        <span className="font-semibold text-[#F3F4F6]">
                          {activeQuota >= 999
                            ? "👑 KLE VIP ILIMITE (♾️ Folder a L'Infini)"
                            : `${activeQuota} Folder (${(activeQuota * 100).toLocaleString('en-US')} Mizik)`}
                        </span>
                      </p>
                      <button
                        type="submit"
                        disabled={isCreatingKey}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-65 text-[#0B1410] font-display font-bold text-sm whitespace-nowrap transition-colors cursor-pointer"
                      >
                        <span>{isCreatingKey ? '⏳ Ap kreye...' : '⚡ Kreye Kle VIP'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Generated Keys Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-[#F3F4F6]">
                        Lis Kòd VIP yo ({keys.length})
                      </h3>
                      {lastCreatedCode && (
                        <span className="text-xs text-[#10B981] font-medium">
                          Nouvo kòd kreye:{' '}
                          <span className="font-mono font-bold">{lastCreatedCode}</span>
                        </span>
                      )}
                    </div>

                    {keys.length === 0 ? (
                      <div className="rounded-xl border border-[#363B44] bg-[#202429] p-8 text-center text-sm text-[#9CA3AF]">
                        Ou poko kreye okenn Kòd VIP. Chwazi yon kantite folder, verifye kòd kout
                        la epi klike sou « ⚡ Kreye Kle VIP ».
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[#363B44] bg-[#202429]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#363B44] text-xs font-medium text-[#9CA3AF]">
                              <th className="py-3 px-4">Kòd VIP</th>
                              <th className="py-3 px-4">Estati</th>
                              <th className="py-3 px-4">Kredi ki Rete</th>
                              <th className="py-3 px-4">Nòt</th>
                              <th className="py-3 px-4 text-right">Aksyon</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#363B44] text-sm">
                            {keys.map((record) => {
                              const status = getVipKeyStatus(record);
                              const recordIsUnlimited = Boolean(record.isUnlimited) || record.totalFolders >= 999;
                              const usedFolders = Math.max(0, record.totalFolders - record.remainingFolders);
                              const isCopied = copiedCode === record.code;

                              return (
                                <tr key={record.code} className="hover:bg-[#262A30]/70">
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <div className="font-mono font-bold text-[#F3F4F6] tracking-wider">
                                      {record.code}
                                    </div>
                                    {record.planName && (
                                      <div className="text-[11px] font-medium text-[#9CA3AF] mt-0.5">
                                        {record.planName}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 whitespace-nowrap text-xs font-semibold tabular-nums">
                                    {status === 'available' && (
                                      <span className="text-[#10B981]">
                                        🟢 DISPONIB (Poko Sèvi)
                                      </span>
                                    )}
                                    {status === 'in_progress' && (
                                      <span className="text-amber-300">
                                        {recordIsUnlimited
                                          ? '🟡 AN KOU (👑 Ilimite ♾️)'
                                          : `🟡 AN KOU (${usedFolders}/${record.totalFolders} Folder)`}
                                      </span>
                                    )}
                                    {status === 'burned' && (
                                      <span className="text-rose-400">
                                        🔴 FINI / BOULE (Pa Ka Sèvi Ankò)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 whitespace-nowrap text-xs text-[#D1D5DB] tabular-nums">
                                    {recordIsUnlimited
                                      ? '👑 Ilimite (♾️)'
                                      : `Rete ${record.remainingFolders} / ${record.totalFolders} Folder`}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-[#9CA3AF] max-w-[140px] truncate">
                                    {record.note || '—'}
                                  </td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleCopyVipKeyMessage(record)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1F24] border border-[#363B44] hover:border-[#10B981] text-xs font-medium text-[#D1D5DB] hover:text-[#F3F4F6] transition-colors cursor-pointer"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="h-3.5 w-3.5 text-[#10B981]" />
                                            <span className="text-emerald-300">Kopye!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                            <span>📋 Kopye Kle VIP la</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteKey(record.code)}
                                        aria-label={`Efase kòd ${record.code}`}
                                        className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-400 hover:bg-[#262A30] transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Automated Online Checkout Links Manager (Payhip / USDT / Virtual Card) */}
                  <form
                    onSubmit={handleSaveCheckoutLinks}
                    className="rounded-xl bg-[#202429] border border-[#10B981]/30 p-5 space-y-4"
                  >
                    <div className="flex items-start gap-2.5 border-b border-[#363B44] pb-3">
                      <CreditCard className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-display text-base font-bold text-[#F3F4F6]">
                          💳 Lyen Peman Otomatik An Liy (Payhip / Crypto USDT / Kat Vityèl)
                        </h3>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          Kole lyen checkout otomatik ou yo pou kliyan yo ka peye epi resevwa Kle VIP
                          yo touswit an liy, 100% otomatik.
                        </p>
                      </div>
                    </div>

                    {checkoutSaveBanner && (
                      <div className="rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 px-4 py-2.5 text-xs font-semibold text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                        <span>{checkoutSaveBanner}</span>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="default-checkout-url-input"
                        className="block text-xs font-semibold text-[#D1D5DB] mb-1.5"
                      >
                        Lyen Peman Prensipal (Itilize pou tout plan si pa gen lyen espesifik)
                      </label>
                      <input
                        id="default-checkout-url-input"
                        type="url"
                        value={checkoutDraftConfig.defaultCheckoutUrl}
                        onChange={(e) => {
                          setCheckoutDraftConfig((prev) => ({
                            ...prev,
                            defaultCheckoutUrl: e.target.value,
                          }));
                          if (checkoutUrlError) setCheckoutUrlError(null);
                        }}
                        placeholder="https://payhip.com/... oswa https://nowpayments.io/..."
                        className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 font-mono text-xs sm:text-sm text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(
                        [
                          {
                            id: '10-folder',
                            label: 'Lyen Plan 9 + 1 Folder GRATIS (10 Folder Total)',
                            spanFull: false,
                          },
                          {
                            id: '21-folder',
                            label: 'Lyen Plan 20 + 1 Folder GRATIS (21 Folder · POPILÈ)',
                            spanFull: false,
                          },
                          {
                            id: '36-folder',
                            label: 'Lyen Plan 35 + 1 Folder GRATIS (36 Folder Total)',
                            spanFull: false,
                          },
                          {
                            id: '55-folder',
                            label: 'Lyen Plan 55 Folder (5,500 Mizik)',
                            spanFull: false,
                          },
                          {
                            id: 'unlimited-vip',
                            label: 'Lyen Plan 👑 KLE VIP ILIMITE (♾️)',
                            spanFull: true,
                          },
                        ] as const
                      ).map((item) => (
                        <div key={item.id} className={item.spanFull ? 'sm:col-span-2' : ''}>
                          <label
                            htmlFor={`checkout-url-${item.id}`}
                            className="block text-[11px] font-semibold text-[#D1D5DB] mb-1"
                          >
                            {item.label} (Opsyonèl)
                          </label>
                          <input
                            id={`checkout-url-${item.id}`}
                            type="url"
                            value={checkoutDraftConfig.planLinks[item.id]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCheckoutDraftConfig((prev) => ({
                                ...prev,
                                planLinks: {
                                  ...prev.planLinks,
                                  [item.id]: val,
                                },
                              }));
                              if (checkoutUrlError) setCheckoutUrlError(null);
                            }}
                            placeholder="https://..."
                            className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3 py-2 font-mono text-xs text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {checkoutUrlError && (
                      <p role="alert" className="text-xs text-rose-400 font-medium">
                        {checkoutUrlError}
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-extrabold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer"
                      >
                        <Save className="h-4 w-4 shrink-0" />
                        <span>💾 Anrejistre Lyen Peman yo</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
