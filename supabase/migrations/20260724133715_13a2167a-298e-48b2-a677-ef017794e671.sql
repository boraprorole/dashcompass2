-- Garantir que o usuário felipegouveia@outlook.com seja admin_global
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Buscar o ID do usuário
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'felipegouveia@outlook.com';

    -- Se o usuário existir, inserir o papel
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin_global')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;