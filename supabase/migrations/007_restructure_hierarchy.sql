-- HenceFlow – restructure to Company → Projects → Pods → Tasks

-- ── Extend projects: add manager_id ─────────────────────────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS manager_id UUID;
UPDATE public.projects SET manager_id = owner_id WHERE manager_id IS NULL;

-- ── Extend pods: add project_id FK and stages ────────────────────────────────
ALTER TABLE public.pods
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS stages JSONB NOT NULL DEFAULT '[]';

-- ── Extend tasks: add pod_id FK ──────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL;

-- ── Migrate existing data ────────────────────────────────────────────────────
-- For each existing project create a default "General" pod under it,
-- carrying over the project's stages, color, owner and members.
INSERT INTO public.pods (company_id, project_id, name, color, owner_id, members, stages)
SELECT
  p.company_id,
  p.id   AS project_id,
  'General' AS name,
  p.color,
  p.owner_id,
  p.members,
  COALESCE(p.stages, '[]'::jsonb) AS stages
FROM public.projects p
ON CONFLICT DO NOTHING;

-- Point all existing tasks at their project's newly-created default pod
UPDATE public.tasks t
SET pod_id = (
  SELECT po.id
  FROM   public.pods po
  WHERE  po.project_id = t.project_id
  ORDER  BY po.created_at ASC
  LIMIT  1
)
WHERE t.pod_id IS NULL;

-- ── Update pods RLS policies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Pod members can view pods"       ON public.pods;
DROP POLICY IF EXISTS "Company members can create pods" ON public.pods;
DROP POLICY IF EXISTS "Pod owners can update pods"      ON public.pods;
DROP POLICY IF EXISTS "Pod owners can delete pods"      ON public.pods;

CREATE POLICY "Project members can view pods"
  ON public.pods FOR SELECT
  USING (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND auth.uid() = ANY(p.members)
    )
  );

CREATE POLICY "Project members can create pods"
  ON public.pods FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND auth.uid() = ANY(p.members)
    )
  );

CREATE POLICY "Project members can update pods"
  ON public.pods FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND auth.uid() = ANY(p.members)
    )
  );

CREATE POLICY "Project members can delete pods"
  ON public.pods FOR DELETE
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND auth.uid() = p.owner_id
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pods'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pods;
  END IF;
END $$;
