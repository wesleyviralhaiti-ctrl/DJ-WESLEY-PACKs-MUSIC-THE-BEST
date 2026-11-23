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
export const VISITORS_UPDATED_EVENT = 'wesley-visitors-updated';
export const VISITOR_ONLINE_WINDOW_MS = 30_000;

export interface VisitorProfile {
  id: string;
  sessionId: string;
  fullName: string;
  country: string;
  countryCode: string;
  phoneNumber: string;
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

export function loadSavedVisitorProfile(): VisitorProfile | null {
  try {
    const raw = window.localStorage.getItem(VISITOR_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitorProfile>;
    const resolvedId = parsed.sessionId || parsed.id;
    if (!resolvedId || !parsed.fullName || !parsed.countryCode || !parsed.phoneNumber) {
      return null;
    }
    return {
      id: resolvedId,
      sessionId: resolvedId,
      fullName: parsed.fullName,
      country: parsed.country || getCountryByCode(parsed.countryCode).name,
      countryCode: parsed.countryCode.toUpperCase(),
      phoneNumber: parsed.phoneNumber,
      isOnline: parsed.isOnline ?? true,
      lastSeenAt: parseTimestampMs(parsed.lastSeenAt),
      createdAt: parseTimestampMs(parsed.createdAt),
    };
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

function mapSupabaseVisitorRow(row: SupabaseVisitorRow): VisitorProfile {
  const resolvedId = String(row.session_id || row.id || generateSessionId());
  const lastSeenMs = parseTimestampMs(row.last_seen_at);
  return {
    id: resolvedId,
    sessionId: resolvedId,
    fullName: row.full_name,
    country: row.country,
    countryCode: (row.country_code || 'HT').toUpperCase(),
    phoneNumber: row.phone_number,
    isOnline: row.is_online !== false,
    lastSeenAt: lastSeenMs,
    createdAt: row.created_at !== undefined ? parseTimestampMs(row.created_at) : lastSeenMs,
  };
}

export function isVisitorCurrentlyOnline(visitor: VisitorProfile, nowMs = Date.now()): boolean {
  if (visitor.isOnline === false) return false;
  return nowMs - visitor.lastSeenAt <= VISITOR_ONLINE_WINDOW_MS;
}

async function upsertVisitorRowToSupabase(visitor: VisitorProfile): Promise<{
  data: SupabaseVisitorRow | null;
  error: { message: string; code?: string } | null;
}> {
  const isoNow = new Date().toISOString();

  // Primary upsert format requested:
  // { session_id, full_name, country, country_code, phone_number, last_seen_at: new Date().toISOString() }
  const primaryPayload = {
    session_id: visitor.sessionId,
    full_name: visitor.fullName,
    country: visitor.country,
    country_code: visitor.countryCode,
    phone_number: visitor.phoneNumber,
    last_seen_at: isoNow,
  };

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
  const now = Date.now();
  const visitor: VisitorProfile = {
    id: sessionId,
    sessionId,
    fullName: cleanName,
    country: country.name,
    countryCode: country.code,
    phoneNumber: phoneCheck.formattedInternational,
    isOnline: true,
    lastSeenAt: now,
    createdAt: existing?.createdAt || now,
  };

  saveVisitorProfileLocally(visitor);

  try {
    const { data, error } = await upsertVisitorRowToSupabase(visitor);
    if (!error) {
      if (data) {
        const synced = mapSupabaseVisitorRow(data);
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
): Promise<void> {
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
    const { error } = await upsertVisitorRowToSupabase(updated);
    if (error) {
      console.warn('[Supabase visitors heartbeat]', error.code, error.message);
    }
  } catch {
    // ignore transient heartbeat failure
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

    const mapped = ((data as SupabaseVisitorRow[] | null) ?? []).map(mapSupabaseVisitorRow);
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
