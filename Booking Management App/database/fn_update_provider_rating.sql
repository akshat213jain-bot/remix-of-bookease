-- ============================================
-- FUNCTION: update_provider_rating
-- Description: Recalculates provider's average rating and total reviews
-- Called automatically when reviews are inserted, updated, or deleted
-- ============================================

CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.provider_profiles
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
      AND is_visible = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
      AND is_visible = true
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger after review insert
CREATE TRIGGER update_provider_rating_on_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

-- Trigger after review update
CREATE TRIGGER update_provider_rating_on_update
  AFTER UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

-- Trigger after review delete
CREATE TRIGGER update_provider_rating_on_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

-- ============================================
-- NOTES
-- ============================================
-- - Only visible reviews (is_visible = true) are counted
-- - Rating is rounded to 2 decimal places
-- - Works for INSERT, UPDATE, and DELETE operations
