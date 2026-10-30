CREATE TABLE IF NOT EXISTS launchpath_records (
  namespace text NOT NULL CHECK (namespace IN ('guide', 'setup')),
  id text NOT NULL,
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  PRIMARY KEY (namespace, id)
);
CREATE INDEX IF NOT EXISTS launchpath_records_created_at ON launchpath_records (namespace, created_at DESC);
