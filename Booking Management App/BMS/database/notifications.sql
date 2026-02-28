-- ============================================
-- TABLE: notifications
-- Description: In-app user notifications
-- ============================================

CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_appointment_id UUID REFERENCES public.appointments(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTIFICATION TYPES
-- ============================================
-- - booking_created: New appointment request
-- - booking_confirmed: Appointment approved
-- - booking_rejected: Appointment rejected
-- - booking_cancelled: Appointment cancelled
-- - booking_completed: Appointment completed
-- - reminder: 24-hour reminder
-- - info: General information
-- - payment_success: Payment confirmed
-- - payment_failed: Payment failed
-- - payment_refunded: Refund processed
-- - success: Generic success
-- - error: Error notification
-- - reschedule_request: Reschedule requested
-- - reschedule_accepted: Reschedule approved
-- - reschedule_declined: Reschedule rejected
-- - contact_message: Message from provider
-- - account_appeal: Account appeal notification

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can insert notifications (for edge functions)
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
