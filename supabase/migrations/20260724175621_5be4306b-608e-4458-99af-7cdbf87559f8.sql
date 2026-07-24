-- Create a default agency if none exists
INSERT INTO public.agencies (name) 
SELECT 'Agência Padrão'
WHERE NOT EXISTS (SELECT 1 FROM public.agencies);

-- Associate the agency admin with the first available agency if they don't have one
UPDATE public.user_roles 
SET agency_id = (SELECT id FROM public.agencies LIMIT 1)
WHERE role = 'admin_agencia' AND agency_id IS NULL;

-- Update RLS policies for companies
DROP POLICY IF EXISTS "Agency admins can insert companies for their agency" ON public.companies;
DROP POLICY IF EXISTS "Agency admins can manage their own companies" ON public.companies;
DROP POLICY IF EXISTS "Global admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view relevant companies" ON public.companies;

-- 1. Global Admins Policy
CREATE POLICY "Global admins manage all" ON public.companies
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin_global'))
WITH CHECK (public.has_role(auth.uid(), 'admin_global'));

-- 2. Agency Admins Policy (unified ALL)
CREATE POLICY "Agency admins manage their companies" ON public.companies
FOR ALL TO authenticated
USING (
  agency_id IN (
    SELECT ur.agency_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin_agencia'
  )
)
WITH CHECK (
  agency_id IN (
    SELECT ur.agency_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin_agencia'
  )
);

-- 3. Select policy for everyone else (members of the agency)
CREATE POLICY "View agency companies" ON public.companies
FOR SELECT TO authenticated
USING (
  agency_id IN (
    SELECT ur.agency_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
);
