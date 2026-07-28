INSERT INTO public.app_features (key, label, enabled) 
VALUES ('stripe', 'Vamos integrar a stripe para os pagamentos recorrentes das assinaturas em BRL e USD', true) 
ON CONFLICT (key) DO UPDATE SET label = 'Vamos integrar a stripe para os pagamentos recorrentes das assinaturas em BRL e USD';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_features TO authenticated;
GRANT ALL ON public.app_features TO service_role;
GRANT SELECT ON public.app_features TO anon;
