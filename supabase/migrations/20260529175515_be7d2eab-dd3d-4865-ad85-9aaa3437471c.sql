-- Atualiza o trigger para dar admin automaticamente para felipe@marsala.ag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  -- Sempre insere role 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');

  -- Se o email for felipe@marsala.ag, também insere role 'admin'
  IF new.email = 'felipe@marsala.ag' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  END IF;

  RETURN new;
END;
$$;