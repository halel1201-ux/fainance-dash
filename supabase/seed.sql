-- ===========================================================================
-- Seed data — run AFTER schema.sql, in the Supabase SQL Editor.
-- ===========================================================================

-- 1) Banks (and one non-bank lender)
insert into banks (name, is_nonbank) values
  ('בנק לאומי',   false),
  ('בנק הפועלים', false),
  ('בנק דיסקונט', false),
  ('מזרחי טפחות', false),
  ('מימון ישיר',  true)
on conflict (name) do nothing;

-- ===========================================================================
-- 2) First user (broker) — TWO steps:
--
--   (a) Dashboard → Authentication → Users → "Add user"
--       enter email + password, and tick "Auto Confirm User".
--       Copy the new user's UUID.
--
--   (b) Run the insert below with that UUID (uncomment and replace):
-- ===========================================================================

-- insert into profiles (id, full_name, role)
-- values ('PASTE-USER-UUID-HERE', 'דנה לוי', 'broker');

-- For a banker instead, attach a bank:
-- insert into profiles (id, full_name, role, bank_id)
-- values ('PASTE-UUID', 'יוסי כהן', 'banker', (select id from banks where name='בנק לאומי'));

-- Link a banker to the brokers they may see:
-- insert into broker_banker (banker_id, broker_id) values ('BANKER-UUID', 'BROKER-UUID');