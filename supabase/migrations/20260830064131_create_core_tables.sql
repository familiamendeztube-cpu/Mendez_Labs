/*
# Create Mendez Labs core data tables

## Overview
This migration creates the persistent data tables for the Mendez Labs sports
research terminal. The app currently stores all state in browser localStorage;
this migration moves that state to Supabase so it survives across devices and
browser clears.

The app is single-tenant (access-code gated, no user accounts/sign-in), so all
policies use `TO anon, authenticated` — the anon-key frontend can read and write
its own data. There is no user_id column or ownership check because there are no
user accounts; the data is intentionally shared within this single-tenant app.

## New Tables

### 1. pick_five_sets
Stores the user's daily Pick Five — the five researched picks they choose to
paper-track each day.
- `id` (text, primary key) — the set ID (e.g., date-based)
- `date` (text, not null) — the date this set applies to
- `timezone` (text, not null) — timezone the set was created in
- `locked` (boolean, default false) — whether the set is locked
- `locked_at` (timestamptz, nullable) — when it was locked
- `created_at` (timestamptz, default now())

### 2. pick_five_picks
Individual picks within a Pick Five set. Each row is one of the five slots.
- `id` (uuid, primary key)
- `set_id` (text, not null, FK → pick_five_sets.id ON DELETE CASCADE)
- `slot` (integer, not null) — 1-5
- `opportunity_id` (text, not null)
- `matchup` (text, not null)
- `league` (text, not null)
- `market` (text, not null)
- `side` (text, not null)
- `line` (text, not null)
- `odds` (double precision, not null)
- `source` (text, not null)
- `source_timestamp` (text, not null)
- `model_probability` (double precision, not null)
- `implied_probability` (double precision, not null)
- `edge` (double precision, not null)
- `confidence_score` (double precision, not null)
- `suggested_stake` (double precision, not null)
- `reasoning` (text, not null)
- `start_time` (text, not null)
- `frozen_at` (text, not null)
- `audit_note` (text, nullable)
- `created_at` (timestamptz, default now())

### 3. bet_records
Paper-tracked bets placed through the bet slip.
- `id` (text, primary key)
- `type` (text, not null) — 'straight' or 'parlay'
- `legs` (jsonb, not null) — array of BetLeg objects
- `stake` (double precision, not null)
- `odds` (double precision, not null)
- `potential_payout` (double precision, not null)
- `potential_profit` (double precision, not null)
- `result` (text, not null) — 'pending', 'won', 'lost', 'voided', 'rejected'
- `profit_loss` (double precision, not null)
- `confidence` (double precision, not null)
- `edge` (double precision, not null)
- `model_version` (text, not null)
- `reasoning` (text, not null)
- `timestamp` (text, not null)
- `risk_class` (text, not null)
- `created_at` (timestamptz, default now())

### 4. app_state
A single-row table storing app-wide state: balance, risk settings, display
settings, and watchlist. Uses a fixed ID so there's always exactly one row.
- `id` (integer, primary key, default 1, CHECK (id = 1))
- `balance` (double precision, not null, default 1000)
- `risk_settings` (jsonb, not null)
- `settings` (jsonb, not null)
- `watchlist` (jsonb, not null, default '[]')
- `authenticated` (boolean, not null, default false)
- `updated_at` (timestamptz, default now())

### 5. system_logs
System log entries for the terminal activity feed.
- `id` (text, primary key)
- `timestamp` (text, not null)
- `category` (text, not null) — 'info', 'signal', 'warning', 'risk', 'error'
- `source` (text, not null) — 'M1-CORE', 'SPORTS', 'MARKET', 'RISK', 'EXEC', 'SYSTEM'
- `message` (text, not null)
- `meta` (jsonb, nullable)
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no user accounts — the data is
  intentionally shared and the anon-key frontend needs full CRUD access.
- The existing `api_keys` table remains locked down (deny-all for anon/auth).

## Notes
1. The `app_state` table uses a CHECK constraint to enforce a single row (id = 1).
   The app upserts into this row.
2. `pick_five_picks` has a foreign key to `pick_five_sets` with CASCADE delete, so
   deleting a set automatically removes its picks.
3. JSONB columns store complex nested objects (bet legs, risk settings, settings,
   log meta) without needing additional tables.
4. Indexes added on frequently queried columns (set_id, bet timestamp, log timestamp).
*/

