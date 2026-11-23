-- ============================================================================
-- WESLEY MUSIC PACKS — SUPABASE REALTIME DATABASE SETUP SCRIPT
-- Paste and run this entire script once in your Supabase SQL Editor.
-- ============================================================================

-- 1. VIP KEYS TABLE (Single-use & multi-credit folder quotas: 10, 21, 36, 55, or 999 Unlimited)
create table if not exists public.vip_keys (
  key_code text primary key,
  plan_name text not null default '20+1 Folder = 21',
  total_credits integer not null default 21 check (total_credits > 0),
  remaining_credits integer not null default 21 check (remaining_credits >= 0),
  is_unlimited boolean not null default false,
  created_at timestamptz not null default now(),
  note text
);

-- Ensure columns exist if vip_keys table was created with older column names
alter table public.vip_keys add column if not exists key_code text;
alter table public.vip_keys add column if not exists plan_name text;
alter table public.vip_keys add column if not exists total_credits integer;
alter table public.vip_keys add column if not exists remaining_credits integer;
alter table public.vip_keys add column if not exists is_unlimited boolean not null default false;
create unique index if not exists idx_vip_keys_key_code on public.vip_keys (key_code);

-- 2. CUSTOMER PAYMENTS TABLE (Natcash Haiti + USDT TRC20 International)
create table if not exists public.payments (
  id text primary key,
  method text not null check (method in ('natcash', 'usdt_trc20')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  plan_id text not null,
  plan_title text not null,
  folders integer not null check (folders > 0),
  amount_label text not null,
  usdt_amount numeric,
  country_code text not null,
  country_name text not null,
  buyer_phone text,
  transaction_id text not null,
  issued_vip_key text,
  verified_by text check (verified_by in ('trongrid', 'admin')),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- 3. INDEXES FOR FAST LOOKUPS & LIVE QUEUE SORTING
create index if not exists idx_vip_keys_created_at on public.vip_keys (created_at desc);
create index if not exists idx_payments_created_at on public.payments (created_at desc);
create index if not exists idx_payments_status on public.payments (status, created_at desc);
create index if not exists idx_payments_tx on public.payments (method, transaction_id);

-- 4. ATOMIC RPC: VALIDATE VIP KEY AGAINST SUPABASE vip_keys
create or replace function public.validate_and_activate_vip_key(
  p_code text,
  p_device_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm_code text := upper(trim(coalesce(p_code, '')));
  v_row public.vip_keys%rowtype;
begin
  if v_norm_code = '' then
    return jsonb_build_object(
      'status', 'invalid',
      'error', 'Tanpri antre Kòd VIP ou a anvan ou klike sou bouton an.'
    );
  end if;

  select * into v_row
  from public.vip_keys
  where upper(trim(key_code)) = v_norm_code
  for update;

  if not found then
    return jsonb_build_object(
      'status', 'invalid',
      'error', 'Kòd VIP sa a pa egziste nan sistèm nan. Verifye Kòd Prepeye ou a oswa achte yon nouvo Kle VIP otomatik anba a.'
    );
  end if;

  if not coalesce(v_row.is_unlimited, false) and coalesce(v_row.remaining_credits, 0) <= 0 then
    return jsonb_build_object(
      'status', 'burned',
      'record', to_jsonb(v_row),
      'error', '🚫 KÒD SA A DEJA SÈVI / EKSPIRE'
    );
  end if;

  return jsonb_build_object(
    'status', 'valid',
    'record', to_jsonb(v_row)
  );
end;
$$;

-- 5. ATOMIC RPC: DECREMENT FOLDER CREDITS ACCURATELY ACROSS DEVICES
create or replace function public.consume_vip_folder_credit(
  p_code text,
  p_pack_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm_code text := upper(trim(coalesce(p_code, '')));
  v_row public.vip_keys%rowtype;
  v_is_unlimited boolean;
  v_next_remaining integer;
  v_is_now_burned boolean;
begin
  select * into v_row
  from public.vip_keys
  where upper(trim(key_code)) = v_norm_code
  for update;

  if not found then
    return jsonb_build_object(
      'allowed', false,
      'updated_record', null,
      'was_already_downloaded', false,
      'just_exhausted', false
    );
  end if;

  v_is_unlimited := coalesce(v_row.is_unlimited, false) or coalesce(v_row.total_credits, 0) >= 999;

  if not v_is_unlimited and coalesce(v_row.remaining_credits, 0) <= 0 then
    return jsonb_build_object(
      'allowed', false,
      'updated_record', to_jsonb(v_row),
      'was_already_downloaded', false,
      'just_exhausted', true
    );
  end if;

  if v_is_unlimited then
    v_next_remaining := greatest(1, coalesce(v_row.remaining_credits, 999));
  else
    v_next_remaining := greatest(0, coalesce(v_row.remaining_credits, 0) - 1);
  end if;

  v_is_now_burned := (not v_is_unlimited) and (v_next_remaining = 0);

  update public.vip_keys
  set remaining_credits = v_next_remaining
  where key_code = v_row.key_code
  returning * into v_row;

  return jsonb_build_object(
    'allowed', true,
    'updated_record', to_jsonb(v_row),
    'was_already_downloaded', false,
    'just_exhausted', v_is_now_burned
  );
end;
$$;

grant execute on function public.validate_and_activate_vip_key(text, text) to anon, authenticated;
grant execute on function public.consume_vip_folder_credit(text, text) to anon, authenticated;

-- 6. USED TRANSACTIONS TABLE (Prevents TxID / Natcash ID reuse permanently)
create table if not exists public.used_transactions (
  tx_id text primary key,
  method text not null check (method in ('natcash', 'usdt_trc20')),
  plan_id text not null,
  amount_paid numeric not null default 0,
  issued_vip_key text,
  used_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- 7. NATCASH SMS RECEIPTS TABLE (Auto-matches incoming +509 56568810 SMS receipts)
create table if not exists public.natcash_sms_receipts (
  tx_id text primary key,
  sender_phone text,
  amount_htg numeric not null check (amount_htg > 0),
  raw_sms text,
  claimed boolean not null default false,
  claimed_vip_key text,
  received_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  claimed_at bigint
);

create index if not exists idx_used_tx_used_at on public.used_transactions (used_at desc);
create index if not exists idx_natcash_receipts_claimed on public.natcash_sms_receipts (claimed, received_at desc);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES FOR ANON CLIENT & ADMIN VIP PANEL
alter table public.vip_keys enable row level security;
alter table public.payments enable row level security;
alter table public.used_transactions enable row level security;
alter table public.natcash_sms_receipts enable row level security;

drop policy if exists "Allow anon select vip_keys" on public.vip_keys;
drop policy if exists "Allow anon insert vip_keys" on public.vip_keys;
drop policy if exists "Allow anon update vip_keys" on public.vip_keys;
drop policy if exists "Allow anon delete vip_keys" on public.vip_keys;

create policy "Allow anon select vip_keys" on public.vip_keys for select to anon, authenticated using (true);
create policy "Allow anon insert vip_keys" on public.vip_keys for insert to anon, authenticated with check (true);
create policy "Allow anon update vip_keys" on public.vip_keys for update to anon, authenticated using (true) with check (true);
create policy "Allow anon delete vip_keys" on public.vip_keys for delete to anon, authenticated using (true);

drop policy if exists "Allow anon select payments" on public.payments;
drop policy if exists "Allow anon insert payments" on public.payments;
drop policy if exists "Allow anon update payments" on public.payments;
drop policy if exists "Allow anon delete payments" on public.payments;

create policy "Allow anon select payments" on public.payments for select to anon, authenticated using (true);
create policy "Allow anon insert payments" on public.payments for insert to anon, authenticated with check (true);
create policy "Allow anon update payments" on public.payments for update to anon, authenticated using (true) with check (true);
create policy "Allow anon delete payments" on public.payments for delete to anon, authenticated using (true);

drop policy if exists "Allow anon select used_transactions" on public.used_transactions;
drop policy if exists "Allow anon insert used_transactions" on public.used_transactions;

create policy "Allow anon select used_transactions" on public.used_transactions for select to anon, authenticated using (true);
create policy "Allow anon insert used_transactions" on public.used_transactions for insert to anon, authenticated with check (true);

drop policy if exists "Allow anon select natcash_sms_receipts" on public.natcash_sms_receipts;
drop policy if exists "Allow anon insert natcash_sms_receipts" on public.natcash_sms_receipts;
drop policy if exists "Allow anon update natcash_sms_receipts" on public.natcash_sms_receipts;

create policy "Allow anon select natcash_sms_receipts" on public.natcash_sms_receipts for select to anon, authenticated using (true);
create policy "Allow anon insert natcash_sms_receipts" on public.natcash_sms_receipts for insert to anon, authenticated with check (true);
create policy "Allow anon update natcash_sms_receipts" on public.natcash_sms_receipts for update to anon, authenticated using (true) with check (true);

-- 9. ENABLE REALTIME WEBSOCKET SYNC FOR ALL TABLES
alter table public.vip_keys replica identity full;
alter table public.payments replica identity full;
alter table public.natcash_sms_receipts replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vip_keys'
  ) then
    alter publication supabase_realtime add table public.vip_keys;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'natcash_sms_receipts'
  ) then
    alter publication supabase_realtime add table public.natcash_sms_receipts;
  end if;
end;
$$;

-- 9B. VISITORS & LIVE ONLINE PRESENCE + REFERRAL PROGRAM TABLE
create table if not exists public.visitors (
  session_id text primary key,
  full_name text not null,
  country text not null,
  country_code text not null,
  phone_number text not null,
  referral_code text unique,
  referred_by text,
  has_purchased boolean not null default false,
  referral_reward_claimed boolean not null default false,
  bonus_credits integer not null default 0 check (bonus_credits >= 0),
  is_online boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Ensure session_id, referral columns & indexes exist even if table was created earlier
alter table public.visitors add column if not exists session_id text;
alter table public.visitors add column if not exists referral_code text;
alter table public.visitors add column if not exists referred_by text;
alter table public.visitors add column if not exists has_purchased boolean not null default false;
alter table public.visitors add column if not exists referral_reward_claimed boolean not null default false;
alter table public.visitors add column if not exists bonus_credits integer not null default 0;
create unique index if not exists idx_visitors_session_id on public.visitors (session_id);
create unique index if not exists idx_visitors_referral_code on public.visitors (referral_code);
create index if not exists idx_visitors_referred_by on public.visitors (referred_by);
create index if not exists idx_visitors_last_seen on public.visitors (last_seen_at desc);
create index if not exists idx_visitors_online on public.visitors (is_online, last_seen_at desc);

alter table public.visitors enable row level security;

drop policy if exists "Allow anon select visitors" on public.visitors;
drop policy if exists "Allow anon insert visitors" on public.visitors;
drop policy if exists "Allow anon update visitors" on public.visitors;
drop policy if exists "Allow anon delete visitors" on public.visitors;

create policy "Allow anon select visitors" on public.visitors for select to anon, authenticated using (true);
create policy "Allow anon insert visitors" on public.visitors for insert to anon, authenticated with check (true);
create policy "Allow anon update visitors" on public.visitors for update to anon, authenticated using (true) with check (true);
create policy "Allow anon delete visitors" on public.visitors for delete to anon, authenticated using (true);

alter table public.visitors replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visitors'
  ) then
    alter publication supabase_realtime add table public.visitors;
  end if;
end;
$$;

-- 9C. TRENDING PACK REQUESTS TABLE ("🔔 Mande Pake Sa a")
create table if not exists public.pack_requests (
  id text primary key,
  visitor_id text,
  visitor_name text not null,
  country text not null,
  country_code text not null,
  phone_number text not null,
  pack_title text not null,
  zip_filename text not null,
  genre text not null default 'Trending VIP',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_pack_requests_created_at on public.pack_requests (created_at desc);
create index if not exists idx_pack_requests_zip on public.pack_requests (zip_filename);

alter table public.pack_requests enable row level security;

drop policy if exists "Allow anon select pack_requests" on public.pack_requests;
drop policy if exists "Allow anon insert pack_requests" on public.pack_requests;
drop policy if exists "Allow anon delete pack_requests" on public.pack_requests;

create policy "Allow anon select pack_requests" on public.pack_requests for select to anon, authenticated using (true);
create policy "Allow anon insert pack_requests" on public.pack_requests for insert to anon, authenticated with check (true);
create policy "Allow anon delete pack_requests" on public.pack_requests for delete to anon, authenticated using (true);

alter table public.pack_requests replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pack_requests'
  ) then
    alter publication supabase_realtime add table public.pack_requests;
  end if;
end;
$$;

-- 10. OPTIONAL SMS WEBHOOK / FORWARDER RPC (For owner's Android SMS Forwarder / MacroDroid)
create or replace function public.ingest_natcash_sms_webhook(
  p_raw_sms text,
  p_sender_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sms text := trim(coalesce(p_raw_sms, ''));
  v_tx_match text[];
  v_amt_match text[];
  v_tx_id text;
  v_amt_clean text;
  v_amount numeric;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if v_sms = '' then
    return jsonb_build_object('ok', false, 'error', 'Empty SMS body');
  end if;

  if regexp_replace(v_sms, '[^0-9]', '', 'g') not like '%56568810%' then
    return jsonb_build_object('ok', false, 'error', 'Recipient 56568810 not found in SMS');
  end if;

  v_tx_match := regexp_match(
    v_sms,
    '(?:id\s*(?:transaksyon|tranzaksyon|transaction)?|transaction\s*id|ref(?:erans|erence)?|txid)\s*[:#=\-]?\s*([A-Za-z0-9]{6,24})',
    'i'
  );

  if v_tx_match is null or array_length(v_tx_match, 1) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Transaction ID not found in SMS');
  end if;

  v_tx_id := upper(trim(v_tx_match[1]));

  v_amt_match := regexp_match(
    v_sms,
    '([0-9][0-9.,]*)\s*(?:htg|gourdes?|goud|gds)\b',
    'i'
  );

  if v_amt_match is null or array_length(v_amt_match, 1) < 1 then
    return jsonb_build_object('ok', false, 'error', 'HTG amount not found in SMS');
  end if;

  v_amt_clean := replace(v_amt_match[1], ',', '');
  v_amount := v_amt_clean::numeric;

  insert into public.natcash_sms_receipts (
    tx_id,
    sender_phone,
    amount_htg,
    raw_sms,
    claimed,
    received_at
  ) values (
    v_tx_id,
    nullif(trim(coalesce(p_sender_phone, '')), ''),
    v_amount,
    v_sms,
    false,
    v_now
  )
  on conflict (tx_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'tx_id', v_tx_id,
    'amount_htg', v_amount
  );
end;
$$;

grant execute on function public.ingest_natcash_sms_webhook(text, text) to anon, authenticated;

-- 11. STORAGE BUCKET FOR REAL MP3 AUDIO FILES ('music-packs')
insert into storage.buckets (id, name, public)
values ('music-packs', 'music-packs', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access music-packs" on storage.objects;
create policy "Public Access music-packs"
on storage.objects for select
to public
using (bucket_id = 'music-packs');

drop policy if exists "Allow upload to music-packs" on storage.objects;
create policy "Allow upload to music-packs"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'music-packs');

drop policy if exists "Allow update on music-packs" on storage.objects;
create policy "Allow update on music-packs"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'music-packs');

drop policy if exists "Allow delete on music-packs" on storage.objects;
create policy "Allow delete on music-packs"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'music-packs');

-- 12. MUSIC PACKS TABLE FOR REMOTE CATALOG PERSISTENCE
create table if not exists public.music_packs (
  id text primary key,
  slug text not null,
  title text not null,
  filename text,
  subtitle text not null,
  genre text not null,
  track_count integer not null default 0,
  file_size text not null default '',
  bitrate text not null default 'MP3 320kbps',
  bpm_range text not null default '',
  cover_image text not null,
  tracks jsonb not null default '[]'::jsonb,
  is_custom_upload boolean not null default true,
  is_coming_soon boolean not null default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_music_packs_created_at on public.music_packs (created_at desc);

alter table public.music_packs enable row level security;

drop policy if exists "Allow anon select music_packs" on public.music_packs;
drop policy if exists "Allow anon insert music_packs" on public.music_packs;
drop policy if exists "Allow anon update music_packs" on public.music_packs;
drop policy if exists "Allow anon delete music_packs" on public.music_packs;

create policy "Allow anon select music_packs" on public.music_packs for select to anon, authenticated using (true);
create policy "Allow anon insert music_packs" on public.music_packs for insert to anon, authenticated with check (true);
create policy "Allow anon update music_packs" on public.music_packs for update to anon, authenticated using (true) with check (true);
create policy "Allow anon delete music_packs" on public.music_packs for delete to anon, authenticated using (true);

alter table public.music_packs replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'music_packs'
  ) then
    alter publication supabase_realtime add table public.music_packs;
  end if;
end;
$$;

-- 13. GRANT FULL API ACCESS TO ANON & AUTHENTICATED ON ALL PUBLIC TABLES
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
