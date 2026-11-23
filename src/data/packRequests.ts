import { getCountryByCode } from './countries';
import { loadSavedVisitorProfile } from './visitors';
import { SupabasePackRequestRow, supabase } from '../lib/supabase';

export const PACK_REQUESTS_CACHE_STORAGE_KEY = 'wesley_pack_requests_cache_v1';
export const REQUESTED_PACK_IDS_STORAGE_KEY = 'wesley_requested_pack_ids_v1';
export const PACK_REQUESTS_UPDATED_EVENT = 'wesley-pack-requests-updated';

export interface PackRequestRecord {
  id: string;
  visitorId?: string;
  visitorName: string;
  country: string;
  countryCode: string;
  phoneNumber: string;
  packTitle: string;
  zipFilename: string;
  genre: string;
  createdAt: number;
}

export function loadPackRequestsCache(): PackRequestRecord[] {
  try {
    const raw = window.localStorage.getItem(PACK_REQUESTS_CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PackRequestRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePackRequestsCache(list: PackRequestRecord[]): void {
  try {
    window.localStorage.setItem(PACK_REQUESTS_CACHE_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(PACK_REQUESTS_UPDATED_EVENT));
  } catch {
    // ignore storage quota errors
  }
}

export function loadRequestedZipNames(): string[] {
  try {
    const raw = window.localStorage.getItem(REQUESTED_PACK_IDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markZipRequestedLocally(zipFilename: string): string[] {
  const existing = loadRequestedZipNames();
  if (existing.includes(zipFilename)) return existing;
  const next = [...existing, zipFilename];
  try {
    window.localStorage.setItem(REQUESTED_PACK_IDS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}

function mapRowToPackRequest(row: SupabasePackRequestRow): PackRequestRecord {
  return {
    id: row.id,
    visitorId: row.visitor_id ?? undefined,
    visitorName: row.visitor_name,
    country: row.country,
    countryCode: row.country_code,
    phoneNumber: row.phone_number,
    packTitle: row.pack_title,
    zipFilename: row.zip_filename,
    genre: row.genre,
    createdAt: Number(row.created_at) || Date.now(),
  };
}

export async function submitPackRequestRemote(input: {
  packTitle: string;
  zipFilename: string;
  genre: string;
  countryCode: string;
  visitorNameOverride?: string;
  phoneNumberOverride?: string;
}): Promise<{ success: boolean; record: PackRequestRecord }> {
  const visitor = loadSavedVisitorProfile();
  const country = getCountryByCode(input.countryCode || visitor?.countryCode || 'HT');
  const now = Date.now();
  const id = `REQ-${now.toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

  const record: PackRequestRecord = {
    id,
    visitorId: visitor?.id,
    visitorName: (input.visitorNameOverride || visitor?.fullName || 'Vizitè Sit la').trim(),
    country: country.name,
    countryCode: country.code,
    phoneNumber: (input.phoneNumberOverride || visitor?.phoneNumber || 'Admin / Pa presize').trim(),
    packTitle: input.packTitle,
    zipFilename: input.zipFilename,
    genre: input.genre || 'Trending VIP',
    createdAt: now,
  };

  markZipRequestedLocally(record.zipFilename);
  const currentCache = loadPackRequestsCache();
  savePackRequestsCache([record, ...currentCache]);

  try {
    const { data, error } = await supabase
      .from('pack_requests')
      .insert({
        id: record.id,
        visitor_id: record.visitorId ?? null,
        visitor_name: record.visitorName,
        country: record.country,
        country_code: record.countryCode,
        phone_number: record.phoneNumber,
        pack_title: record.packTitle,
        zip_filename: record.zipFilename,
        genre: record.genre,
        created_at: record.createdAt,
      })
      .select('*')
      .single();

    if (!error && data) {
      const mapped = mapRowToPackRequest(data as SupabasePackRequestRow);
      savePackRequestsCache([mapped, ...currentCache]);
      return { success: true, record: mapped };
    }
  } catch {
    // Local fallback preserved cleanly
  }

  return { success: true, record };
}

export async function fetchAllPackRequestsRemote(): Promise<PackRequestRecord[]> {
  try {
    const { data, error } = await supabase
      .from('pack_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return loadPackRequestsCache();
    }

    const mapped = (data as SupabasePackRequestRow[]).map(mapRowToPackRequest);
    savePackRequestsCache(mapped);
    return mapped;
  } catch {
    return loadPackRequestsCache();
  }
}

export async function deletePackRequestRemote(requestId: string): Promise<void> {
  const next = loadPackRequestsCache().filter((r) => r.id !== requestId);
  savePackRequestsCache(next);
  try {
    await supabase.from('pack_requests').delete().eq('id', requestId);
  } catch {
    // ignore network failure
  }
}

export function subscribePackRequestsRealtime(onChange: () => void): () => void {
  const channel = supabase
    .channel(`pack_requests_rt_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pack_requests' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export interface TrendingRequestSummary {
  zipFilename: string;
  genre: string;
  count: number;
  latestAt: number;
  countries: string[];
}

export function summarizeTopRequestedPacks(
  requests: PackRequestRecord[]
): TrendingRequestSummary[] {
  const map = new Map<string, TrendingRequestSummary>();

  for (const req of requests) {
    const key = req.zipFilename;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        zipFilename: req.zipFilename,
        genre: req.genre,
        count: 1,
        latestAt: req.createdAt,
        countries: [req.countryCode],
      });
    } else {
      existing.count += 1;
      if (req.createdAt > existing.latestAt) {
        existing.latestAt = req.createdAt;
      }
      if (!existing.countries.includes(req.countryCode)) {
        existing.countries.push(req.countryCode);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.latestAt - a.latestAt;
  });
}
