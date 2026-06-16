-- Add highway routes and exits for Genova city
-- This migration uses the actual city_id from your system

-- First, let's check what cities exist and use the right one
-- For now, we'll use the city_id that's currently in use: 11111111-1111-1111-1111-111111111111

-- Add Highway route type
INSERT INTO public.route_types (id, city_id, name, requires_sub_selection)
VALUES ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111111', 'Highway', true)
ON CONFLICT (id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  name = EXCLUDED.name,
  requires_sub_selection = EXCLUDED.requires_sub_selection;

-- Add highway sub-types (A7, A10, A12, A26)
INSERT INTO public.route_sub_types (id, route_type_id, label)
VALUES
  ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333306', 'A7 (Autostrada dei Giovi)'),
  ('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333306', 'A10 (Autostrada dei Fiori)'),
  ('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333306', 'A12 (Autostrada Tirrenica)'),
  ('44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333306', 'A26 (Autostrada dei Trafori)')
ON CONFLICT (id) DO UPDATE SET
  route_type_id = EXCLUDED.route_type_id,
  label = EXCLUDED.label;

-- Add Highway Exit route type
INSERT INTO public.route_types (id, city_id, name, requires_sub_selection)
VALUES ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111111', 'Highway Exit', true)
ON CONFLICT (id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  name = EXCLUDED.name,
  requires_sub_selection = EXCLUDED.requires_sub_selection;

-- Add highway exit sub-types
INSERT INTO public.route_sub_types (id, route_type_id, label)
VALUES
  ('44444444-4444-4444-4444-444444444409', '33333333-3333-3333-3333-333333333307', 'Genova Ovest'),
  ('44444444-4444-4444-4444-444444444410', '33333333-3333-3333-3333-333333333307', 'Genova Est'),
  ('44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333307', 'Genova Aeroporto'),
  ('44444444-4444-4444-4444-444444444412', '33333333-3333-3333-3333-333333333307', 'Genova Nervi'),
  ('44444444-4444-4444-4444-444444444413', '33333333-3333-3333-3333-333333333307', 'Genova Pegli / Prà / Voltri / Bolzaneto')
ON CONFLICT (id) DO UPDATE SET
  route_type_id = EXCLUDED.route_type_id,
  label = EXCLUDED.label;
