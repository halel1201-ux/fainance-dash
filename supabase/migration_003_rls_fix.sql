-- ===========================================================================
-- Migration 003 — fix RLS infinite recursion between clients ⇄ client_shares.
-- Use SECURITY DEFINER helpers so cross-table checks don't re-trigger RLS.
-- Run AFTER migration_002. Idempotent.
-- ===========================================================================

create or replace function owns_client(cid uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from clients where id = cid and broker_id = auth.uid()) $$;

create or replace function is_shared_with_me(cid uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from client_shares where client_id = cid and banker_id = auth.uid()) $$;

-- clients: banker sees shared clients (no recursion)
drop policy if exists clients_shared_banker on clients;
create policy clients_shared_banker on clients for select using (is_shared_with_me(id));

-- client_shares: advisor manages shares for own clients (no recursion)
drop policy if exists shares_advisor on client_shares;
create policy shares_advisor on client_shares for all
  using (owns_client(client_id)) with check (owns_client(client_id));

-- offers: advisor of client OR engaged banker OR admin (no recursion)
drop policy if exists offers_read on offers;
create policy offers_read on offers for select
  using (my_role() = 'admin' or owns_client(client_id) or is_shared_with_me(client_id));