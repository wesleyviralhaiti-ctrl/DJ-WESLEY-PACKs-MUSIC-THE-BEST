import React, { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  ClipboardPaste,
  CreditCard,
  ExternalLink,
  X,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Smartphone,
  QrCode,
} from 'lucide-react';
import {
  FolderPlan,
  VipKeyRecord,
  validateVipKeyCodeRemote,
} from '../data/musicPacks';
import {
  getCountryByCode,
  getFormattedPlanPrice,
  getPricingRegion,
} from '../data/countries';
import { loadSavedVisitorProfile } from '../data/visitors';
import {
  fetchPaymentOrderByIdRemote,
  getPaymentOrderById,
  getUsdtAmountForPlan,
  NATCASH_MERCHANT_NUMBER,
  ORDERS_UPDATED_EVENT,
  PaymentOrder,
  recheckNatcashOrderRemote,
  saveActiveCheckoutOrderId,
  submitAndVerifyNatcashSmsRemote,
  submitAndVerifyUsdtPaymentRemote,
  subscribeNatcashReceiptRealtime,
  subscribePaymentOrderByIdRealtime,
  USDT_TRC20_WALLET_ADDRESS,
} from '../data/paymentOrders';

interface DirectCheckoutModalProps {
  isOpen: boolean;
  plan: FolderPlan | null;
  selectedCountryCode: string;
  initialOrderId?: string | null;
  onClose: () => void;
  onUnlockWithKey: (record: VipKeyRecord) => void;
}

