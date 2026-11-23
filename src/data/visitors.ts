import {
  CountryCode,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';
import { getCountryByCode } from './countries';
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  SupabaseVisitorRow,
  supabaseClient,
} from '../lib/supabase';

export const VISITOR_PROFILE_STORAGE_KEY = 'wesley_visitor_profile_v1';
export const VISITOR_SESSION_ID_STORAGE_KEY = 'wesley_visitor_session_id_v1';
export const VISITORS_CACHE_STORAGE_KEY = 'wesley_visitors_cache_v1';
export const PENDING_REFERRAL_CODE_STORAGE_KEY = 'wesley_pending_referral_code_v1';
export const VISITORS_UPDATED_EVENT = 'wesley-visitors-updated';
export const VISITOR_ONLINE_WINDOW_MS = 30_000;
export const REFERRAL_REGISTERED_GOAL = 15;
export const REFERRAL_PURCHASED_GOAL = 5;

export interface VisitorProfile {
  id: string;
  sessionId: string;
  fullName: string;
  country: string;
  countryCode: string;
  phoneNumber: string;
  referralCode: string;
  referredBy?: string;
  hasPurchased: boolean;
  referralRewardClaimed: boolean;
  bonusCredits: number;
  isOnline: boolean;
  lastSeenAt: number;
  createdAt: number;
}

export interface FetchVisitorsResult {
  visitors: VisitorProfile[];
  connected: boolean;
  errorMessage?: string;
  errorCode?: string;
}

const FALLBACK_DIAL_CODES: Record<string, string> = {
  XK: '383',
  VA: '39',
};

