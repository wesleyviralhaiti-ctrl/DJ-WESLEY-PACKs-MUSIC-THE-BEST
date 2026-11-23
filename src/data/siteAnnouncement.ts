import {
  isTransientSupabaseError,
  supabaseClient,
  withSupabaseRetry,
} from '../lib/supabase';

export const SITE_ANNOUNCEMENT_STORAGE_KEY = 'wesley_site_announcement_v1';
export const SITE_ANNOUNCEMENT_UPDATED_EVENT = 'wesley-site-announcement-updated';
const ANNOUNCEMENT_CHANNEL_NAME = 'wesley_site_announcement_channel';
const ANNOUNCEMENT_KEY = 'announcement_banner';

export interface SiteAnnouncement {
  message: string;
  isActive: boolean;
  updatedAt: number;
  source: 'supabase' | 'local';
}

export const SITE_SETTINGS_SQL_SNIPPET = `CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public write site_settings" ON public.site_settings;
CREATE POLICY "Public write site_settings" ON public.site_settings
  FOR ALL USING (true) WITH CHECK (true);`;

function broadcastAnnouncementUpdate(announcement: SiteAnnouncement): void {
  try {
    window.dispatchEvent(
      new CustomEvent<SiteAnnouncement>(SITE_ANNOUNCEMENT_UPDATED_EVENT, {
        detail: announcement,
      })
    );
  } catch {
    // ignore event errors
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(ANNOUNCEMENT_CHANNEL_NAME);
      ch.postMessage(announcement);
      ch.close();
    }
  } catch {
    // ignore BroadcastChannel errors
  }
}

export function loadLocalSiteAnnouncement(): SiteAnnouncement {
  try {
    const raw = window.localStorage.getItem(SITE_ANNOUNCEMENT_STORAGE_KEY);
    if (!raw) {
      return { message: '', isActive: false, updatedAt: 0, source: 'local' };
    }
    const parsed = JSON.parse(raw) as Partial<SiteAnnouncement>;
    const message = typeof parsed?.message === 'string' ? parsed.message.trim() : '';
    const isActive = Boolean(parsed?.isActive) && message.length > 0;
    return {
      message,
      isActive,
      updatedAt: Number(parsed?.updatedAt) || 0,
      source: parsed?.source === 'supabase' ? 'supabase' : 'local',
    };
  } catch {
    return { message: '', isActive: false, updatedAt: 0, source: 'local' };
  }
}

export function saveLocalSiteAnnouncement(
  announcement: SiteAnnouncement,
  shouldBroadcast = true
): void {
  try {
    window.localStorage.setItem(SITE_ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(announcement));
  } catch {
    // ignore storage quota errors
  }
  if (shouldBroadcast) {
    broadcastAnnouncementUpdate(announcement);
  }
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

function mapRawRowToAnnouncement(row: Record<string, any> | null | undefined): SiteAnnouncement | null {
  if (!row) return null;
  const rawMessage =
    row.value ??
    row.message ??
    row.announcement_text ??
    row.announcement ??
    row.text ??
    row.content ??
    '';
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  const explicitActive =
    typeof row.is_active === 'boolean'
      ? row.is_active
      : typeof row.active === 'boolean'
        ? row.active
        : message.length > 0;
  const isActive = explicitActive && message.length > 0;
  const updatedAt = Number(row.updated_at) || Date.parse(String(row.updated_at || '')) || Date.now();
  return {
    message,
    isActive,
    updatedAt,
    source: 'supabase',
  };
}

export async function fetchSiteAnnouncementRemote(): Promise<{
  announcement: SiteAnnouncement;
  connected: boolean;
  missingTable: boolean;
}> {
  // 1. Try `site_settings` table first
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
      const matched =
        rows.find(
          (r) =>
            String(r.key ?? r.setting_key ?? r.id ?? '').trim().toLowerCase() ===
            ANNOUNCEMENT_KEY
        ) || rows[0];

      if (matched) {
        const mapped = mapRawRowToAnnouncement(matched);
        if (mapped) {
          saveLocalSiteAnnouncement(mapped);
          return { announcement: mapped, connected: true, missingTable: false };
        }
      }
      return {
        announcement: loadLocalSiteAnnouncement(),
        connected: true,
        missingTable: false,
      };
    }

    if (res.error && !isMissingTableError(res.error)) {
      return {
        announcement: loadLocalSiteAnnouncement(),
        connected: false,
        missingTable: false,
      };
    }
  } catch {
    return {
      announcement: loadLocalSiteAnnouncement(),
      connected: false,
      missingTable: false,
    };
  }

  // 2. Try `announcements` table fallback if `site_settings` doesn't exist
  try {
    const annRes = await withSupabaseRetry(
      async () => supabaseClient.from('announcements').select('*'),
      {
        attempts: 3,
        delayMs: 300,
        shouldRetryResult: (r) => Boolean(r.error && isTransientSupabaseError(r.error)),
      }
    );

    if (!annRes.error && Array.isArray(annRes.data)) {
      const rows = annRes.data as Record<string, any>[];
      const sorted = [...rows].sort((a, b) => {
        const ta = Number(a.updated_at ?? a.created_at ?? 0) || 0;
        const tb = Number(b.updated_at ?? b.created_at ?? 0) || 0;
        return tb - ta;
      });
      const matched = sorted[0];
      if (matched) {
        const mapped = mapRawRowToAnnouncement(matched);
        if (mapped) {
          saveLocalSiteAnnouncement(mapped);
          return { announcement: mapped, connected: true, missingTable: false };
        }
      }
      return {
        announcement: loadLocalSiteAnnouncement(),
        connected: true,
        missingTable: false,
      };
    }

    if (annRes.error && isMissingTableError(annRes.error)) {
      return {
        announcement: loadLocalSiteAnnouncement(),
        connected: true,
        missingTable: true,
      };
    }
  } catch {
    // Fallback below
  }

  return {
    announcement: loadLocalSiteAnnouncement(),
    connected: false,
    missingTable: false,
  };
}

