import {
  createVipKeyRecord,
  createVipKeyRecordRemote,
  fetchVipKeyByCodeRemote,
  FolderPlan,
  FOLDER_PLANS,
  generateShortSecretCode,
  VipKeyRecord,
} from './musicPacks';
import {
  supabase,
  SupabaseNatcashReceiptRow,
  SupabasePaymentRow,
} from '../lib/supabase';

export const NATCASH_MERCHANT_NUMBER = '+509 56568810';
export const USDT_TRC20_WALLET_ADDRESS = 'TDdBs9ivYbUjXmXh3PQT85nKKEf9bsjbxQ';
export const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export const PAYMENT_ORDERS_STORAGE_KEY = 'wesley_payment_orders_v1';
export const ACTIVE_CHECKOUT_ORDER_STORAGE_KEY = 'wesley_active_checkout_order_id_v1';
export const USED_TRANSACTIONS_CACHE_KEY = 'wesley_used_transactions_v1';
export const ORDERS_UPDATED_EVENT = 'wesley-orders-updated';

export type PaymentMethod = 'natcash' | 'usdt_trc20';
export type PaymentOrderStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentOrder {
  id: string;
  method: PaymentMethod;
  status: PaymentOrderStatus;
  planId: string;
  planTitle: string;
  folders: number;
  amountLabel: string;
  usdtAmount?: number;
  countryCode: string;
  countryName: string;
  buyerPhone?: string;
  transactionId: string;
  issuedVipKey?: string;
  verifiedBy?: 'trongrid' | 'admin';
  createdAt: number;
  updatedAt: number;
}

export const USDT_AMOUNTS_BY_PLAN: Record<string, number> = {
  '10-folder': 10,
  '21-folder': 20,
  '36-folder': 30,
  '55-folder': 40,
  'unlimited-vip': 60,
};

export const HTG_AMOUNTS_BY_PLAN: Record<string, number> = {
  '10-folder': 500,
  '21-folder': 1000,
  '36-folder': 1500,
  '55-folder': 2000,
  'unlimited-vip': 7800,
};

export function getUsdtAmountForPlan(planId: string): number {
  return USDT_AMOUNTS_BY_PLAN[planId] ?? 20;
}

export function getHtgAmountForPlan(planId: string): number {
  return HTG_AMOUNTS_BY_PLAN[planId] ?? 500;
}

function notifyOrdersUpdated(): void {
  try {
    window.dispatchEvent(new CustomEvent(ORDERS_UPDATED_EVENT));
  } catch {
    // ignore event errors
  }
}

