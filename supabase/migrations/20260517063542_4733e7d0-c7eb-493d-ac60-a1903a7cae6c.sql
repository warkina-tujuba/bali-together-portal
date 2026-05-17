CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_trip_created ON public.messages (trip_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (trip_id = public.current_user_trip_id());

CREATE POLICY "Trip members send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND trip_id = public.current_user_trip_id());

CREATE POLICY "Users delete own messages" ON public.messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage all messages" ON public.messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;