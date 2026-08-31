/*
# Security Fix + Provider Cache Tables

## Security Changes
1. LOCK DOWN all private tables (pick_five_sets, pick_five_picks, bet_records,
   app_state, system_logs). Remove the `USING (true)` / `WITH CHECK (true)`
   policies that granted anon full read/write access. These tables hold
   personal picks, bankroll, and logs — anonymous visitors must NOT read or
   write them. Until proper Supabase auth is enabled, these tables are
   deny-by-default for anon/authenticated (no policies = no access).
2. The `api_keys` table remains deny-all (already correct).
3. The new `provider_cache` and `provider_sync_runs` tables are the ONLY
   tables with anon read access, because they contain sanitized public
   sports data with no user/private info or secrets.

## New Tables

### provider_cache
Stores normalized, non-secret JSON from sports data providers.
- `id` (uuid, primary key)
- `source` (text, not null) — 'the-odds-api' or 'api-sports'
- `sport_key` (text, not null) — e.g. 'americanfootball_nfl'
- `data` (jsonb, not null) — normalized response payload (no secrets)
- `fetched_at` (timestamptz, not null, default now())
- `expires_at` (timestamptz, not null) — when cache expires
- `status` (text, not null) — 'success', 'error', 'stale'
- `remaining_quota` (integer, nullable) — from response headers when available
- `error_message` (text, nullable) — sanitized error (no secrets)

### provider_sync_runs
Audit log for sync runs.
- `id` (uuid, primary key)
- `source` (text, not null)
- `started_at` (timestamptz, not null, default now())
- `completed_at` (timestamptz, nullable)
- `status` (text, not null) — 'running', 'success', 'error'
- `events_count` (integer, nullable)
- `bookmakers_count` (integer, nullable)
- `remaining_quota` (integer, nullable)
- `error_message` (text, nullable) — sanitized

## RLS Policies
- provider_cache: anon can SELECT (public sports data). Only service role
  can INSERT/UPDATE/DELETE (edge functions use service role key).
- provider_sync_runs: anon can SELECT (sync health info). Only service role
  can INSERT/UPDATE/DELETE.
- All private tables: DROP all existing anon policies → deny-by-default.

## Notes
1. The app will store Pick Five / bankroll / bets in localStorage only
   (client-side) until proper auth is enabled. The database tables remain
   for when auth is added.
2. provider_cache is the single source of truth for live sports data.
   The sports-feed edge function writes here; the frontend reads from here
   via anon SELECT.
*/

-- ── Lock down private tables: drop all anon policies ─────────────────────────

-- pick_five_sets
DROP POLICY IF EXISTS "anon_select_pick_five_sets" ON pick_five_sets;
DROP POLICY IF EXISTS "anon_insert_pick_five_sets" ON pick_five_sets;
DROP POLICY IF EXISTS "anon_update_pick_five_sets" ON pick_five_sets;
DROP POLICY IF EXISTS "anon_delete_pick_five_sets" ON pick_five_sets;

-- pick_five_picks
DROP POLICY IF EXISTS "anon_select_pick_five_picks" ON pick_five_picks;
DROP POLICY IF EXISTS "anon_insert_pick_five_picks" ON pick_five_picks;
DROP POLICY IF EXISTS "anon_update_pick_five_picks" ON pick_five_picks;
DROP POLICY IF EXISTS "anon_delete_pick_five_picks" ON pick_five_picks;

-- bet_records
DROP POLICY IF EXISTS "anon_select_bet_records" ON bet_records;
DROP POLICY IF EXISTS "anon_insert_bet_records" ON bet_records;
DROP POLICY IF EXISTS "anon_update_bet_records" ON bet_records;
DROP POLICY IF EXISTS "anon_delete_bet_records" ON bet_records;

-- app_state
DROP POLICY IF EXISTS "anon_select_app_state" ON app_state;
DROP POLICY IF EXISTS "anon_insert_app_state" ON app_state;
DROP POLICY IF EXISTS "anon_update_app_state" ON app_state;
DROP POLICY IF EXISTS "anon_delete_app_state" ON app_state;

-- system_logs
DROP POLICY IF EXISTS "anon_select_system_logs" ON system_logs;
DROP POLICY IF EXISTS "anon_insert_system_logs" ON system_logs;
DROP POLICY IF EXISTS "anon_update_system_logs" ON system_logs;
DROP POLICY IF EXISTS "anon_delete_system_logs" ON system_logs;

-- ── provider_cache ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  sport_key text NOT NULL,
  data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'success',
  remaining_quota integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_cache ENABLE ROW LEVEL SECURITY;

-- Anon can read cached sports data (public, no secrets)
DROP POLICY IF EXISTS "anon_read_provider_cache" ON provider_cache;
CREATE POLICY "anon_read_provider_cache" ON provider_cache FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_provider_cache_source_sport ON provider_cache(source, sport_key);
CREATE INDEX IF NOT EXISTS idx_provider_cache_expires ON provider_cache(expires_at);

-- ── provider_sync_runs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  events_count integer,
  bookmakers_count integer,
  remaining_quota integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_sync_runs ENABLE ROW LEVEL SECURITY;

-- Anon can read sync health info (no secrets)
DROP POLICY IF EXISTS "anon_read_provider_sync_runs" ON provider_sync_runs;
CREATE POLICY "anon_read_provider_sync_runs" ON provider_sync_runs FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_provider_sync_runs_started ON provider_sync_runs(started_at DESC);