async function persistToSiteSettingsTable(
  message: string,
  isActive: boolean,
  updatedAt: number
): Promise<{ saved: boolean; missingTable: boolean; error?: string }> {
  const payloads: Array<{ data: Record<string, unknown>; conflict?: string }> = [
    {
      data: {
        key: ANNOUNCEMENT_KEY,
        value: message,
        is_active: isActive,
        updated_at: updatedAt,
      },
      conflict: 'key',
    },
    {
      data: {
        key: ANNOUNCEMENT_KEY,
        value: message,
      },
      conflict: 'key',
    },
    {
      data: {
        id: ANNOUNCEMENT_KEY,
        value: message,
        is_active: isActive,
        updated_at: updatedAt,
      },
      conflict: 'id',
    },
    {
      data: {
        id: ANNOUNCEMENT_KEY,
        message,
        is_active: isActive,
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

async function persistToAnnouncementsTable(
  message: string,
  isActive: boolean,
  updatedAt: number
): Promise<{ saved: boolean; missingTable: boolean; error?: string }> {
  const payloads: Array<{ data: Record<string, unknown>; conflict?: string }> = [
    {
      data: {
        id: ANNOUNCEMENT_KEY,
        message,
        is_active: isActive,
        updated_at: updatedAt,
      },
      conflict: 'id',
    },
    {
      data: {
        message,
        is_active: isActive,
      },
    },
  ];

  let lastErrorMsg = '';
  for (const attempt of payloads) {
    const res = attempt.conflict
      ? await supabaseClient
          .from('announcements')
          .upsert(attempt.data, { onConflict: attempt.conflict })
      : await supabaseClient.from('announcements').insert(attempt.data);

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

export async function publishSiteAnnouncementRemote(rawMessage: string): Promise<{
  success: boolean;
  announcement: SiteAnnouncement;
  savedToSupabase: boolean;
  missingTable: boolean;
  error?: string;
}> {
  const trimmed = rawMessage.trim();
  const now = Date.now();
  const localAnnouncement: SiteAnnouncement = {
    message: trimmed,
    isActive: trimmed.length > 0,
    updatedAt: now,
    source: 'local',
  };

  // Always update localStorage + storefront immediately
  saveLocalSiteAnnouncement(localAnnouncement, true);

  try {
    const siteRes = await persistToSiteSettingsTable(trimmed, trimmed.length > 0, now);
    if (siteRes.saved) {
      const synced: SiteAnnouncement = { ...localAnnouncement, source: 'supabase' };
      saveLocalSiteAnnouncement(synced, true);
      return {
        success: true,
        announcement: synced,
        savedToSupabase: true,
        missingTable: false,
      };
    }

    if (siteRes.missingTable) {
      const annRes = await persistToAnnouncementsTable(trimmed, trimmed.length > 0, now);
      if (annRes.saved) {
        const synced: SiteAnnouncement = { ...localAnnouncement, source: 'supabase' };
        saveLocalSiteAnnouncement(synced, true);
        return {
          success: true,
          announcement: synced,
          savedToSupabase: true,
          missingTable: false,
        };
      }
      return {
        success: true,
        announcement: localAnnouncement,
        savedToSupabase: false,
        missingTable: annRes.missingTable,
        error: annRes.error,
      };
    }

    return {
      success: true,
      announcement: localAnnouncement,
      savedToSupabase: false,
      missingTable: false,
      error: siteRes.error,
    };
  } catch (err: any) {
    return {
      success: true,
      announcement: localAnnouncement,
      savedToSupabase: false,
      missingTable: false,
      error: err?.message,
    };
  }
}

export async function clearSiteAnnouncementRemote(): Promise<{
  success: boolean;
  announcement: SiteAnnouncement;
  savedToSupabase: boolean;
  missingTable: boolean;
}> {
  const now = Date.now();
  const clearedLocal: SiteAnnouncement = {
    message: '',
    isActive: false,
    updatedAt: now,
    source: 'local',
  };

  // Always clear localStorage + storefront immediately
  saveLocalSiteAnnouncement(clearedLocal, true);

  try {
    const siteRes = await persistToSiteSettingsTable('', false, now);
    if (siteRes.saved) {
      const synced: SiteAnnouncement = { ...clearedLocal, source: 'supabase' };
      saveLocalSiteAnnouncement(synced, true);
      return {
        success: true,
        announcement: synced,
        savedToSupabase: true,
        missingTable: false,
      };
    }

    if (siteRes.missingTable) {
      const annRes = await persistToAnnouncementsTable('', false, now);
      if (annRes.saved) {
        const synced: SiteAnnouncement = { ...clearedLocal, source: 'supabase' };
        saveLocalSiteAnnouncement(synced, true);
        return {
          success: true,
          announcement: synced,
          savedToSupabase: true,
          missingTable: false,
        };
      }
      return {
        success: true,
        announcement: clearedLocal,
        savedToSupabase: false,
        missingTable: annRes.missingTable,
      };
    }
  } catch {
    // Local fallback already succeeded
  }

  return {
    success: true,
    announcement: clearedLocal,
    savedToSupabase: false,
    missingTable: false,
  };
}

export function subscribeSiteAnnouncementRealtime(
  onUpdate: (announcement: SiteAnnouncement) => void
): () => void {
  const handleCustomEvent = (evt: Event) => {
    const custom = evt as CustomEvent<SiteAnnouncement>;
    if (custom.detail) {
      onUpdate(custom.detail);
    } else {
      onUpdate(loadLocalSiteAnnouncement());
    }
  };

  const handleStorageEvent = (evt: StorageEvent) => {
    if (evt.key === SITE_ANNOUNCEMENT_STORAGE_KEY) {
      onUpdate(loadLocalSiteAnnouncement());
    }
  };

  window.addEventListener(SITE_ANNOUNCEMENT_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(ANNOUNCEMENT_CHANNEL_NAME);
      bc.onmessage = (msg) => {
        if (msg?.data && typeof msg.data === 'object') {
          onUpdate(msg.data as SiteAnnouncement);
        }
      };
    }
  } catch {
    bc = null;
  }

  const suffix = Math.random().toString(36).slice(2, 8);
  const channel = supabaseClient
    .channel(`site_announcement_rt_${suffix}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_settings' },
      () => {
        void fetchSiteAnnouncementRemote().then((res) => onUpdate(res.announcement));
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      () => {
        void fetchSiteAnnouncementRemote().then((res) => onUpdate(res.announcement));
      }
    )
    .subscribe();

  return () => {
    window.removeEventListener(SITE_ANNOUNCEMENT_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    try {
      bc?.close();
    } catch {
      // ignore close error
    }
    void supabaseClient.removeChannel(channel);
  };
}
