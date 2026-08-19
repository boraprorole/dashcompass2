CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'felipegouveia@outlook.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin_global')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Todo novo usuário recebe acesso à aba Conexões por padrão.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'conexoes')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC;