-- First, clean up the insecure policy
DROP POLICY IF EXISTS "Public can read tiktok_connections" ON public.tiktok_connections;

-- Refine the SELECT policy to be strictly scoped
-- We allow Global Admins, and anyone who can access the report linked to the connection
-- We use a simpler join structure that doesn't rely on the non-existent 'agency_admins' table directly if we don't know the exact agency management schema yet,
-- but we know that reports have a relationship to companies.

CREATE POLICY "Users can view tiktok connections for their reports"
ON public.tiktok_connections
FOR SELECT
TO authenticated
USING (
  -- Global Admin access
  public.has_role(auth.uid(), 'admin_global') 
  OR 
  -- Report access: If the user can see the report, they can see the connection
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = tiktok_connections.report_id
  )
);

-- Note: The existing 'Admins can manage TikTok connections' policy already exists and 
-- likely handles the write/delete cases for authorized users.
