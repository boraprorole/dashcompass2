DROP POLICY IF EXISTS "Admins manage ga_connections" ON public.ga_connections;

CREATE POLICY "Admins can manage GA connections"
ON public.ga_connections
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin_global'::app_role)
  OR EXISTS (
    SELECT 1 FROM reports r
    WHERE r.id = ga_connections.report_id
      AND (
        r.created_by = auth.uid()
        OR r.agency_id IN (
          SELECT ur.agency_id FROM user_roles ur WHERE ur.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin_global'::app_role)
  OR EXISTS (
    SELECT 1 FROM reports r
    WHERE r.id = ga_connections.report_id
      AND (
        r.created_by = auth.uid()
        OR r.agency_id IN (
          SELECT ur.agency_id FROM user_roles ur WHERE ur.user_id = auth.uid()
        )
      )
  )
);