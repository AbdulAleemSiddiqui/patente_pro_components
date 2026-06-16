-- Add general_rating field to lesson_feedback table
ALTER TABLE public.lesson_feedback
ADD COLUMN general_rating text NOT NULL DEFAULT 'good';

-- Add check constraint for general_rating values
ALTER TABLE public.lesson_feedback
ADD CONSTRAINT lesson_feedback_general_rating_check
CHECK (general_rating IN ('poor', 'fair', 'good'));

-- Update maneuver_ratings to use text rating instead of int (1-5)
ALTER TABLE public.maneuver_ratings
DROP CONSTRAINT IF EXISTS maneuver_ratings_rating_check;

ALTER TABLE public.maneuver_ratings
ALTER COLUMN rating TYPE text USING (
  CASE rating
    WHEN 1 THEN 'poor'
    WHEN 2 THEN 'fair'
    WHEN 3 THEN 'fair'
    WHEN 4 THEN 'good'
    WHEN 5 THEN 'good'
    ELSE 'good'
  END
);

ALTER TABLE public.maneuver_ratings
ADD CONSTRAINT maneuver_ratings_rating_check
CHECK (rating IN ('poor', 'fair', 'good'));
