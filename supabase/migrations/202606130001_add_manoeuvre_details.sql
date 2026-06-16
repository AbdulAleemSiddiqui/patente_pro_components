-- Add difficulty and icon columns to manoeuvres table
ALTER TABLE public.maneuvers
  ADD COLUMN difficulty text not null default 'Base',
  ADD COLUMN icon text not null default 'check_circle';

-- Update existing manoeuvres with their correct data
UPDATE public.maneuvers SET
  difficulty = CASE
    WHEN name = 'Seat and mirror adjustment' THEN 'Base'
    WHEN name = 'Correct use of clutch and brake' THEN 'Base'
    WHEN name = 'Uphill start' THEN 'Medium'
    WHEN name = 'Smooth gear shifting' THEN 'Base'
    WHEN name = 'Parallel parking' THEN 'Difficult'
    WHEN name = 'Parking on the plug' THEN 'Medium'
    WHEN name = 'Perpendicular parking' THEN 'Medium'
    ELSE 'Base'
  END,
  icon = CASE
    WHEN name LIKE '%Vehicle%' OR name LIKE '%mirror%' OR name LIKE '%clutch%' OR name LIKE '%brake%' OR name LIKE '%gear%' OR name LIKE '%Uphill%' THEN 'car'
    WHEN name LIKE '%Parking%' THEN 'local_parking'
    ELSE 'check_circle'
  END;
