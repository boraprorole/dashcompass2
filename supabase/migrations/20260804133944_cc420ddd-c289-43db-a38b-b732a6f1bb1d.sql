CREATE TABLE public.mcp_access_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  label text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_mcp_access_tokens_user ON public.mcp_access_tokens(user_id);
CREATE INDEX idx_mcp_access_tokens_agency ON public.mcp_access_tokens(agency_id);

GRANT ALL ON public.mcp_access_tokens TO service_role;
ALTER TABLE public.mcp_access_tokens ENABLE ROW LEVEL SECURITY;