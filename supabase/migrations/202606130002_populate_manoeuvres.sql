-- Clear existing manoeuvres and populate with correct data
DELETE FROM public.maneuvers;

-- Insert manoeuvres for all existing tenants
-- We'll use a CTE to get all tenants and insert manoeuvres for each
WITH all_tenants AS (
  SELECT id FROM public.tenants
)
INSERT INTO public.maneuvers (name, difficulty, icon, tenant_id, order_index)
SELECT
  manoeuvre_data.name,
  manoeuvre_data.difficulty,
  manoeuvre_data.icon,
  tenant.id,
  manoeuvre_data.order_index
FROM all_tenants tenant
CROSS JOIN (
  -- Vehicle Check (🚗)
  SELECT 'Seat and mirror adjustment' as name, 'Base' as difficulty, 'car' as icon, 1 as order_index
  UNION ALL SELECT 'Correct use of clutch and brake', 'Base', 'car', 2
  UNION ALL SELECT 'Uphill start', 'Medium', 'car', 3
  UNION ALL SELECT 'Smooth gear shifting', 'Base', 'car', 4

  -- Parking (🅿️)
  UNION ALL SELECT 'Parallel parking', 'Difficult', 'local_parking', 5
  UNION ALL SELECT 'Parking on the plug', 'Medium', 'local_parking', 6
  UNION ALL SELECT 'Perpendicular parking', 'Medium', 'local_parking', 7

  -- Road maneuvers (↔️)
  UNION ALL SELECT 'U-turn', 'Difficult', 'arrows_left_right', 8
  UNION ALL SELECT 'Turn right / left', 'Medium', 'arrows_left_right', 9
  UNION ALL SELECT 'Safe overtaking', 'Difficult', 'arrows_left_right', 10
  UNION ALL SELECT 'Roundabout', 'Medium', 'arrows_left_right', 11

  -- Behaviors (👁️)
  UNION ALL SELECT 'I use mirrors', 'Critic', 'eye', 12
  UNION ALL SELECT 'Arrow signaling', 'Critic', 'eye', 13
  UNION ALL SELECT 'Respect for right of way', 'Critic', 'eye', 14
  UNION ALL SELECT 'Lane Keeping', 'Medium', 'eye', 15
) manoeuvre_data;
