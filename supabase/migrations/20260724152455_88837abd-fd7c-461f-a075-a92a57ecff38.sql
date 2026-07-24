-- Primeiro, removemos qualquer papel de admin_global que felipegouveia+agencia@outlook.com possa ter
DELETE FROM public.user_roles 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'felipegouveia+agencia@outlook.com'
) AND role = 'admin_global';

-- Garantimos que ele tenha o papel admin_agencia
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin_agencia'::app_role
FROM auth.users 
WHERE email = 'felipegouveia+agencia@outlook.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificamos se felipegouveia@outlook.com é admin_global
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin_global'::app_role
FROM auth.users 
WHERE email = 'felipegouveia@outlook.com'
ON CONFLICT (user_id, role) DO NOTHING;
