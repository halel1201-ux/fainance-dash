-- ===========================================================================
-- Migration 002 — Advisor↔Banker sharing, client-level offers (auction),
-- notifications, banker branch area.  Run AFTER schema.sql in the SQL Editor.
-- Idempotent: safe to run more than once.
-- ===========================================================================

-- 1) banker branch area (city/region)
alter table profiles add column if not exists branch_area text;

-- 2) admin may manage (assign/transfer) clients
drop policy if exists clients_admin on clients;
create policy clients_admin on clients for all
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- 3) offers become client-level (the auction)
alter table offers add column if not exists client_id uuid references clients(id) on delete cascade;
alter table offers alter column deal_id drop not null;
alter table offers add column if not exists status text not null default 'offered'; -- 'offered' | 'rejected'

-- one offer row per banker per client (so a banker updates, not duplicates)
create unique index if not exists offers_one_per_banker_client
  on offers (client_id, banker_id);

-- THE RULE: at most one active (non-rejected) offer per bank per client
create unique index if not exists offers_one_active_per_bank_client
  on offers (client_id, bank_id) where status = 'offered';

-- 4) client_shares — advisor grants a banker access to a client
create table if not exists client_shares (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  banker_id  uuid not null references profiles(id) on delete cascade,
  shared_by  uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (client_id, banker_id)
);
alter table client_shares enable row level security;

-- 5) notifications — advisor alerts when a banker offers / rejects
create table if not exists notifications (
  id           bigint generated always as identity primary key,
  recipient_id uuid not null references profiles(id) on delete cascade,
  client_id    uuid references clients(id) on delete cascade,
  actor_id     uuid references profiles(id),
  type         text not null,                 -- 'offer' | 'rejection'
  message      text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table notifications enable row level security;

-- ===================== RLS =====================

-- client_shares: advisor manages shares for own clients; banker reads own
drop policy if exists shares_advisor on client_shares;
create policy shares_advisor on client_shares for all
  using (exists (select 1 from clients c where c.id = client_shares.client_id and c.broker_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = client_shares.client_id and c.broker_id = auth.uid()));
drop policy if exists shares_banker_read on client_shares;
create policy shares_banker_read on client_shares for select using (banker_id = auth.uid());
drop policy if exists shares_admin on client_shares;
create policy shares_admin on client_shares for select using (my_role() = 'admin');

-- clients: a banker can read clients shared with them
drop policy if exists clients_shared_banker on clients;
create policy clients_shared_banker on clients for select
  using (exists (select 1 from client_shares s where s.client_id = clients.id and s.banker_id = auth.uid()));

-- offers: advisor of the client, any engaged/shared banker (auction), admin
drop policy if exists offers_read on offers;
create policy offers_read on offers for select
  using (
    my_role() = 'admin'
    or exists (select 1 from clients c where c.id = offers.client_id and c.broker_id = auth.uid())
    or exists (select 1 from client_shares s where s.client_id = offers.client_id and s.banker_id = auth.uid())
  );
-- inserts/updates to offers are performed server-side via the service role
-- (the unique indexes above enforce the same-bank rule regardless of caller).
drop policy if exists offers_insert on offers;

-- notifications: recipient reads & marks own as read
drop policy if exists notif_read on notifications;
create policy notif_read on notifications for select using (recipient_id = auth.uid());
drop policy if exists notif_update on notifications;
create policy notif_update on notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());