export const DirectCheckoutModal: React.FC<DirectCheckoutModalProps> = ({
  isOpen,
  plan,
  selectedCountryCode,
  initialOrderId,
  onClose,
  onUnlockWithKey,
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [natcashSmsInput, setNatcashSmsInput] = useState('');
  const [txIdInput, setTxIdInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'natcash' | 'usdt' | 'key' | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingTron, setIsVerifyingTron] = useState(false);
  const [isUnlockingKey, setIsUnlockingKey] = useState(false);
  const [isRecheckingNatcash, setIsRecheckingNatcash] = useState(false);
  const [natcashStatusNote, setNatcashStatusNote] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [intlMethodTab, setIntlMethodTab] = useState<'card' | 'usdt'>('card');

  const isHaiti = selectedCountryCode.trim().toUpperCase() === 'HT';
  const country = getCountryByCode(selectedCountryCode);

  // Generate QR code for USDT TRC20 Trust Wallet address
  useEffect(() => {
    if (!isOpen || isHaiti) return;
    let cancelled = false;
    QRCode.toDataURL(USDT_TRC20_WALLET_ADDRESS, {
      width: 220,
      margin: 2,
      color: {
        dark: '#090A0D',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isHaiti]);

  // Reset form or load existing order (synced from Supabase) when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setUnlockError(null);
    setNatcashStatusNote(null);
    setPasteFeedback(null);

    if (initialOrderId) {
      const existing = getPaymentOrderById(initialOrderId);
      setCurrentOrder(existing);
      void fetchPaymentOrderByIdRemote(initialOrderId).then((remote) => {
        if (remote) setCurrentOrder(remote);
      });
    } else {
      setCurrentOrder(null);
      const savedVisitor = loadSavedVisitorProfile();
      setPhoneInput(savedVisitor?.phoneNumber ?? '');
      setNatcashSmsInput('');
      setTxIdInput('');
    }
  }, [isOpen, initialOrderId, plan?.id, selectedCountryCode]);

  // Live listen via Supabase Realtime (payments + natcash_sms_receipts) while waiting on pending Natcash
  const refreshCurrentOrder = useCallback(async (orderId: string) => {
    const remote = await fetchPaymentOrderByIdRemote(orderId);
    if (remote) {
      setCurrentOrder(remote);
      return;
    }
    const local = getPaymentOrderById(orderId);
    if (local) {
      setCurrentOrder(local);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !currentOrder || currentOrder.status !== 'pending') return;
    const orderId = currentOrder.id;
    const txId = currentOrder.transactionId;
    const isNatcashPending = currentOrder.method === 'natcash';

    const unsubscribeRealtime = subscribePaymentOrderByIdRealtime(orderId, (updated) => {
      setCurrentOrder(updated);
    });

    const unsubscribeReceipt = isNatcashPending
      ? subscribeNatcashReceiptRealtime(txId, () => {
          void recheckNatcashOrderRemote(orderId).then((res) => {
            if (res.order) {
              setCurrentOrder(res.order);
            }
          });
        })
      : () => {};

    const handleSync = () => {
      void refreshCurrentOrder(orderId);
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener(ORDERS_UPDATED_EVENT, handleSync);
    const poll = window.setInterval(handleSync, 4000);

    return () => {
      unsubscribeRealtime();
      unsubscribeReceipt();
      window.removeEventListener('storage', handleSync);
      window.removeEventListener(ORDERS_UPDATED_EVENT, handleSync);
      window.clearInterval(poll);
    };
  }, [
    isOpen,
    currentOrder?.id,
    currentOrder?.status,
    currentOrder?.method,
    currentOrder?.transactionId,
    refreshCurrentOrder,
  ]);

  if (!isOpen || (!plan && !currentOrder)) return null;

  const activePlanId = currentOrder?.planId ?? plan!.id;
  const activePlanTitle = currentOrder?.planTitle ?? plan!.shortLabel;
  const activePlanBadge = plan?.badge;
  const activePlanSubtitle =
    plan?.subtitle ??
    (currentOrder && currentOrder.folders >= 999
      ? "♾️ Telechajman a L'Infini ak tout folder .ZIP yo"
      : `${((currentOrder?.folders ?? 10) * 100).toLocaleString('en-US')} Mizik .ZIP an Lòd`);

  const haitiPriceLabel = getFormattedPlanPrice(activePlanId, 'HT');
  const displayPriceLabel = getFormattedPlanPrice(activePlanId, selectedCountryCode);
  const usdtAmount = currentOrder?.usdtAmount ?? getUsdtAmountForPlan(activePlanId);
  const fiatCurrency = getPricingRegion(selectedCountryCode) === 'EUR' ? 'EUR' : 'USD';
  const moonpayCheckoutUrl = `https://buy.moonpay.com/?currencyCode=usdt_trx&walletAddress=${USDT_TRC20_WALLET_ADDRESS}&baseCurrencyAmount=${usdtAmount}`;
  const paybisCheckoutUrl = `https://paybis.com/buy-tether-trc20/?amount=${usdtAmount}&currency=${fiatCurrency}&address=${USDT_TRC20_WALLET_ADDRESS}`;

  const handleCopy = async (text: string, field: 'natcash' | 'usdt' | 'key') => {
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
    setCopiedField(field);
    window.setTimeout(() => {
      setCopiedField((curr) => (curr === field ? null : curr));
    }, 2400);
  };

  const handlePasteNatcashSms = async () => {
    setFormError(null);
    setPasteFeedback(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        setNatcashSmsInput(text.trim());
        setPasteFeedback('✔ Mesaj la kole!');
        window.setTimeout(() => setPasteFeedback(null), 2200);
      } else {
        setFormError(
          'Pa gen okenn mesaj kopye nan prespapye w la — kopye SMS Natcash la anvan oswa peze lontan anndan bwat la pou w kole l.'
        );
      }
    } catch {
      setFormError(
        'Navigatè a pa bay aksè otomatik pou kole — peze lontan anndan bwat tèks la epi chwazi Paste / Kole.'
      );
    }
  };

  const handleNatcashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || isSubmitting) return;
    setFormError(null);
    setNatcashStatusNote(null);
    setIsSubmitting(true);

    const res = await submitAndVerifyNatcashSmsRemote({
      plan,
      amountLabel: haitiPriceLabel,
      countryCode: country.code,
      countryName: country.name,
      rawSms: natcashSmsInput,
      buyerPhone: phoneInput,
    });
    setIsSubmitting(false);

    if (res.status === 'error') {
      setFormError(res.error);
      return;
    }

    setCurrentOrder(res.order);
  };

  const handleUsdtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || isSubmitting || isVerifyingTron) return;
    setFormError(null);
    setNatcashStatusNote(null);
    setIsSubmitting(true);
    setIsVerifyingTron(true);

    const res = await submitAndVerifyUsdtPaymentRemote({
      plan,
      usdtAmount,
      countryCode: country.code,
      countryName: country.name,
      transactionId: txIdInput,
    });

    setIsVerifyingTron(false);
    setIsSubmitting(false);

    if (res.status === 'error') {
      setFormError(res.error);
      return;
    }

    setCurrentOrder(res.order);
  };

  const handleRecheckNatcash = async () => {
    if (!currentOrder || currentOrder.method !== 'natcash' || isRecheckingNatcash) return;
    setIsRecheckingNatcash(true);
    setNatcashStatusNote(null);
    const res = await recheckNatcashOrderRemote(currentOrder.id);
    setIsRecheckingNatcash(false);

    if (res.order) {
      setCurrentOrder(res.order);
    }
    if (res.status === 'pending' || res.status === 'error') {
      setNatcashStatusNote(
        res.message ??
          'Resi SMS Natcash la poko valide — verifye kòd la oswa re-eseye nan kèk segonn.'
      );
    }
  };

  const handleUnlockScreenKey = async () => {
    if (!currentOrder?.issuedVipKey || isUnlockingKey) return;
    setIsUnlockingKey(true);
    setUnlockError(null);
    const validation = await validateVipKeyCodeRemote(currentOrder.issuedVipKey);
    setIsUnlockingKey(false);
    if (validation.status !== 'valid' || !validation.record) {
      setUnlockError(validation.error ?? 'Kòd la pa valid oswa li deja itilize.');
      return;
    }
    saveActiveCheckoutOrderId(null);
    onUnlockWithKey(validation.record);
    onClose();
  };

  const handleStartOver = () => {
    saveActiveCheckoutOrderId(null);
    setCurrentOrder(null);
    setFormError(null);
    setNatcashStatusNote(null);
    setUnlockError(null);
  };

  const renderApprovedKeyView = (order: PaymentOrder) => (
    <div className="space-y-5 pt-2">
      <div className="rounded-2xl border border-emerald-400/60 bg-gradient-to-b from-[#10B981]/20 to-[#1C1F24] p-5 text-center space-y-3 shadow-[0_0_32px_rgba(16,185,129,0.22)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981] text-[#0B1410]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-300">
            {order.verifiedBy === 'trongrid'
              ? '⚡ Konfime Otomatikman sou TRON (TRC20)'
              : '✔ Valide pa Sistèm VIP Wesley Music'}
          </p>
          <h3 className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-[#F3F4F6]">
            🎉 MEN KLE VIP OU A!
          </h3>
          <p className="mt-1 text-xs text-[#D1D5DB]">
            Plan: <strong className="text-[#F3F4F6]">{order.planTitle}</strong> ·{' '}
            {order.folders >= 999
              ? "♾️ Aksè Ilimite a L'Infini"
              : `${order.folders} Folder .ZIP`}
          </p>
        </div>

        <div className="rounded-xl bg-[#202429] border border-[#10B981]/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
              Kòd Sekrè VIP Ou (Yon Sèl Fwa)
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-emerald-300 select-all">
              {order.issuedVipKey}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleCopy(order.issuedVipKey || '', 'key')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#262A30] hover:bg-[#363B44] border border-[#363B44] text-xs font-bold text-[#F3F4F6] cursor-pointer shrink-0"
          >
            {copiedField === 'key' ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                <span className="text-emerald-300">Kopye!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#D1D5DB]" />
                <span>📋 Kopye Kle a</span>
              </>
            )}
          </button>
        </div>

        {unlockError && (
          <p className="text-xs text-rose-300 bg-rose-500/15 border border-rose-500/40 rounded-lg px-3 py-2">
            {unlockError}
          </p>
        )}

        <button
          type="button"
          disabled={isUnlockingKey}
          onClick={() => void handleUnlockScreenKey()}
          className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-65 text-[#0B1410] font-display font-extrabold text-sm sm:text-base px-5 py-3.5 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-colors cursor-pointer"
        >
          <KeyRound className="h-5 w-5 shrink-0" />
          <span>
            {isUnlockingKey
              ? 'Ap debloke aksè VIP la...'
              : '🔓 DEBLOKE TOUT FOLDER .ZIP YO KOUNYE A'}
          </span>
        </button>
      </div>
    </div>
  );

  const renderPendingOrderView = (order: PaymentOrder) => (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl border border-amber-400/50 bg-gradient-to-b from-amber-500/10 to-[#1C1F24] p-5 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 border border-amber-400/50 text-amber-300">
          <Clock className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-amber-300 font-bold">
            ⏳ KÒMAND #{order.id} ANREJISTRE
          </p>
          <h3 className="mt-1.5 font-display text-base sm:text-lg font-bold text-[#F3F4F6] leading-snug">
            ⏳ N ap verifye peman ou a... Kle VIP ou ap parèt isit la otomatikman!
          </h3>
          <p className="mt-1.5 text-xs text-[#D1D5DB] leading-relaxed">
            Kite fenèt sa a ouvè sou telefòn ou — kou Admin VIP la valide peman an,{' '}
            <strong className="text-emerald-300">Kle VIP ou a ap parèt touswit an tan reyèl!</strong>
          </p>
        </div>

        <div className="rounded-xl bg-[#202429] border border-[#363B44] p-3.5 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#9CA3AF]">Plan:</span>
            <span className="font-bold text-[#F3F4F6]">{order.planTitle}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#9CA3AF]">Montan:</span>
            <span className="font-mono font-bold text-emerald-300">{order.amountLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#9CA3AF]">Metòd:</span>
            <span className="font-semibold text-[#D1D5DB]">
              {order.method === 'natcash' ? '🇭🇹 Natcash (+509 56568810)' : '🌐 USDT (TRC20)'}
            </span>
          </div>
          {order.buyerPhone && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#9CA3AF]">Telefòn:</span>
              <span className="font-mono text-[#D1D5DB]">{order.buyerPhone}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#9CA3AF]">TxID:</span>
            <span className="font-mono text-amber-200 truncate max-w-[210px]">
              {order.transactionId}
            </span>
          </div>
        </div>

        {natcashStatusNote && (
          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            {natcashStatusNote}
          </p>
        )}

        {order.method === 'natcash' && (
          <button
            type="button"
            disabled={isRecheckingNatcash}
            onClick={() => void handleRecheckNatcash()}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/45 hover:bg-[#10B981]/25 px-4 py-2.5 text-xs font-bold text-emerald-300 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRecheckingNatcash ? 'animate-spin' : ''}`} />
            <span>
              {isRecheckingNatcash
                ? 'Ap re-verifye tranzaksyon an...'
                : '🔄 Re-verifye Tranzaksyon Mwen'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleStartOver}
          className="text-xs text-[#9CA3AF] hover:text-[#F3F4F6] underline underline-offset-4 cursor-pointer"
        >
          Modifye Kòd Tranzaksyon oswa Voye yon Lòt Peman
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161A]/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-checkout-heading"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#262A30] border border-[#363B44] shadow-2xl p-5 sm:p-7 my-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fèmen fenèt peman an"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#363B44] hover:text-[#F3F4F6] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top Selected Plan Summary Header */}
        <div className="pr-10 pb-4 border-b border-[#363B44]">
          <div className="flex items-center gap-2 text-xs font-mono text-[#10B981] font-bold mb-1">
            <span>{country.flag}</span>
            <span>{country.name}</span>
            <span>·</span>
            <span>
              {isHaiti
                ? 'NATCASH DIRÈK'
                : intlMethodTab === 'card'
                  ? 'KAT VISA / APPLE PAY / USDT'
                  : 'USDT (TRC20) INSTANT'}
            </span>
          </div>
          <h2
            id="direct-checkout-heading"
            className="font-display text-lg sm:text-xl font-extrabold text-[#F3F4F6] tracking-tight flex flex-wrap items-center gap-2"
          >
            <span>{activePlanTitle}</span>
            {activePlanBadge && (
              <span className="rounded bg-[#10B981]/15 border border-emerald-400/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                {activePlanBadge}
              </span>
            )}
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">{activePlanSubtitle}</p>
        </div>

        {currentOrder?.status === 'approved' && currentOrder.issuedVipKey ? (
          renderApprovedKeyView(currentOrder)
        ) : currentOrder?.status === 'pending' ? (
          renderPendingOrderView(currentOrder)
        ) : currentOrder?.status === 'rejected' ? (
          <div className="space-y-4 pt-4 text-center">
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-4 text-xs text-rose-200 space-y-2">
              <AlertCircle className="h-6 w-6 text-rose-400 mx-auto" />
              <p className="font-bold text-sm text-rose-200">
                Peman #{currentOrder.transactionId} sa a pa t ka valide.
              </p>
              <p>Verifye kòd tranzaksyon an oswa montan an epi eseye soumèt ankò.</p>
            </div>
            <button
              type="button"
              onClick={handleStartOver}
              className="w-full min-h-[46px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1410] font-display font-bold text-sm cursor-pointer"
            >
              Eseye Ankò
            </button>
          </div>
        ) : isHaiti ? (
          /* 1. HAITI NATCASH DIRECT PAYMENT MODAL */
          <form onSubmit={(e) => void handleNatcashSubmit(e)} className="pt-4 space-y-4">
            <div className="rounded-xl bg-[#1C1F24] border border-[#10B981]/35 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#9CA3AF]">Montan pou Peye:</span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-emerald-300">
                  {haitiPriceLabel}
                </span>
              </div>

              <div className="pt-2 border-t border-[#363B44] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D1D5DB]">
                  <Smartphone className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Voye peman Natcash la sou nimewo sa a:</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-[#262A30] border border-[#363B44] p-3">
                  <span className="font-mono text-lg sm:text-xl font-black tracking-wide text-[#F3F4F6] select-all">
                    {NATCASH_MERCHANT_NUMBER}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy(NATCASH_MERCHANT_NUMBER, 'natcash')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#10B981]/15 border border-[#10B981]/45 hover:bg-[#10B981]/25 text-xs font-bold text-emerald-300 cursor-pointer shrink-0"
                  >
                    {copiedField === 'natcash' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>✔ Nimewo Kopye!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>📋 Kopye Nimewo Natcash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="natcash-sms-textarea"
                    className="block text-xs font-bold text-[#F3F4F6] leading-snug"
                  >
                    📋 Kole Tout Mesaj Konfimasyon Natcash Ou Resevwa a Isit La Nèt
                  </label>
                  <button
                    type="button"
                    onClick={() => void handlePasteNatcashSms()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/45 hover:bg-[#10B981]/25 text-[11px] font-bold text-emerald-300 cursor-pointer shrink-0 transition-colors"
                  >
                    {pasteFeedback ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#10B981]" />
                        <span>{pasteFeedback}</span>
                      </>
                    ) : (
                      <>
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        <span>📋 Kole Mesaj la (Paste)</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="natcash-sms-textarea"
                  rows={4}
                  required
                  value={natcashSmsInput}
                  onChange={(e) => {
                    setNatcashSmsInput(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Kole tout mesaj konfimasyon Natcash ou resevwa a isit la (ki gen montan HTG, +509 56568810, ak Transcode la)..."
                  className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none leading-relaxed resize-y min-h-[104px]"
                />
              </div>

              <div>
                <label
                  htmlFor="natcash-buyer-phone"
                  className="block text-xs font-medium text-[#9CA3AF] mb-1"
                >
                  Nimewo Telefòn Ou (Opsyonèl)
                </label>
                <input
                  id="natcash-buyer-phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Ex: +509 3XXX-XXXX"
                  className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2 text-xs font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-rose-500/15 border border-rose-500/40 px-3 py-2.5 text-xs text-rose-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#059669] via-[#10B981] to-[#059669] hover:brightness-110 disabled:opacity-65 text-[#0B1410] font-display font-extrabold text-xs sm:text-sm px-4 py-3.5 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                  <span>Ap verifye mesaj Natcash la...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>⚡ VERIFYE MESAJ NATCASH &amp; RESEVWA KLE VIP</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs text-[#9CA3AF]">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 hover:text-[#F3F4F6] cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Chwazi yon lòt plan</span>
              </button>
              <span className="inline-flex items-center gap-1 text-[#10B981]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Kle VIP parèt sou ekran an</span>
              </span>
            </div>
          </form>
        ) : (
          /* 2. INTERNATIONAL CHECKOUT: TAB 1 (CARD VISA / MASTERCARD / APPLE PAY) & TAB 2 (DIRECT USDT TRC20) */
          <form onSubmit={(e) => void handleUsdtSubmit(e)} className="pt-4 space-y-4">
            {/* International Method Tabs */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#1C1F24] border border-[#363B44] p-1">
              <button
                type="button"
                onClick={() => {
                  setIntlMethodTab('card');
                  if (formError) setFormError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-[11px] font-display font-extrabold tracking-tight transition-colors cursor-pointer text-center leading-tight ${
                  intlMethodTab === 'card'
                    ? 'bg-[#10B981] text-[#0B1410] shadow-sm'
                    : 'text-[#D1D5DB] hover:text-[#F3F4F6] hover:bg-[#262A30]'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                <span>💳 KAT VISA / MASTERCARD / APPLE PAY</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIntlMethodTab('usdt');
                  if (formError) setFormError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-[11px] font-display font-extrabold tracking-tight transition-colors cursor-pointer text-center leading-tight ${
                  intlMethodTab === 'usdt'
                    ? 'bg-[#10B981] text-[#0B1410] shadow-sm'
                    : 'text-[#D1D5DB] hover:text-[#F3F4F6] hover:bg-[#262A30]'
                }`}
              >
                <QrCode className="h-3.5 w-3.5 shrink-0" />
                <span>⚡ VOYE USDT DIRÈK (TRC20)</span>
              </button>
            </div>

            {intlMethodTab === 'card' ? (
              /* TAB 1: PRE-FILLED CARD-TO-WALLET CHECKOUT (MOONPAY + PAYBIS) */
              <div className="space-y-3.5">
                <div className="rounded-xl bg-[#1C1F24] border border-[#10B981]/35 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[11px] font-semibold text-[#9CA3AF]">
                        Montan pou Peye ak Kat ({displayPriceLabel}):
                      </span>
                      <span className="font-mono text-xl font-black text-emerald-300">
                        {usdtAmount} {fiatCurrency}{' '}
                        <span className="text-xs font-semibold text-[#9CA3AF]">
                          (→ {usdtAmount} USDT TRC20)
                        </span>
                      </span>
                    </div>
                    <span className="rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 text-right">
                      Visa · Mastercard · Apple Pay
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <a
                      href={moonpayCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#059669] via-[#10B981] to-[#059669] hover:brightness-110 text-[#0B1410] font-display font-extrabold text-xs sm:text-sm px-4 py-3 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all text-center"
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>💳 PEYE AK KAT VISA / APPLE PAY KOUNYE A</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>

                    <a
                      href={paybisCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#262A30] hover:bg-[#2E333B] border border-[#363B44] hover:border-[#10B981]/50 text-[#F3F4F6] font-display font-bold text-xs px-4 py-2.5 transition-colors text-center"
                    >
                      <span>🌐 Lòt Pòtay Kat Visa / Mastercard (Paybis)</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                    </a>
                  </div>

                  {/* Clear 2-Step Completion Box */}
                  <div className="rounded-lg bg-[#262A30] border border-[#10B981]/25 p-3 space-y-1.5 text-xs text-[#D1D5DB] leading-relaxed">
                    <p>
                      <strong className="text-emerald-300">1.</strong> Peye montan an ak Kat
                      Visa/Mastercard ou oswa Apple Pay nan fenèt ki ouvri a.
                    </p>
                    <p>
                      <strong className="text-emerald-300">2.</strong> Kole kòd konfimasyon / TxID
                      tranzaksyon an anba a pou w debloke Kle VIP ou touswit!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: DIRECT USDT (TRC20) QR CODE CHECKOUT */
              <div className="rounded-xl bg-[#1C1F24] border border-[#10B981]/35 p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-[11px] font-semibold text-[#9CA3AF]">
                      Montan Egzak pou Voye ({displayPriceLabel}):
                    </span>
                    <span className="font-mono text-xl font-black text-emerald-300">
                      {usdtAmount} USDT
                    </span>
                  </div>
                  <span className="rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-300">
                    Network: TRON / TRC20
                  </span>
                </div>

                {/* Scannable QR Code + Trust Wallet Address */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-[#363B44]">
                  <div className="shrink-0 rounded-xl bg-[#F3F4F6] p-2 shadow-md">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code USDT TRC20"
                        className="h-28 w-28 sm:h-32 sm:w-32 block"
                      />
                    ) : (
                      <div className="h-28 w-28 sm:h-32 sm:w-32 flex items-center justify-center bg-[#E5E7EB] text-[#1C1F24]">
                        <QrCode className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 w-full space-y-2 text-center sm:text-left">
                    <p className="text-[11px] font-semibold text-[#D1D5DB]">
                      Adrès USDT (TRC20) Trust Wallet:
                    </p>
                    <div className="rounded-lg bg-[#262A30] border border-[#363B44] px-3 py-2 font-mono text-xs text-emerald-300 break-all select-all">
                      {USDT_TRC20_WALLET_ADDRESS}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy(USDT_TRC20_WALLET_ADDRESS, 'usdt')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#10B981]/15 border border-[#10B981]/45 hover:bg-[#10B981]/25 text-xs font-bold text-emerald-300 cursor-pointer"
                    >
                      {copiedField === 'usdt' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>✔ Adrès USDT Kopye!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>📋 Kopye Adrès USDT (TRC20)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="usdt-tx-hash-input"
                className="block text-xs font-semibold text-[#D1D5DB] mb-1.5"
              >
                Transaction ID / Hash (TxID)
              </label>
              <input
                id="usdt-tx-hash-input"
                type="text"
                required
                value={txIdInput}
                onChange={(e) => {
                  setTxIdInput(e.target.value.trim());
                  if (formError) setFormError(null);
                }}
                placeholder="Kole 64-karaktè TxID / Hash TRON lan isit la..."
                spellCheck={false}
                className="w-full rounded-xl bg-[#1C1F24] border border-[#363B44] px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#F3F4F6] placeholder:font-sans placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-rose-500/15 border border-rose-500/40 px-3 py-2.5 text-xs text-rose-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isVerifyingTron}
              className="w-full min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#059669] via-[#10B981] to-[#059669] hover:brightness-110 disabled:opacity-65 text-[#0B1410] font-display font-extrabold text-xs sm:text-sm px-4 py-3.5 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            >
              {isSubmitting || isVerifyingTron ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                  <span>
                    {isVerifyingTron
                      ? 'Ap verifye sou TRON (TRC20)...'
                      : 'Ap anrejistre TxID la...'}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>⚡ VERIFYE PEMAN &amp; DEBLOKE KLE VIP</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs text-[#9CA3AF]">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 hover:text-[#F3F4F6] cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Chwazi yon lòt plan</span>
              </button>
              <span className="inline-flex items-center gap-1 text-[#10B981]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verifikasyon TronGrid + VIP</span>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
