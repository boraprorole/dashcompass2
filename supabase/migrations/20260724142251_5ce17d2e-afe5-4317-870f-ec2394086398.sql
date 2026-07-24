INSERT INTO public.user_roles (user_id, role)
VALUES ('19553f65-fe9d-4387-88de-5a2cb4ad2bdb', 'admin_agencia')
ON CONFLICT (user_id, role) DO NOTHING;