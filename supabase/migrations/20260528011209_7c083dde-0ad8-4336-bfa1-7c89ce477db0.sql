
ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS osm_subscriber_id integer,
  ADD COLUMN IF NOT EXISTS osm_sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS osm_sync_error text,
  ADD COLUMN IF NOT EXISTS osm_synced_at timestamptz;
