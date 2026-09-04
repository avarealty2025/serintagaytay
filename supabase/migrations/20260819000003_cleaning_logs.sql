CREATE TABLE IF NOT EXISTS cleaning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id),
  items jsonb NOT NULL DEFAULT '[]',
  cleaned_by text NOT NULL,
  notes text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cleaning_logs_unit_idx ON cleaning_logs(unit_id, signed_at DESC);
