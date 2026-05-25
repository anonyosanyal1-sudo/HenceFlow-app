-- HenceFlow – feature additions migration
-- Adds: subtasks, task dependencies, time tracking, recurring tasks,
--       milestones, activity logs, custom fields, task templates.

-- ── Extend tasks table ───────────────────────────────────────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS subtasks         JSONB   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS recurrence_rule  TEXT    CHECK (recurrence_rule IN ('daily','weekly','monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS milestone_id     UUID;

-- ── Milestones (must exist before FK on tasks) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view milestones"
  ON public.milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can create milestones"
  ON public.milestones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project owners can update milestones"
  ON public.milestones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = owner_id
  ));

CREATE POLICY "Project owners can delete milestones"
  ON public.milestones FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = owner_id
  ));

-- Now add FK from tasks.milestone_id to milestones
ALTER TABLE public.tasks
  ADD CONSTRAINT IF NOT EXISTS tasks_milestone_id_fkey
  FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE SET NULL;

-- ── Task Dependencies ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, depends_on_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view task dependencies"
  ON public.task_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can manage task dependencies"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can delete task dependencies"
  ON public.task_dependencies FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

-- ── Time Entries ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.time_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  minutes     INTEGER NOT NULL CHECK (minutes > 0),
  note        TEXT,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view time entries"
  ON public.time_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Users can create own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ── Activity Logs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL,
  user_id     UUID NOT NULL,
  action      TEXT NOT NULL,
  field       TEXT,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

-- ── Custom Field Definitions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text'
              CHECK (field_type IN ('text','number','url','select')),
  options     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view custom field definitions"
  ON public.custom_field_definitions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project owners can manage custom field definitions"
  ON public.custom_field_definitions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = owner_id
  ));

CREATE POLICY "Project owners can update custom field definitions"
  ON public.custom_field_definitions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = owner_id
  ));

CREATE POLICY "Project owners can delete custom field definitions"
  ON public.custom_field_definitions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = owner_id
  ));

-- ── Custom Field Values ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id  UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value    TEXT,
  UNIQUE (task_id, field_id)
);

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view custom field values"
  ON public.custom_field_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can upsert custom field values"
  ON public.custom_field_values FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can update custom field values"
  ON public.custom_field_values FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

CREATE POLICY "Project members can delete custom field values"
  ON public.custom_field_values FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND auth.uid() = ANY(p.members)
  ));

-- ── Task Templates ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  template    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view templates"
  ON public.task_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can create templates"
  ON public.task_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

CREATE POLICY "Project members can delete templates"
  ON public.task_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND auth.uid() = ANY(members)
  ));

-- ── Realtime for new tables ───────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
