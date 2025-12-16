-- Feature 050: GearShack AI Assistant
-- Database schema for AI conversations, messages, rate limiting, and cached responses
-- NOTE: Prefixed with 'ai_' to avoid conflicts with existing messaging tables

-- =====================================================
-- 1. TABLES
-- =====================================================

-- Create ai_conversations table
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 0,
  context_snapshot jsonb
);

CREATE INDEX ai_conversations_user_id_updated_at_idx
  ON ai_conversations(user_id, updated_at DESC);

-- Create ai_messages table
CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  inline_cards jsonb,
  actions jsonb,
  context jsonb,
  tokens_used integer
);

CREATE INDEX ai_messages_conversation_id_created_at_idx
  ON ai_messages(conversation_id, created_at DESC);

-- Create ai_rate_limits table
CREATE TABLE ai_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL DEFAULT '/api/chat',
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);

CREATE INDEX ai_rate_limits_user_id_endpoint_idx
  ON ai_rate_limits(user_id, endpoint);

-- Create ai_cached_responses table
CREATE TABLE ai_cached_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_pattern text NOT NULL UNIQUE,
  response_en text NOT NULL,
  response_de text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_cached_responses_query_pattern_idx
  ON ai_cached_responses USING gin(query_pattern gin_trgm_ops);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cached_responses ENABLE ROW LEVEL SECURITY;

-- AI Conversations policies
CREATE POLICY "users_view_own_ai_conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_ai_conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_ai_conversations"
  ON ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_ai_conversations"
  ON ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- AI Messages policies
CREATE POLICY "users_view_own_ai_messages"
  ON ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_ai_messages"
  ON ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- AI Rate limits policies
CREATE POLICY "users_view_own_ai_rate_limits"
  ON ai_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- AI Cached responses policies
CREATE POLICY "authenticated_read_ai_cached_responses"
  ON ai_cached_responses FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 3. FUNCTIONS
-- =====================================================

-- AI Rate limit check function (atomic)
CREATE OR REPLACE FUNCTION check_ai_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_hours integer
) RETURNS jsonb AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
  v_exceeded boolean;
  v_resets_at timestamptz;
BEGIN
  -- Get or create rate limit record
  INSERT INTO ai_rate_limits (user_id, endpoint, count, window_start)
  VALUES (p_user_id, p_endpoint, 0, now())
  ON CONFLICT (user_id, endpoint) DO NOTHING;

  -- Get current state
  SELECT count, window_start INTO v_count, v_window_start
  FROM ai_rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  -- Reset window if expired
  IF v_window_start + (p_window_hours || ' hours')::interval < now() THEN
    UPDATE ai_rate_limits
    SET count = 0, window_start = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    v_count := 0;
    v_window_start := now();
  END IF;

  v_exceeded := v_count >= p_limit;
  v_resets_at := v_window_start + (p_window_hours || ' hours')::interval;

  RETURN jsonb_build_object(
    'exceeded', v_exceeded,
    'count', v_count,
    'limit', p_limit,
    'resets_at', v_resets_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CRON JOBS (90-day retention)
-- =====================================================

-- NOTE: Automatic cleanup job requires pg_cron extension
-- This can be added later via Supabase Dashboard > Database > Extensions > pg_cron
-- Then run:
-- SELECT cron.schedule(
--   'purge-old-ai-conversations',
--   '0 2 * * *', -- Daily at 2am UTC
--   $$
--   DELETE FROM ai_conversations
--   WHERE updated_at < now() - interval '90 days';
--   $$
-- );

-- =====================================================
-- 5. SEED DATA (Cached Responses)
-- =====================================================

INSERT INTO ai_cached_responses (query_pattern, response_en, response_de) VALUES
('what is base weight',
 'Base weight is the total weight of your gear excluding consumables (food, water, fuel). It''s a key metric for evaluating how "ultralight" your loadout is.',
 'Basisgewicht ist das Gesamtgewicht Ihrer Ausrüstung ohne Verbrauchsmaterialien (Essen, Wasser, Brennstoff). Es ist eine wichtige Kennzahl zur Bewertung, wie "ultraleicht" Ihre Ausrüstung ist.'),

('how do i reduce pack weight',
 'Top strategies: 1) Replace your heaviest items (tent, backpack, sleeping bag) with lighter alternatives. 2) Eliminate duplicate items. 3) Choose multi-use gear. 4) Leave behind "just in case" items you rarely use.',
 'Top-Strategien: 1) Ersetzen Sie Ihre schwersten Gegenstände (Zelt, Rucksack, Schlafsack) durch leichtere Alternativen. 2) Eliminieren Sie doppelte Gegenstände. 3) Wählen Sie Mehrzweckausrüstung. 4) Lassen Sie "nur für den Fall"-Gegenstände weg, die Sie selten verwenden.'),

('what is r-value',
 'R-value measures a sleeping pad''s insulation effectiveness. Higher R-values provide more warmth. For example: R-1 to R-2 (summer), R-2 to R-4 (3-season), R-4+ (winter). Your sleeping pad''s R-value should match the lowest temperature you expect.',
 'R-Wert misst die Isolierwirkung einer Isomatte. Höhere R-Werte bieten mehr Wärme. Zum Beispiel: R-1 bis R-2 (Sommer), R-2 bis R-4 (3-Jahreszeiten), R-4+ (Winter). Der R-Wert Ihrer Isomatte sollte zur niedrigsten erwarteten Temperatur passen.'),

('how to choose a sleeping bag',
 'Key factors: 1) Temperature rating (match to coldest expected conditions). 2) Insulation type (down for weight/packability, synthetic for wet conditions). 3) Shape (mummy for warmth, rectangular for comfort). 4) Weight and packed size for your trip length.',
 'Wichtige Faktoren: 1) Temperaturbereich (passend zu den kältesten erwarteten Bedingungen). 2) Isolationstyp (Daune für Gewicht/Packmaß, Synthetik für nasse Bedingungen). 3) Form (Mumie für Wärme, rechteckig für Komfort). 4) Gewicht und Packmaß für Ihre Tourlänge.'),

('what is lighterpack',
 'Lighterpack is a popular free website for creating and sharing gear lists. It automatically calculates total weight, base weight, and worn weight. Many backpackers use it to plan trips and compare loadouts with the community.',
 'Lighterpack ist eine beliebte kostenlose Website zum Erstellen und Teilen von Ausrüstungslisten. Es berechnet automatisch Gesamtgewicht, Basisgewicht und getragenes Gewicht. Viele Rucksacktouristen nutzen es zur Tourenplanung und zum Vergleich von Ausrüstungen mit der Community.'),

('ultralight backpacking tips',
 'Essential ultralight tips: 1) Cut your Big Three weight (tent, backpack, sleeping bag/quilt). 2) Use a digital scale to weigh everything. 3) Question every item: "Will I actually use this?" 4) Choose multi-use items. 5) Learn skills to replace gear (e.g., navigation instead of heavy guidebooks).',
 'Wesentliche Ultraleicht-Tipps: 1) Reduzieren Sie Ihr Big Three Gewicht (Zelt, Rucksack, Schlafsack/Quilt). 2) Verwenden Sie eine Digitalwaage zum Wiegen. 3. Hinterfragen Sie jeden Gegenstand: "Werde ich das wirklich benutzen?" 4) Wählen Sie Mehrzweck-Gegenstände. 5) Lernen Sie Fähigkeiten statt Ausrüstung mitzunehmen (z.B. Navigation statt schwerer Reiseführer).');
