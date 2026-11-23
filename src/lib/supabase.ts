import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://gkstgjhzeqiocdbrsnte.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_X1X2bBh2zhNn0-WNUyM8SQ_Rdauq-Ms';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
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
