-- Create calls table for tracking video calls
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  room_url TEXT NOT NULL,
  room_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  call_type TEXT NOT NULL DEFAULT 'video',
  appointment_id UUID REFERENCES public.appointments(id),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Users can view calls they're part of
CREATE POLICY "Users can view their calls"
ON public.calls
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Users can create calls
CREATE POLICY "Users can create calls"
ON public.calls
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Users can update calls they're part of
CREATE POLICY "Users can update their calls"
ON public.calls
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Add updated_at trigger
CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for call status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;