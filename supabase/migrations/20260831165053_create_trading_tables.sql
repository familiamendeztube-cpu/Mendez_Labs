/*
# Create Trading Infrastructure Tables

1. New Tables
   - `user_profiles`
     - `id` (uuid, PK, references auth.users)
     - `email` (text)
     - `display_name` (text, nullable)
     - `alpaca_env` (text, default 'paper') — paper or live
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
   - `trading_accounts`
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → auth.users)
     - `alpaca_env` (text) — paper or live
     - `last_equity` (numeric, nullable) — last known equity from Alpaca
     - `last_cash` (numeric, nullable)
     - `last_buying_power` (numeric, nullable)
     - `last_synced_at` (timestamptz, nullable)
     - `created_at` (timestamptz)
   - `trade_orders`
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → auth.users)
     - `alpaca_order_id` (text, nullable) — Alpaca's order ID
     - `symbol` (text)
     - `side` (text) — buy or sell
     - `qty` (numeric)
     - `order_type` (text) — market, limit, stop, stop_limit
     - `time_in_force` (text) — day, gtc, ioc, fok
     - `limit_price` (numeric, nullable)
     - `stop_price` (numeric, nullable)
     - `status` (text) — new, accepted, filled, canceled, rejected
     - `filled_avg_price` (numeric, nullable)
     - `filled_qty` (numeric, nullable)
     - `submitted_at` (timestamptz)
     - `filled_at` (timestamptz, nullable)
     - `signal_source` (text, nullable) — what triggered this trade
     - `risk_check_passed` (boolean, default true)
     - `notes` (text, nullable)
   - `trade_audit_log`
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → auth.users)
     - `action` (text) — order_submitted, order_filled, balance_sync, risk_block, etc.
     - `details` (jsonb) — full payload for audit
     - `created_at` (timestamptz)

2. Security
   - RLS enabled on all tables
   - Owner-scoped policies: each user can only access their own rows
   - user_id defaults to auth.uid() on all tables
*/

-- ═══ user_profiles ═══
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  alpaca_env text NOT NULL DEFAULT 'paper' CHECK (alpaca_env IN ('paper', 'live')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON user_profiles;
CREATE POLICY "delete_own_profile" ON user_profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ═══ trading_accounts ═══
CREATE TABLE IF NOT EXISTS trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_env text NOT NULL DEFAULT 'paper' CHECK (alpaca_env IN ('paper', 'live')),
  last_equity numeric,
  last_cash numeric,
  last_buying_power numeric,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, alpaca_env)
);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_trading_account" ON trading_accounts;
CREATE POLICY "select_own_trading_account" ON trading_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_trading_account" ON trading_accounts;
CREATE POLICY "insert_own_trading_account" ON trading_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_trading_account" ON trading_accounts;
CREATE POLICY "update_own_trading_account" ON trading_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_trading_account" ON trading_accounts;
CREATE POLICY "delete_own_trading_account" ON trading_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ═══ trade_orders ═══
CREATE TABLE IF NOT EXISTS trade_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_order_id text,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  qty numeric NOT NULL,
  order_type text NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  time_in_force text NOT NULL DEFAULT 'day' CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok')),
  limit_price numeric,
  stop_price numeric,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'pending_new', 'partially_filled', 'filled', 'done_for_day', 'canceled', 'expired', 'replaced', 'rejected')),
  filled_avg_price numeric,
  filled_qty numeric,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  filled_at timestamptz,
  signal_source text,
  risk_check_passed boolean NOT NULL DEFAULT true,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_trade_orders_user ON trade_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_orders_status ON trade_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_orders_symbol ON trade_orders(user_id, symbol);

ALTER TABLE trade_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON trade_orders;
CREATE POLICY "select_own_orders" ON trade_orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_orders" ON trade_orders;
CREATE POLICY "insert_own_orders" ON trade_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON trade_orders;
CREATE POLICY "update_own_orders" ON trade_orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_orders" ON trade_orders;
CREATE POLICY "delete_own_orders" ON trade_orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ═══ trade_audit_log ═══
CREATE TABLE IF NOT EXISTS trade_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_audit_user ON trade_audit_log(user_id, created_at DESC);

ALTER TABLE trade_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audit" ON trade_audit_log;
CREATE POLICY "select_own_audit" ON trade_audit_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_audit" ON trade_audit_log;
CREATE POLICY "insert_own_audit" ON trade_audit_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_audit" ON trade_audit_log;
CREATE POLICY "update_own_audit" ON trade_audit_log FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_audit" ON trade_audit_log;
CREATE POLICY "delete_own_audit" ON trade_audit_log FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
