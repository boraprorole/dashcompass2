CREATE TABLE IF NOT EXISTS public.pricing_settings (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  value_brl numeric NOT NULL DEFAULT 0,
  value_usd numeric NOT NULL DEFAULT 0,
  features_pt text[] NOT NULL DEFAULT '{}',
  features_en text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_settings TO authenticated;
GRANT ALL ON public.pricing_settings TO service_role;

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.pricing_settings FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin_global'));

CREATE POLICY "Global admins can insert plans"
  ON public.pricing_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_global'));

CREATE POLICY "Global admins can update plans"
  ON public.pricing_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_global'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_global'));

CREATE POLICY "Global admins can delete plans"
  ON public.pricing_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_global'));

CREATE TRIGGER pricing_settings_updated_at
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pricing_settings (key, label, description, value_brl, value_usd, features_pt, features_en, sort_order)
VALUES
  ('starter', 'Starter', 'Para quem está começando', 99, 29,
   ARRAY['1 Empresa','5 Conexões','Dashboards IA'], ARRAY['1 Company','5 Connections','AI Dashboards'], 1),
  ('agency', 'Agency', 'Para agências em crescimento', 159, 99,
   ARRAY['10 Empresas','100 Conexões','White Label'], ARRAY['10 Companies','100 Connections','White Label'], 2),
  ('pro', 'Agency Pro', 'Operação completa', 499, 249,
   ARRAY['20 Empresas','200 Conexões','White Label Completo'], ARRAY['20 Companies','200 Connections','Full White Label'], 3)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;