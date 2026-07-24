
ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('approved','rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_by_name TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Company members can approve schedule events" ON public.schedule_events;
CREATE POLICY "Company members can approve schedule events"
ON public.schedule_events
FOR UPDATE
TO authenticated
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
