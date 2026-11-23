import {
  isTransientSupabaseError,
  supabaseClient,
  withSupabaseRetry,
} from '../lib/supabase';
import { normalizeDirectZipUrl, VipKeyRecord } from './musicPacks';

export const VIRTUALDJ_BONUS_STORAGE_KEY = 'wesley_virtualdj_bonus_v1';
export const VIRTUALDJ_BONUS_UNLOCK_STORAGE_KEY = 'wesley_virtualdj_bonus_unlocked_v1';
export const VIRTUALDJ_BONUS_UPDATED_EVENT = 'wesley-virtualdj-bonus-updated';
const VIRTUALDJ_CHANNEL_NAME = 'wesley_virtualdj_bonus_channel';
const VIRTUALDJ_SETTINGS_KEY = 'virtualdj_bonus';

export interface VirtualDjBonusConfig {
  title: string;
  downloadUrl: string;
  fileSize: string;
  isActive: boolean;
  updatedAt: number;
  source: 'supabase' | 'local';
}

export const DEFAULT_VIRTUALDJ_BONUS: VirtualDjBonusConfig = {
  title: 'VirtualDJ Pro PC/Mac — Bonus VIP',
  downloadUrl: '',
  fileSize: '',
  isActive: true,
  updatedAt: 0,
  source: 'local',
};

function broadcastVirtualDjBonusUpdate(config: VirtualDjBonusConfig): void {
  try {
    window.dispatchEvent(
      new CustomEvent<VirtualDjBonusConfig>(VIRTUALDJ_BONUS_UPDATED_EVENT, {
        detail: config,
      })
    );
  } catch {
    // ignore event errors
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(VIRTUALDJ_CHANNEL_NAME);
      ch.postMessage(config);
      ch.close();
    }
  } catch {
    // ignore BroadcastChannel errors
  }
}

export function loadLocalVirtualDjBonus(): VirtualDjBonusConfig {
  try {
    const raw = window.localStorage.getItem(VIRTUALDJ_BONUS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_VIRTUALDJ_BONUS };
    }
    const parsed = JSON.parse(raw) as Partial<VirtualDjBonusConfig>;
    const title =
      typeof parsed?.title === 'string' && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : DEFAULT_VIRTUALDJ_BONUS.title;
    const downloadUrl =
      typeof parsed?.downloadUrl === 'string'
        ? normalizeDirectZipUrl(parsed.downloadUrl)
        : '';
    const fileSize = typeof parsed?.fileSize === 'string' ? parsed.fileSize.trim() : '';
    const isActive = typeof parsed?.isActive === 'boolean' ? parsed.isActive : true;
    return {
      title,
      downloadUrl,
      fileSize,
      isActive,
      updatedAt: Number(parsed?.updatedAt) || 0,
      source: parsed?.source === 'supabase' ? 'supabase' : 'local',
    };
  } catch {
    return { ...DEFAULT_VIRTUALDJ_BONUS };
  }
}

