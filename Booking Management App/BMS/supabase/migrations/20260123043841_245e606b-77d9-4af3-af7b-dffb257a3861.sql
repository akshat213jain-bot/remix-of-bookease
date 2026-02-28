-- Performance Indexes for common query patterns

-- Appointments: Index for user's appointments lookup
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);

-- Appointments: Index for provider's appointments lookup
CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON public.appointments(provider_id);

-- Appointments: Composite index for date-based queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_appointments_provider_date ON public.appointments(provider_id, appointment_date);

-- Appointments: Index for status filtering
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Appointments: Composite index for user + status queries (dashboard filtering)
CREATE INDEX IF NOT EXISTS idx_appointments_user_status ON public.appointments(user_id, status);

-- Provider Profiles: Index for approved/active provider listings
CREATE INDEX IF NOT EXISTS idx_provider_profiles_active ON public.provider_profiles(is_approved, is_active) WHERE is_approved = true AND is_active = true;

-- Provider Profiles: Index for profession filtering
CREATE INDEX IF NOT EXISTS idx_provider_profiles_profession ON public.provider_profiles(profession);

-- Provider Availability: Index for provider's schedule lookup
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON public.provider_availability(provider_id, day_of_week);

-- Provider Blocked Dates: Index for date lookups
CREATE INDEX IF NOT EXISTS idx_provider_blocked_dates_lookup ON public.provider_blocked_dates(provider_id, blocked_date);

-- Notifications: Index for user's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);

-- Notifications: Index for unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;

-- Profiles: Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- User Roles: Index for user role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);