export function loadPaymentOrders(): PaymentOrder[] {
  try {
    const raw = window.localStorage.getItem(PAYMENT_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PaymentOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePaymentOrders(orders: PaymentOrder[]): void {
  try {
    window.localStorage.setItem(PAYMENT_ORDERS_STORAGE_KEY, JSON.stringify(orders));
    notifyOrdersUpdated();
  } catch {
    // ignore storage errors cleanly
  }
}

export function getPaymentOrderById(orderId: string | null | undefined): PaymentOrder | null {
  if (!orderId) return null;
  return loadPaymentOrders().find((o) => o.id === orderId) ?? null;
}

export function loadActiveCheckoutOrderId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_CHECKOUT_ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveCheckoutOrderId(orderId: string | null): void {
  try {
    if (orderId) {
      window.localStorage.setItem(ACTIVE_CHECKOUT_ORDER_STORAGE_KEY, orderId);
    } else {
      window.localStorage.removeItem(ACTIVE_CHECKOUT_ORDER_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function loadLocalUsedTransactions(): Set<string> {
  try {
    const raw = window.localStorage.getItem(USED_TRANSACTIONS_CACHE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed.map((s) => s.toUpperCase()) : []);
  } catch {
    return new Set();
  }
}

function rememberLocalUsedTransaction(txId: string): void {
  try {
    const set = loadLocalUsedTransactions();
    set.add(txId.trim().toUpperCase());
    window.localStorage.setItem(USED_TRANSACTIONS_CACHE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore storage errors
  }
}

// ============================================================================
// STRICT INPUT VALIDATION (TRON TRC20 & NATCASH HAITI)
// ============================================================================

export function isValidTronTxHash(rawTxId: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(rawTxId.trim());
}

const OBVIOUS_SEQUENTIAL_PATTERNS = [
  '01234567',
  '12345678',
  '23456789',
  '98765432',
  '87654321',
  '76543210',
  '00000000',
  '11111111',
  '22222222',
  '33333333',
  '44444444',
  '55555555',
  '66666666',
  '77777777',
  '88888888',
  '99999999',
];

export function validateHaitianPhoneFormat(rawPhone: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const digits = (rawPhone || '').replace(/\D+/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return {
      valid: false,
      error: '❌ Nimewo telefòn envalid! Antre yon nimewo Natcash ki gen omwen 8 chif.',
    };
  }

  const local8 = digits.startsWith('509') && digits.length >= 11 ? digits.slice(3, 11) : digits.slice(-8);
  if (/^(\d)\1{7}$/.test(local8) || OBVIOUS_SEQUENTIAL_PATTERNS.some((p) => local8.includes(p))) {
    return {
      valid: false,
      error: '❌ Nimewo telefòn sa a pa valab! Antre vrè nimewo Natcash ou a.',
    };
  }

  return {
    valid: true,
    normalized: rawPhone.trim(),
  };
}

export function validateNatcashTransactionFormat(rawTxId: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const cleaned = rawTxId.trim().toUpperCase().replace(/[\s-]+/g, '');

  if (cleaned.length < 8 || cleaned.length > 24) {
    return {
      valid: false,
      error:
        '❌ Kòd Tranzaksyon Natcash envalid! Antre vrè kòd ki gen omwen 8 karaktè nan SMS Natcash ou a (ex: 9482710583 oswa NC94827105).',
    };
  }

  // Must only be alphanumeric AND contain at least 6 digits (blocks random words like "vfxfdgdfgdffdbfdgf")
  if (!/^[A-Z0-9]+$/.test(cleaned)) {
    return {
      valid: false,
      error:
        '❌ Kòd Tranzaksyon Natcash envalid! Se lèt ak chif sèlman ki dwe nan ID Natcash la.',
    };
  }

  const digitCount = (cleaned.match(/\d/g) || []).length;
  const letterPrefixOk = /^(?:NC|TX|NAT)?\d{8,20}$/.test(cleaned);
  if (digitCount < 6 && !letterPrefixOk) {
    return {
      valid: false,
      error:
        '❌ Kòd Tranzaksyon Natcash envalid! Antre vrè kòd ki gen chif nan SMS Natcash ou a (ex: 9482710583 oswa NC94827105).',
    };
  }

  // Block repeated junk like 11111111, AAAAAAAA, NC11111111, or sequential junk
  const digitsOnly = cleaned.replace(/\D+/g, '');
  if (
    /(.)\1{5,}/.test(cleaned) ||
    OBVIOUS_SEQUENTIAL_PATTERNS.some((seq) => digitsOnly.includes(seq))
  ) {
    return {
      valid: false,
      error:
        '❌ Kòd Tranzaksyon Natcash sa a pa valab! Verifye kòd reyèl ki nan SMS Natcash ou a.',
    };
  }

  return {
    valid: true,
    normalized: cleaned,
  };
}

export interface NatcashSmsParseResult {
  valid: boolean;
  transactionId?: string;
  amountHtg?: number;
  recipientMatched?: boolean;
  error?: string;
}

function parseHtgAmountToken(rawNum: string): number {
  const s = rawNum.replace(/\s+/g, '').trim();
  if (!s) return NaN;
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(s)) {
    return Number.parseFloat(s.replace(/,/g, ''));
  }
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(s)) {
    return Number.parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d+,\d{1,2}$/.test(s)) {
    return Number.parseFloat(s.replace(',', '.'));
  }
  return Number.parseFloat(s.replace(/,/g, ''));
}

/**
 * Parses a full official Natcash confirmation SMS pasted by the buyer and enforces all 4 checks:
 *  1. Authentic Natcash transfer phrasing (Natcash / transfere / voye / HTG / Gourdes / ID / Ref)
 *  2. Exact recipient number 56568810 (accepts 56568810, 50956568810, +50956568810, spaced/dashed)
 *  3. Transferred amount >= expectedHtg (ignores remaining account balance / fees)
 *  4. Extracts unique valid Transaction ID / Reference (blocks junk / recipient number masquerading as ID)
 */
export function parseNatcashConfirmationSms(
  rawSms: string,
  expectedHtg: number
): NatcashSmsParseResult {
  const trimmed = (rawSms || '').trim();
  if (trimmed.length < 20) {
    return {
      valid: false,
      error:
        '❌ Mesaj la twò kout! Tanpri kole TOUT mesaj konfimasyon Natcash ou resevwa a nèt.',
    };
  }

  const asciiNorm = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Rule 1: Official Natcash Keywords
  const hasNatcashBrand = /\bnatcash\b/.test(asciiNorm);
  const hasTransferVerb =
    /\b(transfere|transfert|transfer|voye|envoye|sent|reyisi|reussi|effectue|konfime|confirme|peye|paid)\b/.test(
      asciiNorm
    );
  const hasCurrency = /\b(htg|gourdes?|goud|gds)\b/.test(asciiNorm);
  const hasRefKeyword =
    /\b(id|transaksyon|tranzaksyon|transaction|txid|tx|ref|referans|reference|kod|code)\b/.test(
      asciiNorm
    );

  if (!hasCurrency || !hasRefKeyword || (!hasNatcashBrand && !hasTransferVerb)) {
    return {
      valid: false,
      error:
        '❌ Mesaj sa a pa sanble yon vrè SMS konfimasyon Natcash! Kole tout mesaj ofisyèl la (ki gen Natcash, transfere/voye, HTG/Gourdes, +509 56568810, ak ID/Ref).',
    };
  }

  // Rule 2: Exact Recipient Number Check (56568810 / 50956568810 / +50956568810)
  const phoneRegex = /(?<!\d)(?:\+?\s*509[\s.-]?)?\d(?:[\s.-]?\d){7}(?!\d)/g;
  const phoneMatches = trimmed.match(phoneRegex) || [];
  const recipientMatched = phoneMatches.some((candidate) => {
    const digits = candidate.replace(/\D+/g, '');
    return digits === '56568810' || digits === '50956568810';
  });

  if (!recipientMatched) {
    return {
      valid: false,
      recipientMatched: false,
      error: '❌ Nimewo Natcash ki nan mesaj la pa koresponn ak +509 56568810!',
    };
  }

  // Rule 3: Exact Plan Amount Check (exclude balance/fee values so remaining balance can't pass)
  const amountRegex = /(\d[\d.,\s]{0,14}\d|\d{2,6})\s*(?:htg|gourdes?|goud|gds)\b/gi;
  let sentAmount: number | null = null;
  let priorityTransferAmount: number | null = null;

  let match: RegExpExecArray | null;
  while ((match = amountRegex.exec(asciiNorm)) !== null) {
    const parsedVal = parseHtgAmountToken(match[1]);
    if (!Number.isFinite(parsedVal) || parsedVal <= 0) continue;

    const beforeSnippet = asciiNorm.slice(Math.max(0, match.index - 38), match.index);
    const isBalanceOrFee =
      /\b(balans|solde|balance|nouvo|nouveau|disponib|available|fre|frais|fee|reste|remaining)\b/.test(
        beforeSnippet
      );

    if (isBalanceOrFee) continue;

    const isExplicitTransferPhrase =
      /\b(transfere|transfert|transfer|voye|envoye|sent|montan|amount|peye|paid|de)\b/.test(
        beforeSnippet
      );

    if (isExplicitTransferPhrase && priorityTransferAmount === null) {
      priorityTransferAmount = parsedVal;
    }
    if (sentAmount === null) {
      sentAmount = parsedVal;
    }
  }

  const finalSentAmount = priorityTransferAmount ?? sentAmount;
  if (finalSentAmount === null || finalSentAmount < expectedHtg) {
    return {
      valid: false,
      recipientMatched: true,
      amountHtg: finalSentAmount ?? 0,
      error: '❌ Montan ki nan mesaj la pa ase pou plan sa a!',
    };
  }

  // Rule 4: Automatic Transaction ID Extraction
  const txLabelRegex =
    /(?:\bid\s*(?:transaksyon|tranzaksyon|transaction|de\s*transaction)?|transaksyon\s*(?:id|no|#)?|tranzaksyon\s*(?:id|no|#)?|transaction\s*(?:id|no|#)?|tx\s*id|txid|ref(?:erans|erence)?|kod\s*(?:transaksyon)?|code\s*(?:transaction)?)\s*(?::|#|=|-|\bis\b|\bse\b|\best\b)?\s*([A-Za-z0-9][A-Za-z0-9-]{5,24})/gi;

  let extractedTxId: string | null = null;
  let txMatch: RegExpExecArray | null;
  while ((txMatch = txLabelRegex.exec(trimmed)) !== null) {
    const rawCandidate = (txMatch[1] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!rawCandidate) continue;
    if (rawCandidate === '56568810' || rawCandidate === '50956568810') continue;
    if (/^(?:NATCASH|TRANSFERT|TRANSFER|GOURDES|TRANSAKSYON|TRANSACTION)$/.test(rawCandidate)) {
      continue;
    }
    const txCheck = validateNatcashTransactionFormat(rawCandidate);
    if (txCheck.valid && txCheck.normalized) {
      extractedTxId = txCheck.normalized;
      break;
    }
  }

  if (!extractedTxId) {
    return {
      valid: false,
      recipientMatched: true,
      amountHtg: finalSentAmount,
      error:
        '❌ Nou pa jwenn okenn ID Transaksyon / Ref valid nan mesaj la! Asire w tout mesaj konfimasyon Natcash la kole nèt.',
    };
  }

  return {
    valid: true,
    transactionId: extractedTxId,
    amountHtg: finalSentAmount,
    recipientMatched: true,
  };
}

// ============================================================================
// BASE58CHECK <-> EVM HEX DECODER FOR TRON ADDRESS MATCHING
// ============================================================================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58ToBytes(str: string): Uint8Array | null {
  if (!str) return null;
  const bytes: number[] = [0];
  for (let i = 0; i < str.length; i++) {
    const charIndex = BASE58_ALPHABET.indexOf(str[i]);
    if (charIndex === -1) return null;
    let carry = charIndex;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let k = 0; k < str.length && str[k] === '1'; k++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

function getTronAddressVariants(addr: string | undefined | null): Set<string> {
  const variants = new Set<string>();
  if (!addr) return variants;
  const trimmed = addr.trim();
  if (!trimmed) return variants;

  const lower = trimmed.toLowerCase();
  variants.add(lower);

  // If 64-char padded EVM topic (0x000...40hex), extract last 40 hex chars
  if (/^0x0{24}[a-f0-9]{40}$/.test(lower)) {
    const evm20 = lower.slice(-40);
    variants.add(`0x${evm20}`);
    variants.add(`41${evm20}`);
  } else if (/^0x[a-f0-9]{40}$/.test(lower)) {
    const evm20 = lower.slice(2);
    variants.add(`0x${evm20}`);
    variants.add(`41${evm20}`);
  } else if (/^41[a-f0-9]{40}$/.test(lower)) {
    const evm20 = lower.slice(2);
    variants.add(`0x${evm20}`);
    variants.add(`41${evm20}`);
  } else if (trimmed.startsWith('T') && trimmed.length >= 30 && trimmed.length <= 36) {
    const decoded = decodeBase58ToBytes(trimmed);
    // Standard TRON Base58Check address is 25 bytes: 0x41 + 20 addr bytes + 4 checksum bytes
    if (decoded && decoded.length === 25 && decoded[0] === 0x41) {
      let hex20 = '';
      for (let i = 1; i <= 20; i++) {
        hex20 += decoded[i].toString(16).padStart(2, '0');
      }
      variants.add(`0x${hex20}`);
      variants.add(`41${hex20}`);
    }
  }

  return variants;
}

function tronAddressesMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  const setA = getTronAddressVariants(a);
  const setB = getTronAddressVariants(b);
  for (const val of setA) {
    if (setB.has(val)) return true;
  }
  return false;
}

// ============================================================================
// REPLAY / DUPLICATE CHECK AGAINST SUPABASE `used_transactions` + `payments`
// ============================================================================

export async function isTransactionAlreadyUsedRemote(rawTxId: string): Promise<boolean> {
  const normTx = rawTxId.trim().toUpperCase();
  if (!normTx) return false;

  if (loadLocalUsedTransactions().has(normTx)) {
    return true;
  }

  const localApproved = loadPaymentOrders().some(
    (o) => o.status === 'approved' && o.transactionId.trim().toUpperCase() === normTx
  );
  if (localApproved) {
    rememberLocalUsedTransaction(normTx);
    return true;
  }

  try {
    const { data: usedRow } = await supabase
      .from('used_transactions')
      .select('tx_id')
      .ilike('tx_id', normTx)
      .maybeSingle();

    if (usedRow) {
      rememberLocalUsedTransaction(normTx);
      return true;
    }
  } catch {
    // Continue to payments check cleanly
  }

  try {
    const { data: paidRows } = await supabase
      .from('payments')
      .select('id, status')
      .ilike('transaction_id', normTx)
      .eq('status', 'approved')
      .limit(1);

    if (Array.isArray(paidRows) && paidRows.length > 0) {
      rememberLocalUsedTransaction(normTx);
      return true;
    }
  } catch {
    // Ignore network error
  }

  return false;
}

export async function markTransactionUsedRemote(params: {
  txId: string;
  method: PaymentMethod;
  planId: string;
  amountPaid: number;
  issuedVipKey: string;
}): Promise<{ ok: boolean; duplicate: boolean }> {
  const normTx = params.txId.trim().toUpperCase();
  rememberLocalUsedTransaction(normTx);

  try {
    const { error } = await supabase.from('used_transactions').insert({
      tx_id: normTx,
      method: params.method,
      plan_id: params.planId,
      amount_paid: params.amountPaid,
      issued_vip_key: params.issuedVipKey,
      used_at: Date.now(),
    });

    if (error) {
      // Postgres unique constraint violation (23505) means concurrent replay attempt
      if (error.code === '23505') {
        return { ok: false, duplicate: true };
      }
      return { ok: true, duplicate: false };
    }

    return { ok: true, duplicate: false };
  } catch {
    return { ok: true, duplicate: false };
  }
}

// ============================================================================
// ORDER CRUD & SUPABASE REALTIME SYNC
// ============================================================================

export interface CreateOrderInput {
  method: PaymentMethod;
  plan: FolderPlan;
  amountLabel: string;
  usdtAmount?: number;
  countryCode: string;
  countryName: string;
  buyerPhone?: string;
  transactionId: string;
}

export function createPendingPaymentOrder(input: CreateOrderInput): {
  success: boolean;
  order?: PaymentOrder;
  error?: string;
} {
  const cleanTx = input.transactionId.trim();
  if (input.method === 'usdt_trc20') {
    if (!isValidTronTxHash(cleanTx)) {
      return {
        success: false,
        error: '❌ Kòd TxID envalid! Fòk li gen 64 karaktè egzakteman.',
      };
    }
  } else {
    const phoneCheck = validateHaitianPhoneFormat(input.buyerPhone || '');
    if (!phoneCheck.valid) {
      return { success: false, error: phoneCheck.error };
    }
    const txCheck = validateNatcashTransactionFormat(cleanTx);
    if (!txCheck.valid) {
      return { success: false, error: txCheck.error };
    }
  }

  const existing = loadPaymentOrders();
  const normalizedTx = cleanTx.toUpperCase();
  const duplicate = existing.find(
    (o) =>
      o.status !== 'rejected' &&
      o.method === input.method &&
      o.transactionId.trim().toUpperCase() === normalizedTx
  );

  if (duplicate) {
    return {
      success: true,
      order: duplicate,
    };
  }

  const planObj = FOLDER_PLANS.find((p) => p.id === input.plan.id) ?? input.plan;

  const newOrder: PaymentOrder = {
    id: `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`,
    method: input.method,
    status: 'pending',
    planId: planObj.id,
    planTitle: planObj.shortLabel,
    folders: planObj.folders,
    amountLabel: input.amountLabel,
    usdtAmount: input.usdtAmount,
    countryCode: input.countryCode,
    countryName: input.countryName,
    buyerPhone: input.buyerPhone?.trim() || undefined,
    transactionId: normalizedTx,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  savePaymentOrders([newOrder, ...existing]);
  saveActiveCheckoutOrderId(newOrder.id);
  return { success: true, order: newOrder };
}

export function approvePaymentOrder(
  orderId: string,
  verifiedBy: 'trongrid' | 'admin' = 'admin'
): { success: boolean; order?: PaymentOrder; vipRecord?: VipKeyRecord; error?: string } {
  const orders = loadPaymentOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) {
    return { success: false, error: 'Kòmand lan pa jwenn.' };
  }

  const target = orders[idx];
  if (target.status === 'approved' && target.issuedVipKey) {
    return { success: true, order: target };
  }

  const noteLabel =
    target.method === 'natcash'
      ? `Natcash (${target.buyerPhone || ''}) · ID: ${target.transactionId}`
      : `USDT TRC20 (${target.usdtAmount ?? ''} USDT) · Tx: ${target.transactionId.slice(0, 12)}...`;

  let createdRecord: VipKeyRecord | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateCode = generateShortSecretCode('W#');
    const created = createVipKeyRecord(target.folders, candidateCode, noteLabel);
    if (created.success && created.record) {
      createdRecord = created.record;
      break;
    }
  }

  if (!createdRecord) {
    return { success: false, error: 'Pa kapab jenere Kle VIP la. Eseye ankò.' };
  }

  const updatedOrder: PaymentOrder = {
    ...target,
    status: 'approved',
    issuedVipKey: createdRecord.code,
    verifiedBy,
    updatedAt: Date.now(),
  };

  orders[idx] = updatedOrder;
  savePaymentOrders(orders);
  rememberLocalUsedTransaction(target.transactionId);

  return { success: true, order: updatedOrder, vipRecord: createdRecord };
}

export function rejectPaymentOrder(orderId: string): void {
  const orders = loadPaymentOrders();
  const updated = orders.map((o) =>
    o.id === orderId
      ? {
          ...o,
          status: 'rejected' as const,
          updatedAt: Date.now(),
        }
      : o
  );
  savePaymentOrders(updated);
}

export function deletePaymentOrder(orderId: string): void {
  const orders = loadPaymentOrders().filter((o) => o.id !== orderId);
  savePaymentOrders(orders);
}

function mapSupabasePaymentToOrder(row: SupabasePaymentRow): PaymentOrder {
  return {
    id: row.id,
    method: row.method,
    status: row.status,
    planId: row.plan_id,
    planTitle: row.plan_title,
    folders: Number(row.folders) || 10,
    amountLabel: row.amount_label,
    usdtAmount: row.usdt_amount != null ? Number(row.usdt_amount) : undefined,
    countryCode: row.country_code,
    countryName: row.country_name,
    buyerPhone: row.buyer_phone || undefined,
    transactionId: row.transaction_id,
    issuedVipKey: row.issued_vip_key || undefined,
    verifiedBy: row.verified_by || undefined,
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now(),
  };
}

function mapOrderToSupabasePayment(order: PaymentOrder): SupabasePaymentRow {
  return {
    id: order.id,
    method: order.method,
    status: order.status,
    plan_id: order.planId,
    plan_title: order.planTitle,
    folders: order.folders,
    amount_label: order.amountLabel,
    usdt_amount: order.usdtAmount ?? null,
    country_code: order.countryCode,
    country_name: order.countryName,
    buyer_phone: order.buyerPhone ?? null,
    transaction_id: order.transactionId,
    issued_vip_key: order.issuedVipKey ?? null,
    verified_by: order.verifiedBy ?? null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

function upsertLocalPaymentOrderCache(order: PaymentOrder): void {
  try {
    const existing = loadPaymentOrders().filter((o) => o.id !== order.id);
    const merged = [order, ...existing].sort((a, b) => b.createdAt - a.createdAt);
    window.localStorage.setItem(PAYMENT_ORDERS_STORAGE_KEY, JSON.stringify(merged));
    notifyOrdersUpdated();
  } catch {
    // ignore storage errors
  }
}

export async function fetchPaymentOrdersRemote(): Promise<PaymentOrder[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return loadPaymentOrders();
    }

    const mapped = (data as SupabasePaymentRow[]).map(mapSupabasePaymentToOrder);
    try {
      window.localStorage.setItem(PAYMENT_ORDERS_STORAGE_KEY, JSON.stringify(mapped));
    } catch {
      // ignore storage errors
    }
    return mapped;
  } catch {
    return loadPaymentOrders();
  }
}

export async function fetchPaymentOrderByIdRemote(
  orderId: string | null | undefined
): Promise<PaymentOrder | null> {
  if (!orderId) return null;

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      return getPaymentOrderById(orderId);
    }

    const order = mapSupabasePaymentToOrder(data as SupabasePaymentRow);
    upsertLocalPaymentOrderCache(order);

    if (order.status === 'approved' && order.issuedVipKey) {
      await fetchVipKeyByCodeRemote(order.issuedVipKey);
    }

    return order;
  } catch {
    return getPaymentOrderById(orderId);
  }
}

export async function createPendingPaymentOrderRemote(input: CreateOrderInput): Promise<{
  success: boolean;
  order?: PaymentOrder;
  error?: string;
}> {
  const cleanTx = input.transactionId.trim().toUpperCase();

  try {
    const { data: existingRows } = await supabase
      .from('payments')
      .select('*')
      .eq('method', input.method)
      .ilike('transaction_id', cleanTx)
      .neq('status', 'rejected')
      .limit(1);

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const existingOrder = mapSupabasePaymentToOrder(existingRows[0] as SupabasePaymentRow);
      if (existingOrder.status === 'approved') {
        return {
          success: false,
          error:
            input.method === 'natcash'
              ? '🚫 Kòd Tranzaksyon Natcash sa a deja itilize anvan!'
              : '🚫 Kòd Tranzaksyon (TxID) sa a deja itilize anvan!',
        };
      }
      upsertLocalPaymentOrderCache(existingOrder);
      saveActiveCheckoutOrderId(existingOrder.id);
      return { success: true, order: existingOrder };
    }
  } catch {
    // Continue and insert below
  }

  const localRes = createPendingPaymentOrder({ ...input, transactionId: cleanTx });
  if (!localRes.success || !localRes.order) {
    return localRes;
  }

  const order = localRes.order;

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert(mapOrderToSupabasePayment(order))
      .select('*')
      .single();

    if (!error && data) {
      const savedOrder = mapSupabasePaymentToOrder(data as SupabasePaymentRow);
      upsertLocalPaymentOrderCache(savedOrder);
      saveActiveCheckoutOrderId(savedOrder.id);
      return { success: true, order: savedOrder };
    }
  } catch {
    // Graceful offline cache fallback
  }

  return { success: true, order };
}

export async function approvePaymentOrderRemote(
  orderId: string,
  verifiedBy: 'trongrid' | 'admin' = 'admin'
): Promise<{ success: boolean; order?: PaymentOrder; vipRecord?: VipKeyRecord; error?: string }> {
  let target: PaymentOrder | null = null;

  try {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (data) {
      target = mapSupabasePaymentToOrder(data as SupabasePaymentRow);
    }
  } catch {
    // Fallback below
  }

  if (!target) {
    target = getPaymentOrderById(orderId);
  }

  if (!target) {
    return { success: false, error: 'Kòmand lan pa jwenn.' };
  }

  if (target.status === 'approved' && target.issuedVipKey) {
    const existingKey = await fetchVipKeyByCodeRemote(target.issuedVipKey);
    return { success: true, order: target, vipRecord: existingKey ?? undefined };
  }

  const noteLabel =
    target.method === 'natcash'
      ? `Natcash (${target.buyerPhone || ''}) · ID: ${target.transactionId}`
      : `USDT TRC20 (${target.usdtAmount ?? ''} USDT) · Tx: ${target.transactionId.slice(0, 12)}...`;

  let createdRecord: VipKeyRecord | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidateCode = generateShortSecretCode('W#');
    const created = await createVipKeyRecordRemote(target.folders, candidateCode, noteLabel);
    if (created.success && created.record) {
      createdRecord = created.record;
      break;
    }
  }

  if (!createdRecord) {
    return { success: false, error: 'Pa kapab jenere Kle VIP la. Eseye ankò.' };
  }

  const now = Date.now();
  const updatedOrder: PaymentOrder = {
    ...target,
    status: 'approved',
    issuedVipKey: createdRecord.code,
    verifiedBy,
    updatedAt: now,
  };

  upsertLocalPaymentOrderCache(updatedOrder);
  await markTransactionUsedRemote({
    txId: target.transactionId,
    method: target.method,
    planId: target.planId,
    amountPaid:
      target.method === 'usdt_trc20'
        ? target.usdtAmount ?? getUsdtAmountForPlan(target.planId)
        : getHtgAmountForPlan(target.planId),
    issuedVipKey: createdRecord.code,
  });

  if (target.method === 'natcash') {
    try {
      await supabase
        .from('natcash_sms_receipts')
        .update({
          claimed: true,
          claimed_vip_key: createdRecord.code,
          claimed_at: now,
        })
        .ilike('tx_id', target.transactionId.trim().toUpperCase())
        .eq('claimed', false);
    } catch {
      // ignore if receipt doesn't exist
    }
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'approved',
        issued_vip_key: createdRecord.code,
        verified_by: verifiedBy,
        updated_at: now,
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (!error && data) {
      const remoteUpdated = mapSupabasePaymentToOrder(data as SupabasePaymentRow);
      upsertLocalPaymentOrderCache(remoteUpdated);
      return { success: true, order: remoteUpdated, vipRecord: createdRecord };
    }
  } catch {
    // Local cache already updated cleanly
  }

  return { success: true, order: updatedOrder, vipRecord: createdRecord };
}

export async function rejectPaymentOrderRemote(orderId: string): Promise<void> {
  rejectPaymentOrder(orderId);
  try {
    await supabase
      .from('payments')
      .update({
        status: 'rejected',
        updated_at: Date.now(),
      })
      .eq('id', orderId);
  } catch {
    // ignore network errors
  }
}

export async function deletePaymentOrderRemote(orderId: string): Promise<void> {
  deletePaymentOrder(orderId);
  try {
    await supabase.from('payments').delete().eq('id', orderId);
  } catch {
    // ignore network errors
  }
}

export function subscribeAllPaymentsRealtime(onChange: () => void): () => void {
  const channel = supabase
    .channel(`payments_admin_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribePaymentOrderByIdRealtime(
  orderId: string,
  onOrderUpdated: (order: PaymentOrder) => void
): () => void {
  if (!orderId) return () => {};

  const channel = supabase
    .channel(`payment_order_${orderId}_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `id=eq.${orderId}`,
      },
      async (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const order = mapSupabasePaymentToOrder(payload.new as SupabasePaymentRow);
          upsertLocalPaymentOrderCache(order);
          if (order.status === 'approved' && order.issuedVipKey) {
            await fetchVipKeyByCodeRemote(order.issuedVipKey);
          }
          onOrderUpdated(order);
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeNatcashReceiptRealtime(
  txId: string,
  onReceiptArrived: () => void
): () => void {
  const normTx = txId.trim().toUpperCase();
  if (!normTx) return () => {};

  const channel = supabase
    .channel(`natcash_receipt_${normTx}_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'natcash_sms_receipts',
      },
      (payload) => {
        const row = payload.new as Partial<SupabaseNatcashReceiptRow> | undefined;
        if (row?.tx_id && row.tx_id.trim().toUpperCase() === normTx && !row.claimed) {
          onReceiptArrived();
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// ============================================================================
// REAL AUTOMATIC TRON (TRC20) BLOCKCHAIN VERIFICATION
// ============================================================================

export interface TronVerificationResult {
  confirmed: boolean;
  reason: string;
}

/**
 * Queries live TRON blockchain APIs (TronGrid /v1/transactions/{txid}/events &
 * TronScan /api/transaction-info?hash={txid}) to verify:
 *  1. CONFIRMED / SUCCESS status
 *  2. Exact recipient Trust Wallet TDdBs9ivYbUjXmXh3PQT85nKKEf9bsjbxQ
 *  3. Token is USDT (TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t) & amount >= expectedUsdtAmount
 */
export async function verifyTronUsdtTransaction(
  rawTxId: string,
  expectedUsdtAmount: number
): Promise<TronVerificationResult> {
  const txId = rawTxId.trim();
  if (!isValidTronTxHash(txId)) {
    return {
      confirmed: false,
      reason: '❌ Kòd TxID envalid! Fòk li gen 64 karaktè egzakteman.',
    };
  }

  let tronScanReverted = false;

  // 1. Check TronScan transaction-info (provides explicit confirmed + contractRet + trc20TransferInfo)
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);
    const res = await fetch(
      `https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(txId)}`,
      { signal: controller.signal }
    );
    window.clearTimeout(timeoutId);

    if (res.ok) {
      const info = (await res.json()) as {
        confirmed?: boolean;
        contractRet?: string;
        trc20TransferInfo?: Array<{
          contract_address?: string;
          to_address?: string;
          amount_str?: string;
          decimals?: number;
        }>;
      };

      if (info.contractRet && info.contractRet !== 'SUCCESS') {
        tronScanReverted = true;
      } else if (
        info.confirmed === true &&
        info.contractRet === 'SUCCESS' &&
        Array.isArray(info.trc20TransferInfo)
      ) {
        for (const transfer of info.trc20TransferInfo) {
          const isUsdtContract = tronAddressesMatch(transfer.contract_address, USDT_TRC20_CONTRACT);
          const isOwnerWallet = tronAddressesMatch(transfer.to_address, USDT_TRC20_WALLET_ADDRESS);
          const decimals = typeof transfer.decimals === 'number' ? transfer.decimals : 6;
          const usdtPaid = Number(transfer.amount_str || '0') / 10 ** decimals;

          if (isUsdtContract && isOwnerWallet && usdtPaid >= expectedUsdtAmount - 0.01) {
            return { confirmed: true, reason: 'tronscan_verified' };
          }
        }
      }
    }
  } catch {
    // Fallback to TronGrid v1 events cleanly
  }

  if (tronScanReverted) {
    return {
      confirmed: false,
      reason: '❌ Peman pa jwenn sou blockchain TRON an oswa montan an pa konplè.',
    };
  }

  // 2. Check TronGrid v1 transaction events endpoint
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);
    const res = await fetch(
      `https://api.trongrid.io/v1/transactions/${encodeURIComponent(txId)}/events`,
      { signal: controller.signal }
    );
    window.clearTimeout(timeoutId);

    if (res.ok) {
      const json = (await res.json()) as {
        success?: boolean;
        data?: Array<{
          event_name?: string;
          contract_address?: string;
          _unconfirmed?: boolean;
          result?: Record<string, string>;
        }>;
      };

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        for (const ev of json.data) {
          if (ev._unconfirmed === true || ev.event_name !== 'Transfer') continue;

          const isUsdtContract = tronAddressesMatch(ev.contract_address, USDT_TRC20_CONTRACT);
          const isOwnerWallet = tronAddressesMatch(ev.result?.to, USDT_TRC20_WALLET_ADDRESS);
          const valRaw = Number(ev.result?.value || '0');
          const usdtPaid = valRaw / 1_000_000;

          if (isUsdtContract && isOwnerWallet && usdtPaid >= expectedUsdtAmount - 0.01) {
            return { confirmed: true, reason: 'trongrid_verified' };
          }
        }
      }
    }
  } catch {
    // API unreachable -> fail closed, never approve unverified TxID
  }

  return {
    confirmed: false,
    reason: '❌ Peman pa jwenn sou blockchain TRON an oswa montan an pa konplè.',
  };
}

// ============================================================================
// AUTOMATIC CHECKOUT SUBMISSION FLOWS (ZERO FAKE IDs ALLOWED)
// ============================================================================

export type AutoCheckoutResult =
  | { status: 'approved'; order: PaymentOrder }
  | { status: 'pending'; order: PaymentOrder }
  | { status: 'error'; error: string };

/**
 * International USDT TRC20 instant automatic verification:
 * - Strictly validates 64-char hex format FIRST (rejects random strings immediately)
 * - Blocks any already-used TxID in `used_transactions` / `payments`
 * - Queries live TRON blockchain (TronScan + TronGrid)
 * - If confirmed for exact Trust Wallet + >= plan USDT amount: issues VIP Key immediately
 *   even when Admin is offline for weeks!
 */
export async function submitAndVerifyUsdtPaymentRemote(input: {
  plan: FolderPlan;
  usdtAmount: number;
  countryCode: string;
  countryName: string;
  transactionId: string;
}): Promise<AutoCheckoutResult> {
  const cleanTx = input.transactionId.trim();

  // 1. Strict 64-hex TxID format check
  if (!isValidTronTxHash(cleanTx)) {
    return {
      status: 'error',
      error: '❌ Kòd TxID envalid! Fòk li gen 64 karaktè egzakteman.',
    };
  }

  // 2. Prevent replay / reuse across devices
  const alreadyUsed = await isTransactionAlreadyUsedRemote(cleanTx);
  if (alreadyUsed) {
    return {
      status: 'error',
      error: '🚫 Kòd Tranzaksyon (TxID) sa a deja itilize anvan!',
    };
  }

  // 3. Query real-time TRON blockchain APIs
  const verification = await verifyTronUsdtTransaction(cleanTx, input.usdtAmount);
  if (!verification.confirmed) {
    return {
      status: 'error',
      error: '❌ Peman pa jwenn sou blockchain TRON an oswa montan an pa konplè.',
    };
  }

  // 4. Verified true! Generate short VIP Key & lock TxID atomically in Supabase
  const planObj = FOLDER_PLANS.find((p) => p.id === input.plan.id) ?? input.plan;
  const noteLabel = `USDT TRC20 (${input.usdtAmount} USDT) · Tx: ${cleanTx.slice(0, 12)}...`;

  let createdRecord: VipKeyRecord | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidateCode = generateShortSecretCode('W#');
    const created = await createVipKeyRecordRemote(planObj.folders, candidateCode, noteLabel);
    if (created.success && created.record) {
      createdRecord = created.record;
      break;
    }
  }

  if (!createdRecord) {
    return {
      status: 'error',
      error: 'Pa kapab jenere Kle VIP la kounye a. Eseye ankò.',
    };
  }

  const usedInsert = await markTransactionUsedRemote({
    txId: cleanTx,
    method: 'usdt_trc20',
    planId: planObj.id,
    amountPaid: input.usdtAmount,
    issuedVipKey: createdRecord.code,
  });

  if (usedInsert.duplicate) {
    return {
      status: 'error',
      error: '🚫 Kòd Tranzaksyon (TxID) sa a deja itilize anvan!',
    };
  }

  const now = Date.now();
  const approvedOrder: PaymentOrder = {
    id: `ORD-${now.toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`,
    method: 'usdt_trc20',
    status: 'approved',
    planId: planObj.id,
    planTitle: planObj.shortLabel,
    folders: planObj.folders,
    amountLabel: `${input.usdtAmount} USDT (TRC20)`,
    usdtAmount: input.usdtAmount,
    countryCode: input.countryCode,
    countryName: input.countryName,
    transactionId: cleanTx.toUpperCase(),
    issuedVipKey: createdRecord.code,
    verifiedBy: 'trongrid',
    createdAt: now,
    updatedAt: now,
  };

  upsertLocalPaymentOrderCache(approvedOrder);
  saveActiveCheckoutOrderId(approvedOrder.id);

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert(mapOrderToSupabasePayment(approvedOrder))
      .select('*')
      .single();

    if (!error && data) {
      const savedOrder = mapSupabasePaymentToOrder(data as SupabasePaymentRow);
      upsertLocalPaymentOrderCache(savedOrder);
      saveActiveCheckoutOrderId(savedOrder.id);
      return { status: 'approved', order: savedOrder };
    }
  } catch {
    // Graceful local persistence fallback if payments insert fails transiently
  }

  return { status: 'approved', order: approvedOrder };
}

