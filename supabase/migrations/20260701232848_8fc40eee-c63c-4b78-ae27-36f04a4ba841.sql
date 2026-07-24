CREATE TABLE public.windsor_cache (
  cache_key TEXT PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.windsor_cache TO service_role;
ALTER TABLE public.windsor_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_windsor_cache_report ON public.windsor_cache(report_id);
CREATE INDEX idx_windsor_cache_expires ON public.windsor_cache(expires_at);