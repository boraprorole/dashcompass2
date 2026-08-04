ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS subscription_provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS latest_invoice text,
  ADD COLUMN IF NOT EXISTS plan_label text,
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'admin',
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view subscription events" ON public.subscription_events;
CREATE POLICY "Admins can view subscription events"
  ON public.subscription_events FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_global')
    OR public.has_role(auth.uid(), 'admin')
    OR auth.uid() = user_id
  );

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON public.subscription_events(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.subscription_access(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency uuid;
  v_owner uuid;
  v_is_owner boolean := false;
  v_sub public.subscriptions%ROWTYPE;
  v_valid boolean := false;
  v_effective_end timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_user');
  END IF;

  IF public.has_role(_user_id, 'admin_global') THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'admin_global');
  END IF;

  SELECT agency_id INTO v_agency
  FROM public.user_roles
  WHERE user_id = _user_id AND agency_id IS NOT NULL
  LIMIT 1;

  IF public.has_role(_user_id, 'admin_agencia') THEN
    v_owner := _user_id;
    v_is_owner := true;
  ELSIF v_agency IS NOT NULL THEN
    SELECT user_id INTO v_owner
    FROM public.user_roles
    WHERE agency_id = v_agency AND role = 'admin_agencia'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    -- Usuário comum sem agência definida: não exige assinatura.
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_owner', 'isOwner', false);
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = v_owner
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_subscription', 'isOwner', v_is_owner, 'status', 'none');
  END IF;

  v_effective_end := GREATEST(
    COALESCE(v_sub.subscription_ends_at, v_sub.current_period_end, 'epoch'::timestamptz),
    COALESCE(v_sub.trial_ends_at, 'epoch'::timestamptz),
    COALESCE(v_sub.grace_period_ends_at, 'epoch'::timestamptz)
  );

  IF v_sub.status IN ('active', 'trialing') THEN
    v_valid := (v_effective_end = 'epoch'::timestamptz) OR (v_effective_end > now());
  ELSIF v_sub.status IN ('past_due', 'canceled') THEN
    v_valid := v_effective_end > now();
  ELSE
    v_valid := false;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_valid,
    'reason', CASE WHEN v_valid THEN 'ok' ELSE 'invalid_subscription' END,
    'isOwner', v_is_owner,
    'status', v_sub.status,
    'endsAt', v_effective_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscription_access(uuid) TO authenticated;