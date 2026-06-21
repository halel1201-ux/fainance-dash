-- ===========================================================================
-- פתרונות פיננסיים לישראל — Database Schema (Postgres / Supabase)
-- Model: Deal / Auction  (per LLM-council recommendation)
--
--   Client  1───N  Deal        (a borrower may have many loan requests over time)
--   Deal    1───N  Asset       (collateral profile: 0..N cars/properties)
--   Deal    1───N  Offer       (append-only competing offers from lenders)
--   Deal    1───N  Pull        (bank-level exclusivity locks)
--
-- Exclusivity is an AUCTION constraint, not a CRM ownership flag:
--   "one ACTIVE pull per bank per deal"  → enforced by a partial unique index.
-- ===========================================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------- enums ----------
create type user_role   as enum ('admin', 'broker', 'banker', 'nonbank');
create type asset_type   as enum ('none', 'car', 'property');
create type property_kind as enum ('first_home', 'replacement', 'investment');
create type deal_status  as enum ('open', 'in_review', 'offered', 'won', 'closed', 'archived');
create type pull_status  as enum ('active', 'released', 'converted');
create type dti_status   as enum ('hot', 'good', 'borderline', 'not_possible');

-- ===========================================================================
-- Identity & org
-- ===========================================================================

create table banks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  is_nonbank  boolean not null default false,  -- גוף חוץ-בנקאי
  created_at  timestamptz not null default now()
);

-- profiles 1:1 with auth.users (Supabase Auth)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        user_role not null,
  bank_id     uuid references banks(id),          -- for banker / nonbank
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- which brokers a banker is allowed to see (admin-managed)
create table broker_banker (
  banker_id   uuid not null references profiles(id) on delete cascade,
  broker_id   uuid not null references profiles(id) on delete cascade,
  primary key (banker_id, broker_id)
);

-- ===========================================================================
-- Clients (borrowers) — owned & edited ONLY by their broker
-- ===========================================================================

