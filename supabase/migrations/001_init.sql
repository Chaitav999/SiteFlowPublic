CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE crew_status AS ENUM ('On Site', 'En Route', 'Available', 'Delayed', 'Off Shift');
CREATE TYPE work_order_status AS ENUM ('Assigned', 'In Progress', 'Awaiting Review', 'Completed', 'Blocked');
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE field_job_status AS ENUM ('Assigned', 'In Progress', 'Paused', 'Completed');
CREATE TYPE inspection_status AS ENUM ('Pending', 'In Progress', 'Passed', 'Failed');
CREATE TYPE deficiency_status AS ENUM ('Open', 'Assigned', 'In Progress', 'Resolved', 'Verified');
CREATE TYPE sync_status AS ENUM ('Queued', 'Uploading', 'Synced', 'Failed');
CREATE TYPE notification_tone AS ENUM ('success', 'warning', 'critical', 'info', 'neutral');

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('field_worker', 'supervisor', 'admin')),
  crew_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  status crew_status NOT NULL,
  lead TEXT NOT NULL,
  current_work_order_id UUID,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  hours_this_week NUMERIC(5,2) NOT NULL DEFAULT 0,
  vehicle TEXT NOT NULL,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  location_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  highway TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  highway TEXT NOT NULL,
  km NUMERIC(9,2) NOT NULL,
  location_label TEXT NOT NULL,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  supervisor UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority priority_level NOT NULL,
  status work_order_status NOT NULL,
  due_date TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  description TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE field_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE RESTRICT,
  status field_job_status NOT NULL,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  inspection_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sync_status sync_status NOT NULL DEFAULT 'Queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES inspection_templates(id) ON DELETE RESTRICT,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  location_label TEXT NOT NULL,
  inspector UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status inspection_status NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_accuracy INTEGER,
  captured_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  sync_status sync_status NOT NULL DEFAULT 'Queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  recorded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_accuracy INTEGER,
  captured_at TIMESTAMPTZ,
  sync_status sync_status NOT NULL DEFAULT 'Queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deficiencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deficiency_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  severity priority_level NOT NULL,
  status deficiency_status NOT NULL,
  highway TEXT NOT NULL,
  location_label TEXT NOT NULL,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  location_accuracy INTEGER NOT NULL,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reported_at TIMESTAMPTZ NOT NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  assigned_crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_status sync_status NOT NULL DEFAULT 'Queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE photo_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  caption TEXT NOT NULL,
  category TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL,
  uploader UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  deficiency_id UUID REFERENCES deficiencies(id) ON DELETE SET NULL,
  inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  location_accuracy INTEGER NOT NULL,
  sync_status sync_status NOT NULL DEFAULT 'Queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tone notification_tone NOT NULL,
  link_kind TEXT,
  link_id UUID,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  label TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status sync_status NOT NULL DEFAULT 'Queued',
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_field_jobs_work_order_id ON field_jobs(work_order_id);
CREATE INDEX idx_inspections_work_order_id ON inspections(work_order_id);
CREATE INDEX idx_deficiencies_work_order_id ON deficiencies(work_order_id);
CREATE INDEX idx_photo_evidence_work_order_id ON photo_evidence(work_order_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_sync_operations_status ON sync_operations(status);