const SEQUENTIAL_JUNK_PHONE_PATTERNS = [
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

export function getDialCodeForCountry(countryCode: string): string {
  const upper = (countryCode || 'HT').trim().toUpperCase();
  try {
    return getCountryCallingCode(upper as CountryCode);
  } catch {
    return FALLBACK_DIAL_CODES[upper] ?? '1';
  }
}

export function getPhonePlaceholderForCountry(countryCode: string): string {
  const upper = (countryCode || 'HT').trim().toUpperCase();
  if (upper === 'HT') return '3856 9265';
  if (upper === 'US' || upper === 'CA') return '305 555 0192';
  if (upper === 'BR') return '11 98765 4321';
  if (upper === 'FR') return '6 12 34 56 78';
  if (upper === 'DO') return '809 555 0142';
  if (upper === 'CI') return '07 12 34 56 78';
  if (upper === 'NG') return '803 123 4567';
  if (upper === 'CD') return '812 345 678';
  if (upper === 'SN') return '77 123 45 67';

  try {
    const example = getExampleNumber(upper as CountryCode, examples);
    if (example) {
      return example.formatNational().replace(/^0/, '');
    }
  } catch {
    // fallback below
  }
  return 'XXX XXX XXXX';
}

export interface PhoneValidationResult {
  valid: boolean;
  formattedInternational?: string;
  formattedE164?: string;
  dialCode: string;
  error?: string;
}

export function validateCountryPhoneNumber(
  rawPhone: string,
  countryCode: string
): PhoneValidationResult {
  const country = getCountryByCode(countryCode);
  const dialCode = getDialCodeForCountry(country.code);
  const compatError = `⚠️ Nimewo telefòn sa a pa konpatib ak peyi ${country.name} (+${dialCode})! Tanpri antre yon vrè nimewo telefòn ki valid pou peyi sa a.`;

  const trimmed = (rawPhone || '').trim();
  if (!trimmed) {
    return { valid: false, dialCode, error: compatError };
  }

  // Strip letters or weird symbols immediately
  if (/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, dialCode, error: compatError };
  }

  const normalizedChars = trimmed.replace(/[\s().-]+/g, '');
  const digitsOnly = normalizedChars.replace(/\D+/g, '');
  if (digitsOnly.length < 6) {
    return { valid: false, dialCode, error: compatError };
  }

  let parsed = parsePhoneNumberFromString(normalizedChars, country.code as CountryCode);

  // If user typed full dial code without '+' (e.g. 50938569265 for HT), try parsing with '+'
  if (
    (!parsed || !parsed.isValid()) &&
    !normalizedChars.startsWith('+') &&
    digitsOnly.startsWith(dialCode) &&
    digitsOnly.length >= dialCode.length + 7
  ) {
    parsed = parsePhoneNumberFromString(`+${digitsOnly}`, country.code as CountryCode);
  }

  if (!parsed || !parsed.isValid()) {
    return { valid: false, dialCode, error: compatError };
  }

  // Must match selected country's calling code (blocks +1 inside France, +509 inside USA, etc.)
  if (parsed.countryCallingCode !== dialCode) {
    return { valid: false, dialCode, error: compatError };
  }

  // If libphonenumber identified an exact ISO country (outside shared +1/+7 plans), ensure it matches
  if (dialCode !== '1' && dialCode !== '7' && parsed.country && parsed.country !== country.code) {
    return { valid: false, dialCode, error: compatError };
  }

  const national = parsed.nationalNumber || '';

  // Strict explicit rules requested for key regions
  if (country.code === 'HT' && !/^[2345]\d{7}$/.test(national)) {
    return { valid: false, dialCode, error: compatError };
  }
  if ((country.code === 'US' || country.code === 'CA') && !/^\d{10}$/.test(national)) {
    return { valid: false, dialCode, error: compatError };
  }
  if (country.code === 'BR' && !/^\d{10,11}$/.test(national)) {
    return { valid: false, dialCode, error: compatError };
  }
  if (country.code === 'FR' && !/^\d{9}$/.test(national)) {
    return { valid: false, dialCode, error: compatError };
  }

  // Block repeated or sequential dummy numbers (11111111, 31111111, 12345678, etc.)
  if (
    /^(\d)\1{5,}$/.test(national) ||
    /(\d)\1{5,}/.test(national) ||
    SEQUENTIAL_JUNK_PHONE_PATTERNS.some((seq) => national.includes(seq))
  ) {
    return { valid: false, dialCode, error: compatError };
  }

  return {
    valid: true,
    dialCode,
    formattedE164: parsed.number,
    formattedInternational: parsed.formatInternational(),
  };
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `VIS-${crypto.randomUUID()}`;
  }
  return `VIS-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

export function getOrCreateVisitorSessionId(): string {
  try {
    const storedSession = window.localStorage.getItem(VISITOR_SESSION_ID_STORAGE_KEY);
    if (storedSession && storedSession.trim()) {
      return storedSession.trim();
    }
    const rawProfile = window.localStorage.getItem(VISITOR_PROFILE_STORAGE_KEY);
    if (rawProfile) {
      const parsed = JSON.parse(rawProfile) as Partial<VisitorProfile>;
      const existingId = parsed.sessionId || parsed.id;
      if (existingId) {
        window.localStorage.setItem(VISITOR_SESSION_ID_STORAGE_KEY, existingId);
        return existingId;
      }
    }
    const created = generateSessionId();
    window.localStorage.setItem(VISITOR_SESSION_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return generateSessionId();
  }
}

function parseTimestampMs(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isFinite(num)) return num;
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

export function normalizePhoneDigits(raw: string | undefined | null): string {
  return (raw || '').replace(/\D+/g, '');
}

const REFERRAL_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateReferralCode6Char(existingCodes: Set<string> = new Set()): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    let suffix = '';
    if (attempt < 15) {
      suffix = String(Math.floor(100 + Math.random() * 900));
    } else {
      for (let i = 0; i < 3; i++) {
        suffix += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
      }
    }
    const candidate = `REF${suffix}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }
  return `REF${String(Math.floor(100 + Math.random() * 900))}`;
}

