INSERT INTO projects (id, name, highway, region) VALUES
  ('33333333-3333-4333-8333-333333333333', 'Hwy 97 Resurfacing', 'Highway 97', 'North')
ON CONFLICT DO NOTHING;

INSERT INTO crews (id, name, specialty, status, lead, current_work_order_id, completed_jobs, hours_this_week, vehicle, location_lat, location_lng, location_label)
VALUES ('44444444-4444-4444-8444-444444444444', 'North Crew', 'Guardrail', 'On Site', 'Maya Green', NULL, 12, 38.5, 'Truck 12', 49.232, -122.811, 'Northbound MP 18.4')
ON CONFLICT DO NOTHING;

INSERT INTO work_orders (id, work_order_number, title, type, project_id, highway, km, location_label, location_lat, location_lng, crew_id, assigned_to, supervisor, priority, status, due_date, scheduled_at, description, checklist, attachments)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  'WO-1001',
  'Guardrail repair',
  'Maintenance',
  '33333333-3333-4333-8333-333333333333',
  'Highway 97',
  18.4,
  'Northbound MP 18.4',
  49.232,
  -122.811,
  '44444444-4444-4444-8444-444444444444',
  NULL,
  NULL,
  'High',
  'Assigned',
  NOW() + interval '1 day',
  NOW(),
  'Replace damaged guardrail posts and inspect adjacent signage.',
  '[{"id":"c1","label":"Confirm traffic control setup","done":false},{"id":"c2","label":"Capture before-work evidence","done":false}]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO field_jobs (id, work_order_id, title, scheduled_at, crew_id, status, instructions, safety_notes)
VALUES (
  '66666666-6666-4666-8666-666666666666',
  '55555555-5555-4555-8555-555555555555',
  'Repair guardrail at MP 18.4',
  NOW(),
  '44444444-4444-4444-8444-444444444444',
  'Assigned',
  '["Set up traffic control","Replace damaged posts","Photograph completed repair"]'::jsonb,
  '["Wear high-visibility PPE","Maintain a safe work zone"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inspection_templates (id, slug, name, questions)
VALUES (
  '77777777-7777-4777-8777-777777777777',
  'guardrail',
  'Guardrail inspection',
  '[{"id":"condition","label":"Guardrail condition","type":"select","options":["Good","Fair","Poor"],"required":true},{"id":"damage","label":"Visible damage","type":"boolean","required":true}]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
