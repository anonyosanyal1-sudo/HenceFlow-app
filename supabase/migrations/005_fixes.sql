-- HenceFlow – bug fixes migration
-- 1. Add is_archived to projects
-- 2. Make activity_logs.task_id nullable with ON DELETE SET NULL (preserve logs when tasks are deleted)
-- 3. Add missing tables to realtime publication

-- ── Archive flag on projects ──────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Activity logs: preserve entries when task is deleted ──────────────────────

-- Drop the existing NOT NULL constraint and CASCADE FK
ALTER TABLE public.activity_logs
  ALTER COLUMN task_id DROP NOT NULL;

ALTER TABLE public.activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_task_id_fkey;

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

-- ── Realtime for tables added in prior migrations ─────────────────────────────

DO $$
BEGIN
  -- task_dependencies
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_dependencies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_dependencies;
  END IF;

  -- custom_field_definitions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'custom_field_definitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_field_definitions;
  END IF;

  -- custom_field_values
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'custom_field_values'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_field_values;
  END IF;

  -- task_templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_templates;
  END IF;

  -- pods
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pods'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pods;
  END IF;
END$$;
