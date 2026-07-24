CREATE TABLE public.schedule_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  color TEXT DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_events TO authenticated;
GRANT ALL ON public.schedule_events TO service_role;

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all schedule events" ON public.schedule_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage schedule events" ON public.schedule_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE TRIGGER update_schedule_events_updated_at
BEFORE UPDATE ON public.schedule_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();