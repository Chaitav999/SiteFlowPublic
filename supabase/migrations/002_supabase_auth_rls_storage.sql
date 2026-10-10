ALTER TABLE profiles
  ALTER COLUMN id DROP DEFAULT,
  ADD CONSTRAINT profiles_auth_user_fk
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_crew_fk
    FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE SET NULL;

ALTER TABLE crews
  ADD CONSTRAINT crews_current_work_order_fk
    FOREIGN KEY (current_work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;

ALTER TABLE field_jobs
  ADD CONSTRAINT field_jobs_inspection_fk
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL;

ALTER TABLE photo_evidence
  ADD COLUMN storage_path TEXT UNIQUE,
  ALTER COLUMN url DROP NOT NULL;

ALTER TABLE notifications
  ADD COLUMN recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE sync_operations
  ADD COLUMN user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE;

CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (crew_id, user_id)
);

CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_job_id UUID NOT NULL REFERENCES field_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (field_job_id, user_id)
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'crews', 'projects', 'work_orders', 'field_jobs',
    'inspection_templates', 'inspections', 'measurements', 'deficiencies',
    'photo_evidence', 'notifications', 'sync_operations', 'crew_members',
    'job_assignments'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_name TEXT;
BEGIN
  full_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, email, name, initials, title, role)
  VALUES (
    NEW.id,
    NEW.email,
    full_name,
    upper(left(full_name, 1) || COALESCE(left(split_part(full_name, ' ', 2), 1), '')),
    'Field Worker',
    'field_worker'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.has_roadops_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND NEW.role IS DISTINCT FROM OLD.role
    AND NOT public.has_roadops_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Only an administrator can change account roles'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

CREATE OR REPLACE FUNCTION public.transition_field_job(
  target_job_id UUID,
  next_status field_job_status
)
RETURNS SETOF field_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target field_jobs%ROWTYPE;
  current_time_utc TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO target
  FROM public.field_jobs
  WHERE id = target_job_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT public.has_roadops_role(ARRAY['supervisor', 'admin'])
    AND NOT EXISTS (
      SELECT 1
      FROM public.crew_members cm
      WHERE cm.crew_id = target.crew_id
        AND cm.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.crew_id = target.crew_id
    ) THEN
    RAISE EXCEPTION 'Only an assigned crew member or manager can update this job'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.field_jobs
  SET status = next_status,
      started_at = CASE WHEN next_status = 'In Progress' THEN COALESCE(started_at, current_time_utc) ELSE started_at END,
      completed_at = CASE WHEN next_status = 'Completed' THEN current_time_utc ELSE completed_at END,
      sync_status = 'Synced',
      updated_at = current_time_utc
  WHERE id = target_job_id
  RETURNING * INTO target;

  IF next_status = 'In Progress' THEN
    UPDATE public.work_orders
    SET status = 'In Progress', updated_at = current_time_utc
    WHERE id = target.work_order_id AND status = 'Assigned';
  ELSIF next_status = 'Completed' THEN
    UPDATE public.work_orders
    SET status = 'Awaiting Review', updated_at = current_time_utc
    WHERE id = target.work_order_id;
  END IF;

  RETURN NEXT target;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_work_order_checklist(
  target_work_order_id UUID,
  target_item_id TEXT,
  item_done BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_checklist JSONB;
  changed_checklist JSONB;
  target_crew_id UUID;
BEGIN
  SELECT checklist, crew_id INTO current_checklist, target_crew_id
  FROM public.work_orders
  WHERE id = target_work_order_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT public.has_roadops_role(ARRAY['supervisor', 'admin'])
    AND NOT EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = target_crew_id AND cm.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.crew_id = target_crew_id
    ) THEN
    RAISE EXCEPTION 'Only the assigned crew or a manager can update this checklist'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(current_checklist) AS entries(item)
    WHERE item ->> 'id' = target_item_id
  ) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(
    CASE WHEN item ->> 'id' = target_item_id
      THEN jsonb_set(item, '{done}', to_jsonb(item_done))
      ELSE item
    END
    ORDER BY ordinal
  ) INTO changed_checklist
  FROM jsonb_array_elements(current_checklist) WITH ORDINALITY AS entries(item, ordinal);

  UPDATE public.work_orders
  SET checklist = changed_checklist, updated_at = NOW()
  WHERE id = target_work_order_id;

  RETURN changed_checklist;
END;
$$;

