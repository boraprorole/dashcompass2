-- 1. Create agencies table if not exists
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    primary_color TEXT DEFAULT '#3DFC03',
    windsor_api_key TEXT,
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    news_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add agency_id to user_roles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_roles' AND column_name='agency_id') THEN
        ALTER TABLE public.user_roles ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create clients/companies table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add client_id and agency_id to reports if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='client_id') THEN
        ALTER TABLE public.reports ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='agency_id') THEN
        ALTER TABLE public.reports ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Create client_users (to associate users with specific clients)
CREATE TABLE IF NOT EXISTS public.client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(client_id, user_id)
);

-- 6. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies TO authenticated;
GRANT ALL ON public.agencies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_users TO authenticated;
GRANT ALL ON public.client_users TO service_role;

-- 7. Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- 8. Policies for Clients
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins global can do everything on clients" ON public.clients;
    CREATE POLICY "Admins global can do everything on clients" ON public.clients
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_global'));

    DROP POLICY IF EXISTS "Agency admins can manage their own clients" ON public.clients;
    CREATE POLICY "Agency admins can manage their own clients" ON public.clients
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin_agencia' 
            AND agency_id = clients.agency_id
        )
    );

    DROP POLICY IF EXISTS "Team members can see all clients of their agency" ON public.clients;
    CREATE POLICY "Team members can see all clients of their agency" ON public.clients
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'equipe' 
            AND agency_id = clients.agency_id
        )
    );

    DROP POLICY IF EXISTS "Users can only see clients they are assigned to" ON public.clients;
    CREATE POLICY "Users can only see clients they are assigned to" ON public.clients
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.client_users 
            WHERE user_id = auth.uid() 
            AND client_id = clients.id
        )
    );
END $$;
