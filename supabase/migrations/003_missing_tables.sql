-- HenceFlow – missing tables migration
-- Adds: pods, pod_id on projects, notifications, task_watchers,
--       saved_filters, automation_rules.

-- ── Pods ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  owner_id    UUID NOT NULL,
  members     UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pod members can view pods"
  ON public.pods FOR SELECT
  USING (auth.uid() = ANY(members));

CREATE POLICY "Company members can create pods"
  ON public.pods FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = company_id AND auth.uid() = ANY(member_ids)
    )
  );

CREATE POLICY "Pod owners can update pods"
  ON public.pods FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Pod owners can delete pods"
  ON public.pods FOR DELETE
  USING (auth.uid() = owner_id);

-- ── Add pod_id to projects ────────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL;

-- ── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  task_id     UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ── Task Watchers ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_watchers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view task watchers"
  ON public.task_watchers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_id AND auth.uid() = ANY(p.members)
    )
  );

CREATE POLICY "Project members can watch tasks"
  ON public.task_watchers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_id AND auth.uid() = ANY(p.members)
    )
  );

CREATE POLICY "Users can unwatch tasks"
  ON public.task_watchers FOR DELETE
  USING (auth.uid() = user_id);

-- ── Saved Filters ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_filters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  name        TEXT NOT NULL,
  filters     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved filters"
  ON public.saved_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create saved filters"
  ON public.saved_filters FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Users can delete own saved filters"
  ON public.saved_filters FOR DELETE
  USING (auth.uid() = user_id);

-- ── Automation Rules ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  trigger_type  TEXT NOT NULL,
  trigger_value TEXT,
  action_type   TEXT NOT NULL,
  action_value  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view automation rules"
  ON public.automation_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Project members can create automation rules"
  ON public.automation_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Project members can update automation rules"
  ON public.automation_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Project members can delete automation rules"
  ON public.automation_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );
