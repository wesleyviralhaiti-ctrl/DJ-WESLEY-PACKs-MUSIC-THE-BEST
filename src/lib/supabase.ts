import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://gkstgjhzeqiocdbrsnte.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_X1X2bBh2zhNn0-WNUyM8SQ_Rdauq-Ms';

function sanitizeSupabaseUrl(raw: string | undefined): string {
  const cleaned = (raw ?? '')
    .replace(/[\r\n\t\s'"]+/g, '')
    .replace(/\/+$/, '');
  if (!cleaned) return DEFAULT_SUPABASE_URL;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === 'https:' && parsed.hostname.includes('.supabase.')) {
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
    }
  } catch {
    // Fallback to verified production URL
  }
  return DEFAULT_SUPABASE_URL;
}

function sanitizeSupabaseAnonKey(raw: string | undefined): string {
  const cleaned = (raw ?? '').replace(/[\r\n\t\s'"]+/g, '');
  if (!cleaned || cleaned.length < 20) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return cleaned;
}

export const SUPABASE_URL = sanitizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);

export const SUPABASE_ANON_KEY = sanitizeSupabaseAnonKey(
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
);

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isTransientSupabaseError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { message?: string; details?: string; code?: string; status?: number; name?: string };
  const status = Number(anyErr.status);
  if ([502, 503, 504, 520, 521, 522, 523, 524, 408, 429].includes(status)) {
    return true;
  }
  const combined = `${anyErr.name ?? ''} ${anyErr.message ?? ''} ${anyErr.details ?? ''} ${anyErr.code ?? ''}`
    .trim()
    .toLowerCase();
  return (
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('load failed') ||
    combined.includes('network request failed') ||
    combined.includes('aborterror') ||
    combined.includes('timed out') ||
    combined.includes('timeout') ||
    combined.includes('econnreset') ||
    combined.includes('etimedout') ||
    combined.includes('fetcherror')
  );
}

const resilientSupabaseFetch: typeof fetch = async (input, init) => {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
  const isStorageUpload =
    urlStr.includes('/storage/v1/object') && (method === 'POST' || method === 'PUT');
  const isIdempotentRead = method === 'GET' || method === 'HEAD';
  const maxAttempts = isIdempotentRead ? 3 : 1;
  const timeoutMs = isStorageUpload ? 120_000 : 12_000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const externalSignal = init?.signal;

    const onExternalAbort = () => {
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const requestInit: RequestInit = {
        ...init,
        signal: controller.signal,
        ...(isIdempotentRead ? { cache: 'no-store' as RequestCache } : {}),
      };

      const response = await fetch(input, requestInit);

      if (
        isIdempotentRead &&
        attempt < maxAttempts &&
        [502, 503, 504, 520, 521, 522, 523, 524, 408].includes(response.status)
      ) {
        await sleepMs(attempt === 1 ? 300 : 700);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      if (externalSignal?.aborted || attempt >= maxAttempts) {
        throw err;
      }
      await sleepMs(attempt === 1 ? 300 : 700);
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch');
};

export async function withSupabaseRetry<T>(
  operation: () => Promise<T>,
  options?: {
    attempts?: number;
    delayMs?: number;
    shouldRetryResult?: (result: T) => boolean;
  }
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const baseDelayMs = Math.max(100, options?.delayMs ?? 350);

  let lastResult: T | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await operation();
      lastResult = res;
      if (options?.shouldRetryResult?.(res) && attempt < attempts) {
        await sleepMs(baseDelayMs * attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt >= attempts || !isTransientSupabaseError(err)) {
        throw err;
      }
      await sleepMs(baseDelayMs * attempt);
    }
  }

  if (lastResult !== undefined) return lastResult;
  throw lastError instanceof Error ? lastError : new Error('Supabase retry failed');
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: resilientSupabaseFetch,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const supabase = supabaseClient;

export interface SupabaseVipKeyRow {
  id?: string;
  key_code?: string;
  plan_name?: string | null;
  total_credits?: number;
  remaining_credits?: number;
  is_unlimited?: boolean;
  code?: string;
  total_folders?: number;
  remaining_folders?: number;
  downloaded_pack_ids?: string[] | null;
  created_at?: string | number | null;
  activated_at?: string | number | null;
  activated_device_token?: string | null;
  burned?: boolean;
  burned_at?: string | number | null;
  note?: string | null;
}

export interface SupabasePaymentRow {
  id: string;
  method: 'natcash' | 'usdt_trc20';
  status: 'pending' | 'approved' | 'rejected';
  plan_id: string;
  plan_title: string;
  folders: number;
  amount_label: string;
  usdt_amount: number | null;
  country_code: string;
  country_name: string;
  buyer_phone: string | null;
  transaction_id: string;
  issued_vip_key: string | null;
  verified_by: 'trongrid' | 'admin' | null;
  created_at: number;
  updated_at: number;
}

export interface SupabaseUsedTransactionRow {
  tx_id: string;
  method: 'natcash' | 'usdt_trc20';
  plan_id: string;
  amount_paid: number;
  issued_vip_key: string | null;
  used_at: number;
}

export interface SupabaseNatcashReceiptRow {
  tx_id: string;
  sender_phone: string | null;
  amount_htg: number;
  raw_sms: string | null;
  claimed: boolean;
  claimed_vip_key: string | null;
  received_at: number;
  claimed_at: number | null;
}

export interface SupabaseVisitorRow {
  id?: string;
  session_id?: string;
  full_name: string;
  country: string;
  country_code: string;
  phone_number: string;
  referral_code?: string | null;
  referred_by?: string | null;
  has_purchased?: boolean;
  referral_reward_claimed?: boolean;
  bonus_credits?: number;
  is_online?: boolean;
  last_seen_at: string | number;
  created_at?: string | number;
}

export interface SupabasePackRequestRow {
  id: string;
  visitor_id: string | null;
  visitor_name: string;
  country: string;
  country_code: string;
  phone_number: string;
  pack_title: string;
  zip_filename: string;
  genre: string;
  created_at: number;
}

export interface SupabaseMusicPackRow {
  id: string;
  name?: string;
  slug?: string;
  title?: string;
  filename?: string | null;
  subtitle?: string;
  genre?: string;
  track_count: number;
  file_size?: string;
  bitrate?: string;
  bpm_range?: string;
  cover_image?: string;
  zip_url?: string | null;
  tracks: any;
  is_active?: boolean;
  is_custom_upload?: boolean;
  is_coming_soon?: boolean;
  created_at?: number | string;
  updated_at?: number | string;
}

export type SupabaseFolderRow = SupabaseMusicPackRow;