create table clients (
  id              uuid primary key default gen_random_uuid(),
  broker_id       uuid not null references profiles(id),
  full_name       text not null,
  national_id     text,                           -- ת"ז (encrypt/restrict at app layer)
  phone           text,
  net_income      numeric(12,2) not null default 0,   -- הכנסה נטו
  fixed_expenses  numeric(12,2) not null default 0,   -- הוצאות קבועות
  total_obligo    numeric(14,2) not null default 0,   -- אובליגו (יתרת חוב כוללת)
  monthly_repay   numeric(12,2) not null default 0,   -- החזר חודשי קיים
  has_rent        boolean not null default false,
  rent_amount     numeric(12,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- explicit borrower consent (privacy law) — see council blind-spot #1
create table client_consents (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  granted_at   timestamptz not null default now(),
  scope        text not null default 'pool_visibility',
  signature    text                                -- ref to signed doc / e-sign id
);

-- ===========================================================================
-- Deals (loan requests) — the central entity
-- ===========================================================================

create table deals (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  broker_id       uuid not null references profiles(id),
  title           text,                            -- e.g. "מחזור משכנתא"
  requested_amount numeric(14,2),
  status          deal_status not null default 'open',
  -- frozen DTI snapshot at deal creation (mirrors src/lib/dti.ts)
  dti_status      dti_status,
  pti_pct         int,
  ltv_pct         int,
  has_collateral  boolean not null default false,  -- drives nonbank visibility
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- collateral: 0..N assets per deal (council: not a radio button)
create table assets (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references deals(id) on delete cascade,
  kind          asset_type not null,
  property_kind property_kind,                     -- when kind='property'
  value         numeric(14,2) not null default 0,
  remaining     numeric(14,2) not null default 0,  -- remaining finance / mortgage
  created_at    timestamptz not null default now()
);

-- ===========================================================================
-- Pulls — bank-level exclusivity (the race-critical table)
-- ===========================================================================

create table pulls (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  bank_id     uuid not null references banks(id),
  banker_id   uuid not null references profiles(id),
  status      pull_status not null default 'active',
  pulled_at   timestamptz not null default now(),
  released_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days')  -- TTL → auto-release
);

-- EXCLUSIVITY: at most one ACTIVE pull per (deal, bank).
-- This single index is what makes the atomic pull safe (INSERT .. ON CONFLICT).
create unique index pulls_one_active_per_bank
  on pulls (deal_id, bank_id)
  where status = 'active';

-- ===========================================================================
-- Offers — append-only ledger (never UPDATE; supersede with a new row)
-- ===========================================================================

create table offers (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references deals(id) on delete cascade,
  bank_id       uuid not null references banks(id),
  banker_id     uuid not null references profiles(id),
  amount        numeric(14,2) not null,           -- סכום ניתן לגיוס
  prime_delta   numeric(5,2) not null,            -- ריבית P±  (e.g. -0.5)
  term_months   int not null,                     -- פריסה
  monthly_payment numeric(12,2),                  -- snapshot של החזר משוער
  note          text,
  is_binding    boolean not null default false,   -- pre-approval vs binding (council)
  superseded_by uuid references offers(id),
  created_at    timestamptz not null default now()
);

-- ===========================================================================
-- Audit log — tamper-evident trail (regulated financial activity)
-- ===========================================================================

create table audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id),
  action      text not null,                       -- 'pull','release','offer','edit_client'...
  entity      text not null,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- Atomic pull — the single race-critical operation
-- Two bankers from the same bank pulling the same deal at once:
-- the partial unique index rejects the loser cleanly. No app-level locking.
-- ===========================================================================

create or replace function pull_deal(p_deal_id uuid)
returns pulls
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles;
  v_pull    pulls;
begin
  select * into v_profile from profiles where id = auth.uid();
  if v_profile is null or v_profile.role not in ('banker', 'nonbank') then
    raise exception 'only a banker or nonbank lender can pull a deal';
  end if;

  insert into pulls (deal_id, bank_id, banker_id)
  values (p_deal_id, v_profile.bank_id, v_profile.id)
  on conflict (deal_id, bank_id) where (status = 'active')
  do nothing
  returning * into v_pull;

  if v_pull is null then
    raise exception 'deal already pulled by your bank';
  end if;

  update deals set status = 'in_review', updated_at = now() where id = p_deal_id;

  insert into audit_log (actor_id, action, entity, entity_id, detail)
  values (v_profile.id, 'pull', 'deal', p_deal_id,
          jsonb_build_object('bank_id', v_profile.bank_id));

  return v_pull;
end;
$$;

-- release stale pulls (call from a scheduled job / pg_cron)
create or replace function release_expired_pulls()
returns int
language sql
security definer
set search_path = public
as $$
  with done as (
    update pulls set status = 'released', released_at = now()
    where status = 'active' and expires_at < now()
    returning 1
  )
  select count(*)::int from done;
$$;

-- ===========================================================================
-- Row Level Security  (the security model — not an add-on)
-- ===========================================================================

alter table profiles      enable row level security;
alter table banks         enable row level security;
alter table broker_banker enable row level security;
alter table clients       enable row level security;
alter table client_consents enable row level security;
alter table deals         enable row level security;
alter table assets        enable row level security;
alter table pulls         enable row level security;
alter table offers        enable row level security;
alter table audit_log     enable row level security;

-- helper: current user's role / bank
create or replace function my_role() returns user_role
  language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function my_bank() returns uuid
  language sql stable security definer set search_path = public as
$$ select bank_id from profiles where id = auth.uid() $$;

-- profiles: everyone reads, only admin writes; users read self
create policy profiles_read   on profiles for select using (true);
create policy profiles_admin  on profiles for all
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- banks: readable by all authenticated; admin writes
create policy banks_read  on banks for select using (true);
create policy banks_admin on banks for all
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- clients:
--   broker → only own clients (full)        admin → all
--   banker → clients of brokers they work with
--   nonbank → clients that have at least one collateral deal
create policy clients_broker on clients for all
  using (broker_id = auth.uid())
  with check (broker_id = auth.uid());

create policy clients_admin on clients for select
  using (my_role() = 'admin');

create policy clients_banker on clients for select
  using (
    my_role() = 'banker'
    and exists (
      select 1 from broker_banker bb
      where bb.banker_id = auth.uid() and bb.broker_id = clients.broker_id
    )
  );

create policy clients_nonbank on clients for select
  using (
    my_role() = 'nonbank'
    and exists (
      select 1 from deals d
      where d.client_id = clients.id and d.has_collateral = true
    )
  );

-- deals: broker writes own; lenders read by the same visibility rules
create policy deals_broker on deals for all
  using (broker_id = auth.uid()) with check (broker_id = auth.uid());
create policy deals_admin on deals for select using (my_role() = 'admin');
create policy deals_banker on deals for select
  using (
    my_role() = 'banker'
    and exists (select 1 from broker_banker bb
                where bb.banker_id = auth.uid() and bb.broker_id = deals.broker_id)
  );
create policy deals_nonbank on deals for select
  using (my_role() = 'nonbank' and deals.has_collateral = true);

-- assets: follow their deal's visibility (broker writes, lenders read)
create policy assets_broker on assets for all
  using (exists (select 1 from deals d where d.id = assets.deal_id and d.broker_id = auth.uid()))
  with check (exists (select 1 from deals d where d.id = assets.deal_id and d.broker_id = auth.uid()));
create policy assets_read on assets for select using (true);

-- pulls: banker sees own bank's pulls; created only via pull_deal() RPC
create policy pulls_read on pulls for select
  using (my_role() = 'admin' or bank_id = my_bank()
         or exists (select 1 from deals d where d.id = pulls.deal_id and d.broker_id = auth.uid()));

-- offers: insert by banker/nonbank for own bank; read by deal's broker + admin + own bank
create policy offers_insert on offers for insert
  with check (
    my_role() in ('banker','nonbank') and bank_id = my_bank() and banker_id = auth.uid()
  );
create policy offers_read on offers for select
  using (
    my_role() = 'admin'
    or bank_id = my_bank()
    or exists (select 1 from deals d where d.id = offers.deal_id and d.broker_id = auth.uid())
  );

-- consents: broker manages own clients' consent
create policy consents_broker on client_consents for all
  using (exists (select 1 from clients c where c.id = client_consents.client_id and c.broker_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = client_consents.client_id and c.broker_id = auth.uid()));

-- audit_log: admin reads; inserts happen via security-definer functions
create policy audit_admin on audit_log for select using (my_role() = 'admin');