export function captureReferralCodeFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('ref');
    if (urlRef) {
      const cleaned = urlRef.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length >= 4 && cleaned.length <= 16) {
        window.localStorage.setItem(PENDING_REFERRAL_CODE_STORAGE_KEY, cleaned);
        return cleaned;
      }
    }
    const saved = window.localStorage.getItem(PENDING_REFERRAL_CODE_STORAGE_KEY);
    if (saved) {
      const cleaned = saved.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return cleaned.length >= 4 ? cleaned : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSavedVisitorProfile(): VisitorProfile | null {
  try {
    const raw = window.localStorage.getItem(VISITOR_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitorProfile>;
    const resolvedId = parsed.sessionId || parsed.id;
    if (!resolvedId || !parsed.fullName || !parsed.countryCode || !parsed.phoneNumber) {
      return null;
    }
    const referralCode =
      (parsed.referralCode || '').trim().toUpperCase() || generateReferralCode6Char();
    const profile: VisitorProfile = {
      id: resolvedId,
      sessionId: resolvedId,
      fullName: parsed.fullName,
      country: parsed.country || getCountryByCode(parsed.countryCode).name,
      countryCode: parsed.countryCode.toUpperCase(),
      phoneNumber: parsed.phoneNumber,
      referralCode,
      referredBy: parsed.referredBy ? parsed.referredBy.trim().toUpperCase() : undefined,
      hasPurchased: Boolean(parsed.hasPurchased),
      referralRewardClaimed: Boolean(parsed.referralRewardClaimed),
      bonusCredits: Math.max(0, Number(parsed.bonusCredits) || 0),
      isOnline: parsed.isOnline ?? true,
      lastSeenAt: parseTimestampMs(parsed.lastSeenAt),
      createdAt: parseTimestampMs(parsed.createdAt),
    };
    if (!parsed.referralCode) {
      window.localStorage.setItem(VISITOR_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
    return profile;
  } catch {
    return null;
  }
}

export function saveVisitorProfileLocally(profile: VisitorProfile): void {
  try {
    window.localStorage.setItem(VISITOR_SESSION_ID_STORAGE_KEY, profile.sessionId);
    window.localStorage.setItem(VISITOR_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    const cache = loadVisitorsCache().filter(
      (v) => v.sessionId !== profile.sessionId && v.id !== profile.id
    );
    window.localStorage.setItem(
      VISITORS_CACHE_STORAGE_KEY,
      JSON.stringify([profile, ...cache])
    );
    window.dispatchEvent(new CustomEvent(VISITORS_UPDATED_EVENT));
  } catch {
    // ignore storage errors
  }
}

export function loadVisitorsCache(): VisitorProfile[] {
  try {
    const raw = window.localStorage.getItem(VISITORS_CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VisitorProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapSupabaseVisitorRow(
  row: SupabaseVisitorRow,
  fallback?: { referralCode?: string; referredBy?: string }
): VisitorProfile {
  const resolvedId = String(row.session_id || row.id || generateSessionId());
  const lastSeenMs = parseTimestampMs(row.last_seen_at);
  const referralCode =
    (row.referral_code || '').trim().toUpperCase() ||
    (fallback?.referralCode || '').trim().toUpperCase() ||
    generateReferralCode6Char();
  const referredByRaw = row.referred_by
    ? String(row.referred_by).trim().toUpperCase()
    : fallback?.referredBy
      ? fallback.referredBy.trim().toUpperCase()
      : undefined;
  return {
    id: resolvedId,
    sessionId: resolvedId,
    fullName: row.full_name,
    country: row.country,
    countryCode: (row.country_code || 'HT').toUpperCase(),
    phoneNumber: row.phone_number,
    referralCode,
    referredBy: referredByRaw || undefined,
    hasPurchased: Boolean(row.has_purchased),
    referralRewardClaimed: Boolean(row.referral_reward_claimed),
    bonusCredits: Math.max(0, Number(row.bonus_credits) || 0),
    isOnline: row.is_online !== false,
    lastSeenAt: lastSeenMs,
    createdAt: row.created_at !== undefined ? parseTimestampMs(row.created_at) : lastSeenMs,
  };
}

export function isVisitorCurrentlyOnline(visitor: VisitorProfile, nowMs = Date.now()): boolean {
  if (visitor.isOnline === false) return false;
  return nowMs - visitor.lastSeenAt <= VISITOR_ONLINE_WINDOW_MS;
}

async function upsertVisitorRowToSupabase(
  visitor: VisitorProfile,
  options: { includeReferralMutationFields?: boolean } = {}
): Promise<{
  data: SupabaseVisitorRow | null;
  error: { message: string; code?: string } | null;
}> {
  const isoNow = new Date().toISOString();

  const primaryPayload: Record<string, unknown> = {
    session_id: visitor.sessionId,
    full_name: visitor.fullName,
    country: visitor.country,
    country_code: visitor.countryCode,
    phone_number: visitor.phoneNumber,
    referral_code: visitor.referralCode,
    last_seen_at: isoNow,
  };

  if (options.includeReferralMutationFields) {
    if (visitor.referredBy) {
      primaryPayload.referred_by = visitor.referredBy;
    }
    primaryPayload.has_purchased = visitor.hasPurchased;
    primaryPayload.referral_reward_claimed = visitor.referralRewardClaimed;
    primaryPayload.bonus_credits = visitor.bonusCredits;
  }

  const primaryRes = await supabaseClient
    .from('visitors')
    .upsert(primaryPayload, { onConflict: 'session_id' })
    .select('*')
    .maybeSingle();

  if (!primaryRes.error) {
    return { data: (primaryRes.data as SupabaseVisitorRow | null) ?? null, error: null };
  }

  const errCode = primaryRes.error.code || '';
  const errMsg = primaryRes.error.message || '';

  // If referral columns are not yet present in remote schema, retry core upsert so visitor registration still succeeds
  if (
    errCode === '42703' ||
    errCode === 'PGRST204' ||
    /referral_code|referred_by|has_purchased|referral_reward_claimed|bonus_credits/i.test(errMsg)
  ) {
    const coreRes = await supabaseClient
      .from('visitors')
      .upsert(
        {
          session_id: visitor.sessionId,
          full_name: visitor.fullName,
          country: visitor.country,
          country_code: visitor.countryCode,
          phone_number: visitor.phoneNumber,
          last_seen_at: isoNow,
        },
        { onConflict: 'session_id' }
      )
      .select('*')
      .maybeSingle();

    if (!coreRes.error) {
      return { data: (coreRes.data as SupabaseVisitorRow | null) ?? null, error: null };
    }
  }

  // Fallback compatibility if the remote visitors table uses `id` / `bigint` instead of `session_id` / `timestamptz`
  if (
    errCode === '42703' ||
    errCode === 'PGRST204' ||
    errCode === '42P10' ||
    errCode === '22P02' ||
    /session_id|last_seen_at|on conflict/i.test(errMsg)
  ) {
    const numericNow = Date.now();
    const legacyRes = await supabaseClient
      .from('visitors')
      .upsert(
        {
          id: visitor.sessionId,
          full_name: visitor.fullName,
          country: visitor.country,
          country_code: visitor.countryCode,
          phone_number: visitor.phoneNumber,
          is_online: true,
          last_seen_at: numericNow,
          created_at: visitor.createdAt || numericNow,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    if (!legacyRes.error) {
      return { data: (legacyRes.data as SupabaseVisitorRow | null) ?? null, error: null };
    }

    return {
      data: null,
      error: { message: legacyRes.error.message, code: legacyRes.error.code },
    };
  }

  return {
    data: null,
    error: { message: errMsg, code: errCode },
  };
}

export async function registerOrUpdateVisitorRemote(input: {
  fullName: string;
  countryCode: string;
  rawPhone: string;
}): Promise<{
  success: boolean;
  visitor?: VisitorProfile;
  error?: string;
  remoteSynced?: boolean;
  remoteError?: string;
}> {
  const cleanName = input.fullName.trim().replace(/\s+/g, ' ');
  if (cleanName.length < 3) {
    return {
      success: false,
      error: '⚠️ Tanpri antre Non Konplè ou (omwen 3 karaktè).',
    };
  }

  const country = getCountryByCode(input.countryCode);
  const phoneCheck = validateCountryPhoneNumber(input.rawPhone, country.code);
  if (!phoneCheck.valid || !phoneCheck.formattedInternational) {
    return {
      success: false,
      error: phoneCheck.error,
    };
  }

  const existing = loadSavedVisitorProfile();
  const sessionId = existing?.sessionId || getOrCreateVisitorSessionId();
  const existingCodes = new Set(
    loadVisitorsCache()
      .map((v) => v.referralCode?.toUpperCase())
      .filter((c): c is string => Boolean(c))
  );
  const referralCode = existing?.referralCode || generateReferralCode6Char(existingCodes);
  const myPhoneDigits = normalizePhoneDigits(phoneCheck.formattedE164 || phoneCheck.formattedInternational);

  // Anti-cheat referral attribution check
  let resolvedReferredBy: string | undefined = existing?.referredBy;
  if (!resolvedReferredBy) {
    const pendingRef = captureReferralCodeFromUrl();
    if (pendingRef && pendingRef !== referralCode) {
      let allowReferral = true;

      // Check local cache for self-referral
      const cachedReferrer = loadVisitorsCache().find(
        (v) => v.referralCode?.toUpperCase() === pendingRef
      );
      if (
        cachedReferrer &&
        (cachedReferrer.sessionId === sessionId ||
          normalizePhoneDigits(cachedReferrer.phoneNumber) === myPhoneDigits)
      ) {
        allowReferral = false;
      }

      // Check Supabase visitors table for self-referral by phone_number or session_id
      if (allowReferral) {
        try {
          const { data: referrerRow } = await supabaseClient
            .from('visitors')
            .select('session_id, phone_number, referral_code')
            .eq('referral_code', pendingRef)
            .maybeSingle();

          if (referrerRow) {
            const refRow = referrerRow as Partial<SupabaseVisitorRow>;
            const refPhoneDigits = normalizePhoneDigits(refRow.phone_number);
            if (
              refRow.session_id === sessionId ||
              (myPhoneDigits && refPhoneDigits && refPhoneDigits === myPhoneDigits)
            ) {
              allowReferral = false;
            }
          }
        } catch {
          // Proceed cleanly if offline
        }
      }

      if (allowReferral) {
        resolvedReferredBy = pendingRef;
      }
    }
  }

  const now = Date.now();
  const visitor: VisitorProfile = {
    id: sessionId,
    sessionId,
    fullName: cleanName,
    country: country.name,
    countryCode: country.code,
    phoneNumber: phoneCheck.formattedInternational,
    referralCode,
    referredBy: resolvedReferredBy,
    hasPurchased: existing?.hasPurchased ?? false,
    referralRewardClaimed: existing?.referralRewardClaimed ?? false,
    bonusCredits: existing?.bonusCredits ?? 0,
    isOnline: true,
    lastSeenAt: now,
    createdAt: existing?.createdAt || now,
  };

  saveVisitorProfileLocally(visitor);

  try {
    const { data, error } = await upsertVisitorRowToSupabase(visitor, {
      includeReferralMutationFields: true,
    });
    if (!error) {
      if (data) {
        const synced = mapSupabaseVisitorRow(data);
        // Preserve referralCode/referredBy if remote schema didn't return them yet
        if (!data.referral_code) synced.referralCode = visitor.referralCode;
        if (!data.referred_by && visitor.referredBy) synced.referredBy = visitor.referredBy;
        saveVisitorProfileLocally(synced);
        return { success: true, visitor: synced, remoteSynced: true };
      }
      return { success: true, visitor, remoteSynced: true };
    }
    console.warn('[Supabase visitors upsert]', error.code, error.message);
    return { success: true, visitor, remoteSynced: false, remoteError: error.message };
  } catch (err: any) {
    console.warn('[Supabase visitors upsert exception]', err?.message);
    return {
      success: true,
      visitor,
      remoteSynced: false,
      remoteError: err?.message || 'Network error',
    };
  }
}

export async function sendVisitorHeartbeatRemote(
  profile: VisitorProfile,
  overrideCountryCode?: string
): Promise<VisitorProfile | null> {
  const now = Date.now();
  const country = overrideCountryCode
    ? getCountryByCode(overrideCountryCode)
    : getCountryByCode(profile.countryCode);

  const sessionId = profile.sessionId || profile.id || getOrCreateVisitorSessionId();
  const updated: VisitorProfile = {
    ...profile,
    id: sessionId,
    sessionId,
    country: country.name,
    countryCode: country.code,
    isOnline: true,
    lastSeenAt: now,
  };
  saveVisitorProfileLocally(updated);

  try {
    const { data, error } = await upsertVisitorRowToSupabase(updated, {
      includeReferralMutationFields: false,
    });
    if (error) {
      console.warn('[Supabase visitors heartbeat]', error.code, error.message);
      return null;
    }
    if (data) {
      const synced = mapSupabaseVisitorRow(data);
      if (!data.referral_code && profile.referralCode) {
        synced.referralCode = profile.referralCode;
      }
      if (!data.referred_by && profile.referredBy) {
        synced.referredBy = profile.referredBy;
      }
      saveVisitorProfileLocally(synced);
      return synced;
    }
    return updated;
  } catch {
    // ignore transient heartbeat failure
    return null;
  }
}

export function markVisitorOfflineKeepalive(visitorSessionId: string): void {
  if (!visitorSessionId) return;
  const offlineMs = Date.now() - VISITOR_ONLINE_WINDOW_MS - 15_000;
  const saved = loadSavedVisitorProfile();
  if (saved && (saved.sessionId === visitorSessionId || saved.id === visitorSessionId)) {
    saveVisitorProfileLocally({ ...saved, isOnline: false, lastSeenAt: offlineMs });
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/visitors?session_id=eq.${encodeURIComponent(
      visitorSessionId
    )}`;
    void fetch(url, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        last_seen_at: new Date(offlineMs).toISOString(),
      }),
    });
  } catch {
    // ignore unload failure
  }
}

export async function fetchVisitorsFromSupabaseDirect(): Promise<FetchVisitorsResult> {
  try {
    const { data, error } = await supabaseClient
      .from('visitors')
      .select('*')
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.warn('[Supabase visitors select]', error.code, error.message);
      return {
        visitors: loadVisitorsCache(),
        connected: false,
        errorMessage: error.message,
        errorCode: error.code,
      };
    }

    const mapped = ((data as SupabaseVisitorRow[] | null) ?? []).map((row) =>
      mapSupabaseVisitorRow(row)
    );
    try {
      window.localStorage.setItem(VISITORS_CACHE_STORAGE_KEY, JSON.stringify(mapped));
    } catch {
      // ignore storage errors
    }
    return {
      visitors: mapped,
      connected: true,
    };
  } catch (err: any) {
    return {
      visitors: loadVisitorsCache(),
      connected: false,
      errorMessage: err?.message || 'Echèk koneksyon ak Supabase',
    };
  }
}

export async function fetchAllVisitorsRemote(): Promise<VisitorProfile[]> {
  const res = await fetchVisitorsFromSupabaseDirect();
  return res.visitors;
}

export async function deleteVisitorRecordRemote(visitorSessionId: string): Promise<void> {
  try {
    const remaining = loadVisitorsCache().filter(
      (v) => v.sessionId !== visitorSessionId && v.id !== visitorSessionId
    );
    window.localStorage.setItem(VISITORS_CACHE_STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore storage errors
  }

  try {
    const res = await supabaseClient
      .from('visitors')
      .delete()
      .eq('session_id', visitorSessionId);
    if (res.error && (res.error.code === '42703' || /session_id/i.test(res.error.message))) {
      await supabaseClient.from('visitors').delete().eq('id', visitorSessionId);
    }
  } catch {
    // ignore network failure
  }
}

export function subscribeVisitorsRealtime(onChange: () => void): () => void {
  const channel = supabaseClient
    .channel(`visitors_realtime_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'visitors' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}

// ============================================================================
// VIRAL REFERRAL TRACKING, ANTI-CHEAT DEDUPLICATION & BONUS FOLDER CREDITS
// ============================================================================

export interface ReferralStats {
  registeredCount: number;
  purchasedCount: number;
}

export interface ReferralProgressResult extends ReferralStats {
  connected: boolean;
  ownProfile?: VisitorProfile;
  errorMessage?: string;
}

function countUniqueReferralsForOwner(
  referredRows: VisitorProfile[],
  ownerSessionId?: string,
  ownerPhone?: string
): ReferralStats {
  const ownerPhoneDigits = normalizePhoneDigits(ownerPhone);
  const uniqueByPhone = new Map<string, { hasPurchased: boolean }>();

  for (const row of referredRows) {
    if (ownerSessionId && row.sessionId === ownerSessionId) continue;
    const digits = normalizePhoneDigits(row.phoneNumber);
    if (ownerPhoneDigits && digits && digits === ownerPhoneDigits) continue;

    const dedupeKey = digits || row.sessionId;
    const existing = uniqueByPhone.get(dedupeKey);
    if (!existing) {
      uniqueByPhone.set(dedupeKey, { hasPurchased: Boolean(row.hasPurchased) });
    } else if (row.hasPurchased && !existing.hasPurchased) {
      existing.hasPurchased = true;
    }
  }

  let registeredCount = 0;
  let purchasedCount = 0;
  for (const entry of uniqueByPhone.values()) {
    registeredCount += 1;
    if (entry.hasPurchased) purchasedCount += 1;
  }

  return { registeredCount, purchasedCount };
}

export function computeReferralStatsByCode(
  allVisitors: VisitorProfile[]
): Record<string, ReferralStats> {
  const result: Record<string, ReferralStats> = {};
  const byReferredCode = new Map<string, VisitorProfile[]>();

  for (const v of allVisitors) {
    if (!v.referredBy) continue;
    const refCode = v.referredBy.trim().toUpperCase();
    if (!refCode) continue;
    const bucket = byReferredCode.get(refCode) ?? [];
    bucket.push(v);
    byReferredCode.set(refCode, bucket);
  }

  for (const owner of allVisitors) {
    const code = owner.referralCode?.trim().toUpperCase();
    if (!code) continue;
    const referredRows = byReferredCode.get(code) ?? [];
    result[code] = countUniqueReferralsForOwner(
      referredRows,
      owner.sessionId,
      owner.phoneNumber
    );
  }

  return result;
}

export async function fetchReferralProgressRemote(
  visitor: VisitorProfile
): Promise<ReferralProgressResult> {
  const refCode = (visitor.referralCode || '').trim().toUpperCase();
  if (!refCode) {
    return { registeredCount: 0, purchasedCount: 0, connected: false };
  }

  try {
    const [referredRes, ownRes] = await Promise.all([
      supabaseClient.from('visitors').select('*').eq('referred_by', refCode),
      supabaseClient.from('visitors').select('*').eq('session_id', visitor.sessionId).maybeSingle(),
    ]);

    if (referredRes.error) {
      return {
        registeredCount: 0,
        purchasedCount: 0,
        connected: false,
        errorMessage: referredRes.error.message,
      };
    }

    const mappedReferred = ((referredRes.data as SupabaseVisitorRow[] | null) ?? []).map((row) =>
      mapSupabaseVisitorRow(row)
    );
    const stats = countUniqueReferralsForOwner(
      mappedReferred,
      visitor.sessionId,
      visitor.phoneNumber
    );

    let ownProfile: VisitorProfile | undefined;
    if (!ownRes.error && ownRes.data) {
      ownProfile = mapSupabaseVisitorRow(ownRes.data as SupabaseVisitorRow, {
        referralCode: visitor.referralCode,
        referredBy: visitor.referredBy,
      });
      saveVisitorProfileLocally(ownProfile);
    }

    return {
      registeredCount: stats.registeredCount,
      purchasedCount: stats.purchasedCount,
      connected: true,
      ownProfile,
    };
  } catch (err: any) {
    return {
      registeredCount: 0,
      purchasedCount: 0,
      connected: false,
      errorMessage: err?.message || 'Echèk koneksyon ak Supabase',
    };
  }
}

export async function markCurrentVisitorPurchasedRemote(): Promise<VisitorProfile | null> {
  const current = loadSavedVisitorProfile();
  if (!current) return null;

  const updatedLocal: VisitorProfile = {
    ...current,
    hasPurchased: true,
  };
  saveVisitorProfileLocally(updatedLocal);

  try {
    const { data, error } = await supabaseClient
      .from('visitors')
      .update({
        has_purchased: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('session_id', current.sessionId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const synced = mapSupabaseVisitorRow(data as SupabaseVisitorRow, {
        referralCode: current.referralCode,
        referredBy: current.referredBy,
      });
      saveVisitorProfileLocally(synced);
      return synced;
    }
  } catch {
    // ignore transient error
  }

  return updatedLocal;
}

export async function claimReferralRewardRemote(visitor: VisitorProfile): Promise<{
  success: boolean;
  visitor?: VisitorProfile;
  error?: string;
}> {
  const progress = await fetchReferralProgressRemote(visitor);
  if (!progress.connected) {
    return {
      success: false,
      error:
        progress.errorMessage ||
        '⚠️ Pa kapab verifye pwogrè pataj ou sou Supabase kounye a. Eseye ankò.',
    };
  }

  const latestSelf = progress.ownProfile ?? visitor;
  if (latestSelf.referralRewardClaimed) {
    return {
      success: false,
      visitor: latestSelf,
      error: '✅ Ou deja reklame rekonpans 1 Folder Gratis ou a!',
    };
  }

  if (
    progress.registeredCount < REFERRAL_REGISTERED_GOAL ||
    progress.purchasedCount < REFERRAL_PURCHASED_GOAL
  ) {
    return {
      success: false,
      visitor: latestSelf,
      error: `🔒 Kondisyon yo poko konplè (${progress.registeredCount}/${REFERRAL_REGISTERED_GOAL} Enskri · ${progress.purchasedCount}/${REFERRAL_PURCHASED_GOAL} Kliyan VIP).`,
    };
  }

  const nextBonus = Math.max(0, latestSelf.bonusCredits) + 1;

  try {
    const { data, error } = await supabaseClient
      .from('visitors')
      .update({
        referral_reward_claimed: true,
        bonus_credits: nextBonus,
        last_seen_at: new Date().toISOString(),
      })
      .eq('session_id', latestSelf.sessionId)
      .select('*')
      .single();

    if (error || !data) {
      return {
        success: false,
        error: `⚠️ Erè Supabase (${error?.code || 'UPDATE'}): ${
          error?.message || 'Pa kapab ajoute kredi gratis la kounye a.'
        }`,
      };
    }

    const updated = mapSupabaseVisitorRow(data as SupabaseVisitorRow, {
      referralCode: latestSelf.referralCode,
      referredBy: latestSelf.referredBy,
    });
    saveVisitorProfileLocally(updated);
    return { success: true, visitor: updated };
  } catch (err: any) {
    return {
      success: false,
      error: `⚠️ Erè koneksyon ak Supabase: ${err?.message || 'Eseye ankò.'}`,
    };
  }
}

export async function consumeVisitorBonusCreditRemote(
  visitor: VisitorProfile
): Promise<{ success: boolean; visitor: VisitorProfile }> {
  const currentBonus = Math.max(0, visitor.bonusCredits);
  const nextBonus = Math.max(0, currentBonus - 1);

  try {
    const { data: freshRow } = await supabaseClient
      .from('visitors')
      .select('*')
      .eq('session_id', visitor.sessionId)
      .maybeSingle();

    const authoritativeBonus = freshRow
      ? Math.max(0, Number((freshRow as SupabaseVisitorRow).bonus_credits) || 0)
      : currentBonus;

    if (authoritativeBonus <= 0) {
      const zeroVisitor: VisitorProfile = { ...visitor, bonusCredits: 0 };
      saveVisitorProfileLocally(zeroVisitor);
      return { success: false, visitor: zeroVisitor };
    }

    const decremented = Math.max(0, authoritativeBonus - 1);
    const { data, error } = await supabaseClient
      .from('visitors')
      .update({
        bonus_credits: decremented,
        last_seen_at: new Date().toISOString(),
      })
      .eq('session_id', visitor.sessionId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const synced = mapSupabaseVisitorRow(data as SupabaseVisitorRow, {
        referralCode: visitor.referralCode,
        referredBy: visitor.referredBy,
      });
      saveVisitorProfileLocally(synced);
      return { success: true, visitor: synced };
    }
  } catch {
    // Fallback cleanly below
  }

  const fallbackVisitor: VisitorProfile = { ...visitor, bonusCredits: nextBonus };
  saveVisitorProfileLocally(fallbackVisitor);
  return { success: true, visitor: fallbackVisitor };
}
