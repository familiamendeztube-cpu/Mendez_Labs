/*
# Create AI Research Cache Table

1. New Tables
  - `ai_research` — caches AI-generated research for pick analysis
    - `id` (uuid, primary key)
    - `pick_id` (text, not null) — ID of the pick being researched
    - `user_id` (uuid, not null) — user who requested the research
    - `matchup` (text) — matchup description
    - `league` (text) — league name
    - `market` (text) — market type
    - `side` (text) — side being analyzed
    - `summary` (text) — AI-generated summary
    - `key_factors` (jsonb) — array of key factors
    - `risk_flags` (jsonb) — array of risk flags
    - `verdict` (text) — supports/neutral/against
    - `confidence` (float) — confidence score 0-1
    - `sources` (jsonb) — array of source descriptions
    - `created_at` (timestamptz) — when the research was generated

2. Security
  - RLS enabled, owner-scoped CRUD for authenticated users.

3. Indexes
  - Index on (pick_id, created_at) for fast cache lookups.
*/

CREATE TABLE IF NOT EXISTS ai_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  matchup text,
  league text,
  market text,
  side text,
  summary text NOT NULL DEFAULT 'Analysis unavailable',
  key_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  verdict text NOT NULL DEFAULT 'neutral',
  confidence float NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_research ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_research_pick_created
  ON ai_research (pick_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_research" ON ai_research;
CREATE POLICY "select_own_research" ON ai_research FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_research" ON ai_research;
CREATE POLICY "insert_own_research" ON ai_research FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_research" ON ai_research;
CREATE POLICY "update_own_research" ON ai_research FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_research" ON ai_research;
CREATE POLICY "delete_own_research" ON ai_research FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
