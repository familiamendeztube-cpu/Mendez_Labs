/*
# Model tables for independent probability engine

## Purpose
Stores server-side model predictions, calibration metrics, and training runs.
The browser never manufactures probabilities — all probabilities are computed
server-side by the analysis-engine edge function and persisted here.

## New Tables

### model_runs
Records each training run of the probability model.
- id (uuid, pk)
- model_version (text, not null) — e.g. 'elo-v1-experimental'
- league (text, not null) — 'NFL', 'NBA', 'MLB', 'NHL', 'Soccer'
- training_cutoff (timestamptz, not null) — walk-forward split point
- sample_size (integer, not null) — number of completed games used
- feature_names (text[], not null) — names of features used
- status (text, not null) — 'experimental', 'active', 'rolled_back'
- brier_score (double precision) — out-of-sample Brier score
- log_loss (double precision) — out-of-sample log loss
- calibration_buckets (jsonb) — calibration bucket data
- closing_line_comparison (double precision) — vs closing line
- activated_at (timestamptz) — when this version became active
- created_at (timestamptz, default now)

### model_predictions
Each prediction made BEFORE game start. Cannot be rewritten after the fact.
- id (uuid, pk)
- run_id (uuid, fk → model_runs.id)
- event_id (text, not null) — The Odds API event ID
- league (text, not null)
- home_team (text, not null)
- away_team (text, not null)
- start_time (timestamptz, not null)
- market (text, not null) — 'moneyline', 'spread', 'total'
- side (text, not null)
- p_model (double precision, not null) — independent model probability
- p_market (double precision, not null) — no-vig market consensus probability
- w_model (double precision, not null) — model weight used in blend
- p_final (double precision, not null) — blended probability
- fair_decimal (double precision, not null) — 1 / p_final
- offered_decimal (double precision, not null) — best available decimal odds
- offered_bookmaker (text, not null)
- ev_percent (double precision, not null) — expected value per $1
- bookmaker_count (integer, not null)
- qualified (boolean, not null) — passed all qualification gates
- exclusion_reason (text, nullable) — why excluded if not qualified
- feature_values (jsonb) — feature names and values used
- source_timestamp (timestamptz, not null) — when odds were fetched
- model_version (text, not null)
- created_at (timestamptz, default now)
- result (text, nullable) — 'won', 'lost', 'push', 'void' (filled after settlement)
- settled_at (timestamptz, nullable)

### model_calibration
Walk-forward calibration metrics per model version per league.
- id (uuid, pk)
- model_version (text, not null)
- league (text, not null)
- calibration_date (timestamptz, not null)
- sample_size (integer, not null)
- brier_score (double precision)
- log_loss (double precision)
- calibration_buckets (jsonb)
- closing_line_comparison (double precision)
- created_at (timestamptz, default now)

## Security
- All three tables: RLS enabled, anon SELECT only (sanitized model outputs).
- Only service role can INSERT/UPDATE (edge functions use service role key).
- No API keys or secrets stored in these tables.
*/

-- ── model_runs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version text NOT NULL,
  league text NOT NULL,
  training_cutoff timestamptz NOT NULL,
  sample_size integer NOT NULL,
  feature_names text[] NOT NULL,
  status text NOT NULL DEFAULT 'experimental',
  brier_score double precision,
  log_loss double precision,
  calibration_buckets jsonb,
  closing_line_comparison double precision,
  activated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE model_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_model_runs" ON model_runs;
CREATE POLICY "anon_read_model_runs" ON model_runs FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_model_runs_version ON model_runs(model_version);
CREATE INDEX IF NOT EXISTS idx_model_runs_league ON model_runs(league);
CREATE INDEX IF NOT EXISTS idx_model_runs_status ON model_runs(status);

-- ── model_predictions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES model_runs(id) ON DELETE SET NULL,
  event_id text NOT NULL,
  league text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  start_time timestamptz NOT NULL,
  market text NOT NULL,
  side text NOT NULL,
  p_model double precision NOT NULL,
  p_market double precision NOT NULL,
  w_model double precision NOT NULL,
  p_final double precision NOT NULL,
  fair_decimal double precision NOT NULL,
  offered_decimal double precision NOT NULL,
  offered_bookmaker text NOT NULL,
  ev_percent double precision NOT NULL,
  bookmaker_count integer NOT NULL,
  qualified boolean NOT NULL DEFAULT false,
  exclusion_reason text,
  feature_values jsonb,
  source_timestamp timestamptz NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz DEFAULT now(),
  result text,
  settled_at timestamptz
);

ALTER TABLE model_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_model_predictions" ON model_predictions;
CREATE POLICY "anon_read_model_predictions" ON model_predictions FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_model_predictions_event ON model_predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_model_predictions_qualified ON model_predictions(qualified);
CREATE INDEX IF NOT EXISTS idx_model_predictions_start ON model_predictions(start_time);
CREATE INDEX IF NOT EXISTS idx_model_predictions_version ON model_predictions(model_version);

-- ── model_calibration ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_calibration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version text NOT NULL,
  league text NOT NULL,
  calibration_date timestamptz NOT NULL,
  sample_size integer NOT NULL,
  brier_score double precision,
  log_loss double precision,
  calibration_buckets jsonb,
  closing_line_comparison double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE model_calibration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_model_calibration" ON model_calibration;
CREATE POLICY "anon_read_model_calibration" ON model_calibration FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_model_calibration_version ON model_calibration(model_version, league);
