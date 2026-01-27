-- Enable realtime for appointments table so users see status updates immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;