export function saveLocalVirtualDjBonus(
  config: VirtualDjBonusConfig,
  shouldBroadcast = true
): void {
  try {
    window.localStorage.setItem(VIRTUALDJ_BONUS_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
  if (shouldBroadcast) {
    broadcastVirtualDjBonusUpdate(config);
  }
}

export function loadQualifyingVirtualDjOrderUnlocked(): boolean {
  try {
    return window.localStorage.getItem(VIRTUALDJ_BONUS_UNLOCK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveQualifyingVirtualDjOrderUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) {
      window.localStorage.setItem(VIRTUALDJ_BONUS_UNLOCK_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(VIRTUALDJ_BONUS_UNLOCK_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function isQualifyingVirtualDjKey(key: VipKeyRecord | null | undefined): boolean {
  if (!key) return false;
  return Boolean(key.isUnlimited) || key.totalFolders >= 21;
}

export function hasVirtualDjBonusAccess(params: {
  activeKey: VipKeyRecord | null | undefined;
  qualifyingOrderUnlocked: boolean;
  isAdminFreeMode: boolean;
}): boolean {
  if (params.isAdminFreeMode) return true;
  if (params.activeKey) {
    return isQualifyingVirtualDjKey(params.activeKey);
  }
  return Boolean(params.qualifyingOrderUnlocked);
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = (error.code || '').toUpperCase();
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function parseJsonValue(rawValue: unknown): Partial<VirtualDjBonusConfig> | null {
  if (!rawValue) return null;
  if (typeof rawValue === 'object') {
    return rawValue as Partial<VirtualDjBonusConfig>;
  }
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as Partial<VirtualDjBonusConfig>;
      } catch {
        return null;
      }
    }
    return { downloadUrl: trimmed };
  }
  return null;
}

function mapRawRowToVirtualDjBonus(
  row: Record<string, any> | null | undefined
): VirtualDjBonusConfig | null {
  if (!row) return null;

  const parsedJson = parseJsonValue(row.value);
  const rawTitle =
    row.title ??
    parsedJson?.title ??
    row.version_note ??
    DEFAULT_VIRTUALDJ_BONUS.title;
  const rawUrl =
    row.download_url ??
    row.downloadUrl ??
    row.url ??
    parsedJson?.downloadUrl ??
    '';
  const rawFileSize = row.file_size ?? row.fileSize ?? parsedJson?.fileSize ?? '';

  const title =
    typeof rawTitle === 'string' && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : DEFAULT_VIRTUALDJ_BONUS.title;
  const downloadUrl =
    typeof rawUrl === 'string' ? normalizeDirectZipUrl(rawUrl) : '';
  const fileSize = typeof rawFileSize === 'string' ? rawFileSize.trim() : '';

  const explicitActive =
    typeof row.is_active === 'boolean'
      ? row.is_active
      : typeof row.active === 'boolean'
        ? row.active
        : typeof parsedJson?.isActive === 'boolean'
          ? parsedJson.isActive
          : downloadUrl.length > 0;

  const updatedAt =
    Number(row.updated_at ?? parsedJson?.updatedAt) ||
    Date.parse(String(row.updated_at || '')) ||
    Date.now();

  return {
    title,
    downloadUrl,
    fileSize,
    isActive: explicitActive,
    updatedAt,
    source: 'supabase',
  };
}

export async function fetchVirtualDjBonusRemote(): Promise<{
  bonus: VirtualDjBonusConfig;
  connected: boolean;
  missingTable: boolean;
}> {
  // 1. Check `site_settings` for key = 'virtualdj_bonus'
  try {
    const res = await withSupabaseRetry(
      async () => supabaseClient.from('site_settings').select('*'),
      {
        attempts: 3,
        delayMs: 300,
        shouldRetryResult: (r) => Boolean(r.error && isTransientSupabaseError(r.error)),
      }
    );

    if (!res.error && Array.isArray(res.data)) {
      const rows = res.data as Record<string, any>[];
      const matched = rows.find(
        (r) =>
          String(r.key ?? r.setting_key ?? r.id ?? '').trim().toLowerCase() ===
          VIRTUALDJ_SETTINGS_KEY
      );

      if (matched) {
        const mapped = mapRawRowToVirtualDjBonus(matched);
        if (mapped) {
          saveLocalVirtualDjBonus(mapped);
          return { bonus: mapped, connected: true, missingTable: false };
        }
      }

      return {
        bonus: loadLocalVirtualDjBonus(),
        connected: true,
        missingTable: false,
      };
    }

    if (res.error && !isMissingTableError(res.error)) {
      return {
        bonus: loadLocalVirtualDjBonus(),
        connected: false,
        missingTable: false,
      };
    }
  } catch {
    return {
      bonus: loadLocalVirtualDjBonus(),
      connected: false,
      missingTable: false,
    };
  }

  // 2. Fallback check if a dedicated `virtualdj_bonus` table exists
  try {
    const vdjRes = await withSupabaseRetry(
      async () => supabaseClient.from('virtualdj_bonus').select('*'),
      {
        attempts: 3,
        delayMs: 300,
        shouldRetryResult: (r) => Boolean(r.error && isTransientSupabaseError(r.error)),
      }
    );

    if (!vdjRes.error && Array.isArray(vdjRes.data)) {
      const rows = vdjRes.data as Record<string, any>[];
      const sorted = [...rows].sort((a, b) => {
        const ta = Number(a.updated_at ?? a.created_at ?? 0) || 0;
        const tb = Number(b.updated_at ?? b.created_at ?? 0) || 0;
        return tb - ta;
      });
      const matched = sorted[0];
      if (matched) {
        const mapped = mapRawRowToVirtualDjBonus(matched);
        if (mapped) {
          saveLocalVirtualDjBonus(mapped);
          return { bonus: mapped, connected: true, missingTable: false };
        }
      }
      return {
        bonus: loadLocalVirtualDjBonus(),
        connected: true,
        missingTable: false,
      };
    }

    if (vdjRes.error && isMissingTableError(vdjRes.error)) {
      return {
        bonus: loadLocalVirtualDjBonus(),
        connected: true,
        missingTable: true,
      };
    }
  } catch {
    // Fallback below
  }

  return {
    bonus: loadLocalVirtualDjBonus(),
    connected: false,
    missingTable: false,
  };
}

async function persistToSiteSettings(
  config: VirtualDjBonusConfig
): Promise<{ saved: boolean; missingTable: boolean; error?: string }> {
  const serialized = JSON.stringify({
    title: config.title,
    downloadUrl: config.downloadUrl,
    fileSize: config.fileSize,
    isActive: config.isActive,
    updatedAt: config.updatedAt,
  });

  const payloads: Array<{ data: Record<string, unknown>; conflict?: string }> = [
    {
      data: {
        key: VIRTUALDJ_SETTINGS_KEY,
        value: serialized,
        is_active: config.isActive,
        updated_at: config.updatedAt,
      },
      conflict: 'key',
    },
    {
      data: {
        key: VIRTUALDJ_SETTINGS_KEY,
        value: serialized,
      },
      conflict: 'key',
    },
    {
      data: {
        id: VIRTUALDJ_SETTINGS_KEY,
        value: serialized,
        is_active: config.isActive,
        updated_at: config.updatedAt,
      },
      conflict: 'id',
    },
  ];

  let lastErrorMsg = '';
  for (const attempt of payloads) {
    const res = await supabaseClient
      .from('site_settings')
      .upsert(attempt.data, attempt.conflict ? { onConflict: attempt.conflict } : undefined);

    if (!res.error) {
      return { saved: true, missingTable: false };
    }
    if (isMissingTableError(res.error)) {
      return { saved: false, missingTable: true, error: res.error.message };
    }
    lastErrorMsg = res.error.message || '';
  }

  return { saved: false, missingTable: false, error: lastErrorMsg };
}

async function persistToDedicatedTable(
  config: VirtualDjBonusConfig
): Promise<{ saved: boolean; missingTable: boolean; error?: string }> {
  const payloads: Array<{ data: Record<string, unknown>; conflict?: string }> = [
    {
      data: {
        id: VIRTUALDJ_SETTINGS_KEY,
        title: config.title,
        download_url: config.downloadUrl,
        file_size: config.fileSize,
        is_active: config.isActive,
        updated_at: config.updatedAt,
      },
      conflict: 'id',
    },
    {
      data: {
        title: config.title,
        download_url: config.downloadUrl,
        is_active: config.isActive,
      },
    },
  ];

  let lastErrorMsg = '';
  for (const attempt of payloads) {
    const res = attempt.conflict
      ? await supabaseClient
          .from('virtualdj_bonus')
          .upsert(attempt.data, { onConflict: attempt.conflict })
      : await supabaseClient.from('virtualdj_bonus').insert(attempt.data);

    if (!res.error) {
      return { saved: true, missingTable: false };
    }
    if (isMissingTableError(res.error)) {
      return { saved: false, missingTable: true, error: res.error.message };
    }
    lastErrorMsg = res.error.message || '';
  }

  return { saved: false, missingTable: false, error: lastErrorMsg };
}

export async function publishVirtualDjBonusRemote(params: {
  title: string;
  downloadUrl: string;
  fileSize?: string;
}): Promise<{
  success: boolean;
  bonus: VirtualDjBonusConfig;
  savedToSupabase: boolean;
  missingTable: boolean;
  error?: string;
}> {
  const now = Date.now();
  const normalizedUrl = normalizeDirectZipUrl(params.downloadUrl);
  const cleanTitle = params.title.trim() || DEFAULT_VIRTUALDJ_BONUS.title;
  const cleanFileSize = (params.fileSize || '').trim();

  const localConfig: VirtualDjBonusConfig = {
    title: cleanTitle,
    downloadUrl: normalizedUrl,
    fileSize: cleanFileSize,
    isActive: true,
    updatedAt: now,
    source: 'local',
  };

  saveLocalVirtualDjBonus(localConfig, true);

  try {
    const siteRes = await persistToSiteSettings(localConfig);
    if (siteRes.saved) {
      const synced: VirtualDjBonusConfig = { ...localConfig, source: 'supabase' };
      saveLocalVirtualDjBonus(synced, true);
      return {
        success: true,
        bonus: synced,
        savedToSupabase: true,
        missingTable: false,
      };
    }

    if (siteRes.missingTable) {
      const dedRes = await persistToDedicatedTable(localConfig);
      if (dedRes.saved) {
        const synced: VirtualDjBonusConfig = { ...localConfig, source: 'supabase' };
        saveLocalVirtualDjBonus(synced, true);
        return {
          success: true,
          bonus: synced,
          savedToSupabase: true,
          missingTable: false,
        };
      }
      return {
        success: true,
        bonus: localConfig,
        savedToSupabase: false,
        missingTable: dedRes.missingTable,
        error: dedRes.error,
      };
    }

    return {
      success: true,
      bonus: localConfig,
      savedToSupabase: false,
      missingTable: false,
      error: siteRes.error,
    };
  } catch (err: any) {
    return {
      success: true,
      bonus: localConfig,
      savedToSupabase: false,
      missingTable: false,
      error: err?.message,
    };
  }
}

export async function clearVirtualDjBonusRemote(): Promise<{
  success: boolean;
  bonus: VirtualDjBonusConfig;
  savedToSupabase: boolean;
  missingTable: boolean;
}> {
  const now = Date.now();
  const clearedLocal: VirtualDjBonusConfig = {
    title: DEFAULT_VIRTUALDJ_BONUS.title,
    downloadUrl: '',
    fileSize: '',
    isActive: false,
    updatedAt: now,
    source: 'local',
  };

  saveLocalVirtualDjBonus(clearedLocal, true);

  try {
    const siteRes = await persistToSiteSettings(clearedLocal);
    if (siteRes.saved) {
      const synced: VirtualDjBonusConfig = { ...clearedLocal, source: 'supabase' };
      saveLocalVirtualDjBonus(synced, true);
      return {
        success: true,
        bonus: synced,
        savedToSupabase: true,
        missingTable: false,
      };
    }

    if (siteRes.missingTable) {
      const dedRes = await persistToDedicatedTable(clearedLocal);
      if (dedRes.saved) {
        const synced: VirtualDjBonusConfig = { ...clearedLocal, source: 'supabase' };
        saveLocalVirtualDjBonus(synced, true);
        return {
          success: true,
          bonus: synced,
          savedToSupabase: true,
          missingTable: false,
        };
      }
      return {
        success: true,
        bonus: clearedLocal,
        savedToSupabase: false,
        missingTable: dedRes.missingTable,
      };
    }
  } catch {
    // Local fallback already applied
  }

  return {
    success: true,
    bonus: clearedLocal,
    savedToSupabase: false,
    missingTable: false,
  };
}

export function subscribeVirtualDjBonusRealtime(
  onUpdate: (bonus: VirtualDjBonusConfig) => void
): () => void {
  const handleCustomEvent = (evt: Event) => {
    const custom = evt as CustomEvent<VirtualDjBonusConfig>;
    if (custom.detail) {
      onUpdate(custom.detail);
    } else {
      onUpdate(loadLocalVirtualDjBonus());
    }
  };

  const handleStorageEvent = (evt: StorageEvent) => {
    if (evt.key === VIRTUALDJ_BONUS_STORAGE_KEY) {
      onUpdate(loadLocalVirtualDjBonus());
    }
  };

  window.addEventListener(VIRTUALDJ_BONUS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(VIRTUALDJ_CHANNEL_NAME);
      bc.onmessage = (msg) => {
        if (msg?.data && typeof msg.data === 'object') {
          onUpdate(msg.data as VirtualDjBonusConfig);
        }
      };
    }
  } catch {
    bc = null;
  }

  const suffix = Math.random().toString(36).slice(2, 8);
  const channel = supabaseClient
    .channel(`virtualdj_bonus_rt_${suffix}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_settings' },
      () => {
        void fetchVirtualDjBonusRemote().then((res) => onUpdate(res.bonus));
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'virtualdj_bonus' },
      () => {
        void fetchVirtualDjBonusRemote().then((res) => onUpdate(res.bonus));
      }
    )
    .subscribe();

  return () => {
    window.removeEventListener(VIRTUALDJ_BONUS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    try {
      bc?.close();
    } catch {
      // ignore close error
    }
    void supabaseClient.removeChannel(channel);
  };
}

export function triggerVirtualDjDirectDownload(rawUrl: string, title?: string): string | null {
  const normalized = normalizeDirectZipUrl(rawUrl).trim();
  if (!normalized) return null;

  const isSupabaseStorage =
    normalized.includes('supabase.co/storage') ||
    normalized.includes('/storage/v1/object/public/');

  let cleanFilename = 'VirtualDJ_Pro_VIP_Bonus';
  try {
    const parsed = new URL(normalized);
    const seg = parsed.pathname.split('/').filter(Boolean).pop();
    if (seg && seg.includes('.')) {
      cleanFilename = decodeURIComponent(seg);
    } else if (title && title.trim()) {
      cleanFilename = title.trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
    }
  } catch {
    // fallback filename
  }

  const finalHref =
    isSupabaseStorage && !/[?&]download=/i.test(normalized)
      ? `${normalized}${normalized.includes('?') ? '&' : '?'}download=${encodeURIComponent(cleanFilename)}`
      : normalized;

  const anchor = document.createElement('a');
  anchor.href = finalHref;
  anchor.download = cleanFilename;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  return finalHref;
}
