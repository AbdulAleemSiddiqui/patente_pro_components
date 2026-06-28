-- Fix the rating column to accept text values instead of integers

-- Drop the existing check constraint
ALTER TABLE public.maneuver_ratings DROP CONSTRAINT IF EXISTS maneuver_ratings_rating_check;

-- Convert the rating column from integer to text
ALTER TABLE public.maneuver_ratings
ALTER COLUMN rating DROP DEFAULT;

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

-- Add the new check constraint for text values
ALTER TABLE public.maneuver_ratings
ADD CONSTRAINT maneuver_ratings_rating_check
CHECK (rating IN ('poor', 'fair', 'good'));
