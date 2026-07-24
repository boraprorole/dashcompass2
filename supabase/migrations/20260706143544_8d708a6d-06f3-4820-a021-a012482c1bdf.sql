ALTER TABLE public.rdstation_connections
  ADD COLUMN IF NOT EXISTS show_conversions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_emails boolean NOT NULL DEFAULT true;