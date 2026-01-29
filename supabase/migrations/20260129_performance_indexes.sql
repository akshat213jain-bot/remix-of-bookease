-- Performance Indexes for Booking Management App
-- Created: 2026-01-29

-- Index for faster appointment queries by provider and date
CREATE INDEX IF NOT EXISTS idx_appointments_provider_date 
ON appointments(provider_id, appointment_date);

-- Index for user appointment listing with status filter
CREATE INDEX IF NOT EXISTS idx_appointments_user_status 
ON appointments(user_id, status);

-- Index for provider search by location
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location 
ON provider_profiles(location);

-- Index for appointment time range queries
CREATE INDEX IF NOT EXISTS idx_appointments_date_time 
ON appointments(appointment_date, start_time, end_time);

-- Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status 
ON appointments(payment_status);

-- Index for video consultation filtering
CREATE INDEX IF NOT EXISTS idx_appointments_video 
ON appointments(is_video_consultation) WHERE is_video_consultation = true;

-- Composite index for provider availability lookup
CREATE INDEX IF NOT EXISTS idx_provider_availability_lookup 
ON provider_availability(provider_id, day_of_week, is_active);

-- Index for blocked dates lookup
CREATE INDEX IF NOT EXISTS idx_blocked_dates_lookup 
ON provider_blocked_dates(provider_id, blocked_date);

-- Comment for documentation
COMMENT ON INDEX idx_appointments_provider_date IS 'Optimizes provider dashboard queries';
COMMENT ON INDEX idx_appointments_user_status IS 'Optimizes user appointment listing';
COMMENT ON INDEX idx_provider_profiles_location IS 'Optimizes location-based provider search';
