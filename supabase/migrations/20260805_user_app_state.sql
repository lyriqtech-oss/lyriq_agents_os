CREATE TABLE IF NOT EXISTS user_app_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  state_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, state_key)
);

ALTER TABLE user_app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own app state" ON user_app_state;
CREATE POLICY "Users manage their own app state"
  ON user_app_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