REVOKE ALL ON FUNCTION public.has_roadops_role(TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_field_job(UUID, field_job_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_work_order_checklist(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prevent_self_role_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_roadops_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_field_job(UUID, field_job_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_work_order_checklist(UUID, TEXT, BOOLEAN) TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_crew_members_user_id ON crew_members(user_id);
CREATE INDEX idx_job_assignments_user_id ON job_assignments(user_id);
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_sync_operations_user_id ON sync_operations(user_id);

CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Authenticated users can read crews"
  ON crews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage crews"
  ON crews FOR ALL TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage projects"
  ON projects FOR ALL TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));

CREATE POLICY "Authenticated users can read work orders"
  ON work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers create work orders"
  ON work_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Managers update work orders"
  ON work_orders FOR UPDATE TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Admins delete work orders"
  ON work_orders FOR DELETE TO authenticated
  USING (public.has_roadops_role(ARRAY['admin']));

CREATE POLICY "Authenticated users can read field jobs"
  ON field_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers create field jobs"
  ON field_jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Managers update field jobs"
  ON field_jobs FOR UPDATE TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Managers delete field jobs"
  ON field_jobs FOR DELETE TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Authenticated users can read crew membership"
  ON crew_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage crew membership"
  ON crew_members FOR ALL TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Authenticated users can read job assignments"
  ON job_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage job assignments"
  ON job_assignments FOR ALL TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));

CREATE POLICY "Authenticated users can read inspection templates"
  ON inspection_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage inspection templates"
  ON inspection_templates FOR ALL TO authenticated
  USING (public.has_roadops_role(ARRAY['admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['admin']));

CREATE POLICY "Authenticated users can read inspections"
  ON inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create assigned inspections"
  ON inspections FOR INSERT TO authenticated
  WITH CHECK (
    inspector = auth.uid()
    OR public.has_roadops_role(ARRAY['supervisor', 'admin'])
  );
CREATE POLICY "Inspectors and managers update inspections"
  ON inspections FOR UPDATE TO authenticated
  USING (
    inspector = auth.uid()
    OR public.has_roadops_role(ARRAY['supervisor', 'admin'])
  )
  WITH CHECK (
    inspector = auth.uid()
    OR public.has_roadops_role(ARRAY['supervisor', 'admin'])
  );
CREATE POLICY "Managers delete inspections"
  ON inspections FOR DELETE TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']));

CREATE POLICY "Authenticated users can read measurements"
  ON measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users create measurements"
  ON measurements FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "Authenticated users update measurements"
  ON measurements FOR UPDATE TO authenticated USING (recorded_by = auth.uid()) WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "Managers delete measurements"
  ON measurements FOR DELETE TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']));

CREATE POLICY "Authenticated users can read deficiencies"
  ON deficiencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users report deficiencies"
  ON deficiencies FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());
CREATE POLICY "Managers update deficiencies"
  ON deficiencies FOR UPDATE TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Managers delete deficiencies"
  ON deficiencies FOR DELETE TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']));

CREATE POLICY "Authenticated users can read photo evidence"
  ON photo_evidence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users upload their own evidence"
  ON photo_evidence FOR INSERT TO authenticated WITH CHECK (uploader = auth.uid());
CREATE POLICY "Users manage their evidence"
  ON photo_evidence FOR UPDATE TO authenticated
  USING (uploader = auth.uid() OR public.has_roadops_role(ARRAY['supervisor', 'admin']))
  WITH CHECK (uploader = auth.uid() OR public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Users delete their evidence"
  ON photo_evidence FOR DELETE TO authenticated
  USING (uploader = auth.uid() OR public.has_roadops_role(ARRAY['supervisor', 'admin']));

CREATE POLICY "Users can read global or personal notifications"
  ON notifications FOR SELECT TO authenticated
  USING (recipient_id IS NULL OR recipient_id = auth.uid());
CREATE POLICY "Authenticated users create notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.has_roadops_role(ARRAY['supervisor', 'admin'])
    OR (
      recipient_id IS NULL
      AND link_kind = 'deficiency'
      AND EXISTS (
        SELECT 1
        FROM public.deficiencies d
        WHERE d.id = notifications.link_id
          AND d.reported_by = auth.uid()
      )
    )
  );
CREATE POLICY "Users mark their notifications read"
  ON notifications FOR UPDATE TO authenticated
  USING (recipient_id IS NULL OR recipient_id = auth.uid())
  WITH CHECK (recipient_id IS NULL OR recipient_id = auth.uid());

CREATE POLICY "Users read their sync operations"
  ON sync_operations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage their sync operations"
  ON sync_operations FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers read audit events"
  ON audit_events FOR SELECT TO authenticated
  USING (public.has_roadops_role(ARRAY['supervisor', 'admin']));
CREATE POLICY "Authenticated users write audit events"
  ON audit_events FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photo-evidence', 'photo-evidence', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Authenticated users view evidence objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photo-evidence');
CREATE POLICY "Users upload into their evidence folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update their evidence objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photo-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'photo-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete their evidence objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photo-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