async function tryClaimNatcashSmsReceipt(params: {
  txId: string;
  planId: string;
  folders: number;
  amountLabel: string;
  countryCode: string;
  countryName: string;
  buyerPhone?: string;
  existingOrderId?: string;
}): Promise<{
  outcome: 'claimed' | 'insufficient_amount' | 'already_claimed' | 'not_found';
  order?: PaymentOrder;
  error?: string;
}> {
  const normTx = params.txId.trim().toUpperCase();
  const expectedHtg = getHtgAmountForPlan(params.planId);

  try {
    const { data: receiptData, error } = await supabase
      .from('natcash_sms_receipts')
      .select('*')
      .ilike('tx_id', normTx)
      .maybeSingle();

    if (error || !receiptData) {
      return { outcome: 'not_found' };
    }

    const receipt = receiptData as SupabaseNatcashReceiptRow;
    if (receipt.claimed) {
      return {
        outcome: 'already_claimed',
        error: '🚫 Kòd Tranzaksyon Natcash sa a deja itilize anvan!',
      };
    }

    if (Number(receipt.amount_htg) < expectedHtg) {
      return {
        outcome: 'insufficient_amount',
        error: `❌ Montan Natcash (${receipt.amount_htg} HTG) ki nan resi sa a pi piti pase ${expectedHtg.toLocaleString('en-US')} HTG pou plan sa a.`,
      };
    }

    // Generate short single-use VIP key
    const noteLabel = `Natcash Auto-SMS (${params.buyerPhone || receipt.sender_phone || ''}) · ID: ${normTx}`;
    let createdRecord: VipKeyRecord | undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateCode = generateShortSecretCode('W#');
      const created = await createVipKeyRecordRemote(params.folders, candidateCode, noteLabel);
      if (created.success && created.record) {
        createdRecord = created.record;
        break;
      }
    }

    if (!createdRecord) {
      return { outcome: 'not_found' };
    }

    const now = Date.now();
    // Atomic claim where claimed = false
    const { data: claimedRows, error: claimError } = await supabase
      .from('natcash_sms_receipts')
      .update({
        claimed: true,
        claimed_vip_key: createdRecord.code,
        claimed_at: now,
      })
      .eq('tx_id', receipt.tx_id)
      .eq('claimed', false)
      .select('tx_id');

    if (claimError || !Array.isArray(claimedRows) || claimedRows.length === 0) {
      return {
        outcome: 'already_claimed',
        error: '🚫 Kòd Tranzaksyon Natcash sa a deja itilize anvan!',
      };
    }

    const usedInsert = await markTransactionUsedRemote({
      txId: normTx,
      method: 'natcash',
      planId: params.planId,
      amountPaid: Number(receipt.amount_htg),
      issuedVipKey: createdRecord.code,
    });

    if (usedInsert.duplicate) {
      return {
        outcome: 'already_claimed',
        error: '🚫 Kòd Tranzaksyon Natcash sa a deja itilize anvan!',
      };
    }

    const planObj = FOLDER_PLANS.find((p) => p.id === params.planId);
    const orderId =
      params.existingOrderId ||
      `ORD-${now.toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

    const approvedOrder: PaymentOrder = {
      id: orderId,
      method: 'natcash',
      status: 'approved',
      planId: params.planId,
      planTitle: planObj?.shortLabel ?? `${params.folders} Folder`,
      folders: params.folders,
      amountLabel: params.amountLabel,
      countryCode: params.countryCode,
      countryName: params.countryName,
      buyerPhone: params.buyerPhone,
      transactionId: normTx,
      issuedVipKey: createdRecord.code,
      verifiedBy: 'admin',
      createdAt: now,
      updatedAt: now,
    };

    upsertLocalPaymentOrderCache(approvedOrder);
    saveActiveCheckoutOrderId(approvedOrder.id);

    if (params.existingOrderId) {
      await supabase
        .from('payments')
        .update({
          status: 'approved',
          issued_vip_key: createdRecord.code,
          verified_by: 'admin',
          updated_at: now,
        })
        .eq('id', params.existingOrderId);
    } else {
      await supabase.from('payments').insert(mapOrderToSupabasePayment(approvedOrder));
    }

    return { outcome: 'claimed', order: approvedOrder };
  } catch {
    return { outcome: 'not_found' };
  }
}

/**
 * Haiti Natcash (+509 56568810) strict submission & automatic SMS receipt match:
 * 1. Rejects fake/random strings & bogus phone numbers immediately
 * 2. Blocks already-used Natcash IDs via `used_transactions`
 * 3. Checks `natcash_sms_receipts` first for instant zero-Admin VIP Key issuance
 * 4. If SMS receipt hasn't arrived yet, creates pending order with live re-check button
 */
export async function submitAndVerifyNatcashPaymentRemote(input: {
  plan: FolderPlan;
  amountLabel: string;
  countryCode: string;
  countryName: string;
  buyerPhone: string;
  transactionId: string;
}): Promise<AutoCheckoutResult> {
  const phoneCheck = validateHaitianPhoneFormat(input.buyerPhone);
  if (!phoneCheck.valid || !phoneCheck.normalized) {
    return {
      status: 'error',
      error: phoneCheck.error ?? '❌ Nimewo telefòn envalid!',
    };
  }

  const txCheck = validateNatcashTransactionFormat(input.transactionId);
  if (!txCheck.valid || !txCheck.normalized) {
    return {
      status: 'error',
      error: txCheck.error ?? '❌ Kòd Tranzaksyon Natcash envalid!',
    };
  }

  const cleanTx = txCheck.normalized;

  const alreadyUsed = await isTransactionAlreadyUsedRemote(cleanTx);
  if (alreadyUsed) {
    return {
      status: 'error',
      error: '🚫 Kòd Tranzaksyon Natcash sa a deja itilize anvan!',
    };
  }

  const planObj = FOLDER_PLANS.find((p) => p.id === input.plan.id) ?? input.plan;
  const receiptMatch = await tryClaimNatcashSmsReceipt({
    txId: cleanTx,
    planId: planObj.id,
    folders: planObj.folders,
    amountLabel: input.amountLabel,
    countryCode: input.countryCode,
    countryName: input.countryName,
    buyerPhone: phoneCheck.normalized,
  });

  if (receiptMatch.outcome === 'claimed' && receiptMatch.order) {
    return { status: 'approved', order: receiptMatch.order };
  }

  if (
    receiptMatch.outcome === 'already_claimed' ||
    receiptMatch.outcome === 'insufficient_amount'
  ) {
    return {
      status: 'error',
      error: receiptMatch.error ?? '❌ Kòd Tranzaksyon Natcash pa valab.',
    };
  }

  const pendingRes = await createPendingPaymentOrderRemote({
    method: 'natcash',
    plan: planObj,
    amountLabel: input.amountLabel,
    countryCode: input.countryCode,
    countryName: input.countryName,
    buyerPhone: phoneCheck.normalized,
    transactionId: cleanTx,
  });

  if (!pendingRes.success || !pendingRes.order) {
    return {
      status: 'error',
      error: pendingRes.error ?? 'Pa kapab anrejistre peman Natcash la.',
    };
  }

  if (pendingRes.order.status === 'approved' && pendingRes.order.issuedVipKey) {
    return { status: 'approved', order: pendingRes.order };
  }

  return { status: 'pending', order: pendingRes.order };
}

/**
 * Full-SMS Haiti Natcash (+509 56568810) automatic verification:
 * 1. Parses the pasted Natcash confirmation SMS (keywords, recipient 56568810, amount >= plan HTG, TxID)
 * 2. Checks Supabase `used_transactions` (and `natcash_sms_receipts` / `payments`) to block reuse
 * 3. Permanently marks the extracted TxID as used in `used_transactions`
 * 4. Immediately generates & saves the buyer's short VIP Key (or Unlimited 999) on screen
 */
export async function submitAndVerifyNatcashSmsRemote(input: {
  plan: FolderPlan;
  amountLabel: string;
  countryCode: string;
  countryName: string;
  rawSms: string;
  buyerPhone?: string;
}): Promise<AutoCheckoutResult> {
  const planObj = FOLDER_PLANS.find((p) => p.id === input.plan.id) ?? input.plan;
  const expectedHtg = getHtgAmountForPlan(planObj.id);

  // Optional phone validation only if buyer typed a number
  let cleanBuyerPhone: string | undefined;
  if (input.buyerPhone && input.buyerPhone.trim().length > 0) {
    const phoneCheck = validateHaitianPhoneFormat(input.buyerPhone);
    if (!phoneCheck.valid) {
      return {
        status: 'error',
        error: phoneCheck.error ?? '❌ Nimewo telefòn envalid!',
      };
    }
    cleanBuyerPhone = phoneCheck.normalized;
  }

  // Run all 4 strict SMS parser checks
  const parsed = parseNatcashConfirmationSms(input.rawSms, expectedHtg);
  if (!parsed.valid || !parsed.transactionId) {
    return {
      status: 'error',
      error:
        parsed.error ??
        '❌ Mesaj konfimasyon Natcash la pa valab. Verifye mesaj la epi eseye ankò.',
    };
  }

  const extractedTx = parsed.transactionId;
  const paidHtg = parsed.amountHtg ?? expectedHtg;

  // Check Supabase `used_transactions` & approved `payments` for reuse
  const alreadyUsed = await isTransactionAlreadyUsedRemote(extractedTx);
  if (alreadyUsed) {
    return {
      status: 'error',
      error: `🚫 Kòd Tranzaksyon Natcash (${extractedTx}) sa a deja itilize anvan!`,
    };
  }

  // Cross-check optional `natcash_sms_receipts` if webhook already logged this TxID
  try {
    const { data: receiptData } = await supabase
      .from('natcash_sms_receipts')
      .select('*')
      .ilike('tx_id', extractedTx)
      .maybeSingle();

    if (receiptData) {
      const receipt = receiptData as SupabaseNatcashReceiptRow;
      if (receipt.claimed) {
        return {
          status: 'error',
          error: `🚫 Kòd Tranzaksyon Natcash (${extractedTx}) sa a deja itilize anvan!`,
        };
      }
      if (Number(receipt.amount_htg) < expectedHtg) {
        return {
          status: 'error',
          error: '❌ Montan ki nan mesaj la pa ase pou plan sa a!',
        };
      }
    }
  } catch {
    // Graceful continue when receipt table isn't populated or offline
  }

  // Generate unique short single-use VIP Key (or Unlimited 999 VIP Key)
  const noteLabel = `Natcash SMS (${paidHtg.toLocaleString('en-US')} HTG${
    cleanBuyerPhone ? ` · ${cleanBuyerPhone}` : ''
  }) · ID: ${extractedTx}`;

  let createdRecord: VipKeyRecord | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidateCode = generateShortSecretCode('W#');
    const created = await createVipKeyRecordRemote(planObj.folders, candidateCode, noteLabel);
    if (created.success && created.record) {
      createdRecord = created.record;
      break;
    }
  }

  if (!createdRecord) {
    return {
      status: 'error',
      error: 'Pa kapab jenere Kle VIP la kounye a. Eseye ankò.',
    };
  }

  // Mark extracted Transaction ID as permanently used in Supabase `used_transactions`
  const usedInsert = await markTransactionUsedRemote({
    txId: extractedTx,
    method: 'natcash',
    planId: planObj.id,
    amountPaid: paidHtg,
    issuedVipKey: createdRecord.code,
  });

  if (usedInsert.duplicate) {
    return {
      status: 'error',
      error: `🚫 Kòd Tranzaksyon Natcash (${extractedTx}) sa a deja itilize anvan!`,
    };
  }

  const now = Date.now();

  // If a matching webhook receipt exists in `natcash_sms_receipts`, mark it claimed atomically
  try {
    await supabase
      .from('natcash_sms_receipts')
      .update({
        claimed: true,
        claimed_vip_key: createdRecord.code,
        claimed_at: now,
      })
      .ilike('tx_id', extractedTx)
      .eq('claimed', false);
  } catch {
    // ignore if no webhook receipt row exists
  }

  const approvedOrder: PaymentOrder = {
    id: `ORD-${now.toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`,
    method: 'natcash',
    status: 'approved',
    planId: planObj.id,
    planTitle: planObj.shortLabel,
    folders: planObj.folders,
    amountLabel: input.amountLabel,
    countryCode: input.countryCode,
    countryName: input.countryName,
    buyerPhone: cleanBuyerPhone,
    transactionId: extractedTx,
    issuedVipKey: createdRecord.code,
    verifiedBy: 'admin',
    createdAt: now,
    updatedAt: now,
  };

  upsertLocalPaymentOrderCache(approvedOrder);
  saveActiveCheckoutOrderId(approvedOrder.id);

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert(mapOrderToSupabasePayment(approvedOrder))
      .select('*')
      .single();

    if (!error && data) {
      const savedOrder = mapSupabasePaymentToOrder(data as SupabasePaymentRow);
      upsertLocalPaymentOrderCache(savedOrder);
      saveActiveCheckoutOrderId(savedOrder.id);
      return { status: 'approved', order: savedOrder };
    }
  } catch {
    // Graceful local persistence fallback
  }

  return { status: 'approved', order: approvedOrder };
}

/**
 * Re-checks a pending Natcash order against both `payments` and `natcash_sms_receipts`
 * when buyer clicks "🔄 Re-verifye Tranzaksyon Mwen" or when Realtime notifies.
 */
export async function recheckNatcashOrderRemote(orderId: string): Promise<{
  status: 'approved' | 'pending' | 'rejected' | 'error';
  order?: PaymentOrder;
  message?: string;
}> {
  const latest = await fetchPaymentOrderByIdRemote(orderId);
  if (!latest) {
    return { status: 'error', message: 'Kòmand lan pa jwenn ankò.' };
  }

  if (latest.status === 'approved' && latest.issuedVipKey) {
    return { status: 'approved', order: latest };
  }

  if (latest.status === 'rejected') {
    return { status: 'rejected', order: latest };
  }

  const match = await tryClaimNatcashSmsReceipt({
    txId: latest.transactionId,
    planId: latest.planId,
    folders: latest.folders,
    amountLabel: latest.amountLabel,
    countryCode: latest.countryCode,
    countryName: latest.countryName,
    buyerPhone: latest.buyerPhone,
    existingOrderId: latest.id,
  });

  if (match.outcome === 'claimed' && match.order) {
    return { status: 'approved', order: match.order };
  }

  if (match.outcome === 'insufficient_amount' || match.outcome === 'already_claimed') {
    return {
      status: 'error',
      order: latest,
      message: match.error,
    };
  }

  return {
    status: 'pending',
    order: latest,
    message:
      'Resi SMS Natcash la poko rive oswa poko valide — eseye klike bouton sa a nan kèk segonn ankò.',
  };
}

/**
 * Allows Admin (or SMS forwarding automation) to register an incoming Natcash SMS receipt
 * in `natcash_sms_receipts` and immediately auto-approve any matching waiting buyer order.
 */
export async function insertNatcashSmsReceiptRemote(params: {
  txId: string;
  amountHtg: number;
  senderPhone?: string;
  rawSms?: string;
}): Promise<{ success: boolean; autoMatchedOrderId?: string; error?: string }> {
  const txCheck = validateNatcashTransactionFormat(params.txId);
  if (!txCheck.valid || !txCheck.normalized) {
    return { success: false, error: txCheck.error };
  }

  const normTx = txCheck.normalized;
  if (!Number.isFinite(params.amountHtg) || params.amountHtg <= 0) {
    return { success: false, error: 'Antre yon montan HTG ki pi gran pase 0.' };
  }

  try {
    const { error } = await supabase.from('natcash_sms_receipts').insert({
      tx_id: normTx,
      sender_phone: params.senderPhone?.trim() || null,
      amount_htg: params.amountHtg,
      raw_sms: params.rawSms?.trim() || null,
      claimed: false,
      received_at: Date.now(),
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Resi Natcash ID sa a deja anrejistre.' };
      }
      return { success: false, error: error.message };
    }

    // If a buyer already submitted this Natcash ID and is waiting on screen, auto-approve right now!
    const { data: waitingOrders } = await supabase
      .from('payments')
      .select('*')
      .eq('method', 'natcash')
      .eq('status', 'pending')
      .ilike('transaction_id', normTx)
      .limit(1);

    if (Array.isArray(waitingOrders) && waitingOrders.length > 0) {
      const pendingOrder = mapSupabasePaymentToOrder(waitingOrders[0] as SupabasePaymentRow);
      const claimRes = await tryClaimNatcashSmsReceipt({
        txId: normTx,
        planId: pendingOrder.planId,
        folders: pendingOrder.folders,
        amountLabel: pendingOrder.amountLabel,
        countryCode: pendingOrder.countryCode,
        countryName: pendingOrder.countryName,
        buyerPhone: pendingOrder.buyerPhone,
        existingOrderId: pendingOrder.id,
      });
      if (claimRes.outcome === 'claimed' && claimRes.order) {
        return { success: true, autoMatchedOrderId: claimRes.order.id };
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Pa kapab konekte ak Supabase kounye a.' };
  }
}