-- ── pick_five_sets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pick_five_sets (
  id text PRIMARY KEY,
  date text NOT NULL,
  timezone text NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pick_five_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pick_five_sets" ON pick_five_sets;
CREATE POLICY "anon_select_pick_five_sets" ON pick_five_sets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pick_five_sets" ON pick_five_sets;
CREATE POLICY "anon_insert_pick_five_sets" ON pick_five_sets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pick_five_sets" ON pick_five_sets;
CREATE POLICY "anon_update_pick_five_sets" ON pick_five_sets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pick_five_sets" ON pick_five_sets;
CREATE POLICY "anon_delete_pick_five_sets" ON pick_five_sets FOR DELETE
  TO anon, authenticated USING (true);

-- ── pick_five_picks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pick_five_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id text NOT NULL REFERENCES pick_five_sets(id) ON DELETE CASCADE,
  slot integer NOT NULL,
  opportunity_id text NOT NULL,
  matchup text NOT NULL,
  league text NOT NULL,
  market text NOT NULL,
  side text NOT NULL,
  line text NOT NULL,
  odds double precision NOT NULL,
  source text NOT NULL,
  source_timestamp text NOT NULL,
  model_probability double precision NOT NULL,
  implied_probability double precision NOT NULL,
  edge double precision NOT NULL,
  confidence_score double precision NOT NULL,
  suggested_stake double precision NOT NULL,
  reasoning text NOT NULL,
  start_time text NOT NULL,
  frozen_at text NOT NULL,
  audit_note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pick_five_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pick_five_picks" ON pick_five_picks;
CREATE POLICY "anon_select_pick_five_picks" ON pick_five_picks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pick_five_picks" ON pick_five_picks;
CREATE POLICY "anon_insert_pick_five_picks" ON pick_five_picks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pick_five_picks" ON pick_five_picks;
CREATE POLICY "anon_update_pick_five_picks" ON pick_five_picks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pick_five_picks" ON pick_five_picks;
CREATE POLICY "anon_delete_pick_five_picks" ON pick_five_picks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pick_five_picks_set_id ON pick_five_picks(set_id);

-- ── bet_records ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bet_records (
  id text PRIMARY KEY,
  type text NOT NULL,
  legs jsonb NOT NULL,
  stake double precision NOT NULL,
  odds double precision NOT NULL,
  potential_payout double precision NOT NULL,
  potential_profit double precision NOT NULL,
  result text NOT NULL,
  profit_loss double precision NOT NULL,
  confidence double precision NOT NULL,
  edge double precision NOT NULL,
  model_version text NOT NULL,
  reasoning text NOT NULL,
  timestamp text NOT NULL,
  risk_class text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bet_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bet_records" ON bet_records;
CREATE POLICY "anon_select_bet_records" ON bet_records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bet_records" ON bet_records;
CREATE POLICY "anon_insert_bet_records" ON bet_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bet_records" ON bet_records;
CREATE POLICY "anon_update_bet_records" ON bet_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bet_records" ON bet_records;
CREATE POLICY "anon_delete_bet_records" ON bet_records FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_bet_records_timestamp ON bet_records(timestamp);

-- ── app_state (single-row) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  balance double precision NOT NULL DEFAULT 1000,
  risk_settings jsonb NOT NULL,
  settings jsonb NOT NULL,
  watchlist jsonb NOT NULL DEFAULT '[]',
  authenticated boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_state" ON app_state;
CREATE POLICY "anon_select_app_state" ON app_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_state" ON app_state;
CREATE POLICY "anon_insert_app_state" ON app_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_state" ON app_state;
CREATE POLICY "anon_update_app_state" ON app_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_state" ON app_state;
CREATE POLICY "anon_delete_app_state" ON app_state FOR DELETE
  TO anon, authenticated USING (true);

-- ── system_logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id text PRIMARY KEY,
  timestamp text NOT NULL,
  category text NOT NULL,
  source text NOT NULL,
  message text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_system_logs" ON system_logs;
CREATE POLICY "anon_select_system_logs" ON system_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_system_logs" ON system_logs;
CREATE POLICY "anon_insert_system_logs" ON system_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_system_logs" ON system_logs;
CREATE POLICY "anon_update_system_logs" ON system_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_system_logs" ON system_logs;
CREATE POLICY "anon_delete_system_logs" ON system_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
