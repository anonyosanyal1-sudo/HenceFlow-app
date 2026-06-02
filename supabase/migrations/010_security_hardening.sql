-- 010_security_hardening.sql
--
-- Addresses the critical/high server-side findings from the security teardown.
-- Like all migrations in this repo, it must be applied manually (see CLAUDE.md).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CRITICAL: Company UPDATE had no WITH CHECK, so any admin could rewrite
--    owner_id and seize ownership. RLS WITH CHECK cannot reference the OLD row,
--    so we enforce ownership-transfer protection with a BEFORE UPDATE trigger.
--    Admins may still manage member_ids/admin_ids (legitimate invite flow), but
--    only the current owner can change owner_id.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_company_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND auth.uid() <> OLD.owner_id THEN
    RAISE EXCEPTION 'Only the company owner can transfer ownership';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_company_ownership ON public.companies;
CREATE TRIGGER trg_protect_company_ownership
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_ownership();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HIGH: Tasks UPDATE allowed any project member to overwrite creator_id
--    (authorship spoofing). creator_id is immutable after creation.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_task_creator()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
    NEW.creator_id := OLD.creator_id;  -- silently preserve original author
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_task_creator ON public.tasks;
CREATE TRIGGER trg_protect_task_creator
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.protect_task_creator();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HIGH: Project INSERT only checked owner_id = auth.uid(), letting a user
--    create projects under a company they don't belong to. Require company
--    membership at insert time.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND auth.uid() = ANY (c.member_ids)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CRITICAL: intake_submissions INSERT was WITH CHECK (true) — anyone holding
--    the public anon key could insert unlimited rows for any form_id, public or
--    not. Gate inserts on the target form being public, and cap payload size at
--    the database level (client caps are bypassable).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "intake_submissions_insert" ON intake_submissions;
CREATE POLICY "intake_submissions_insert" ON intake_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM intake_forms f
      WHERE f.id = form_id AND f.is_public = true
    )
  );

ALTER TABLE intake_submissions
  DROP CONSTRAINT IF EXISTS intake_submissions_data_size,
  DROP CONSTRAINT IF EXISTS intake_submissions_name_len,
  DROP CONSTRAINT IF EXISTS intake_submissions_email_len;
ALTER TABLE intake_submissions
  ADD CONSTRAINT intake_submissions_data_size  CHECK (octet_length(data::text) <= 16384),
  ADD CONSTRAINT intake_submissions_name_len   CHECK (submitter_name  IS NULL OR char_length(submitter_name)  <= 200),
  ADD CONSTRAINT intake_submissions_email_len  CHECK (submitter_email IS NULL OR char_length(submitter_email) <= 254);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Metrics correctness: velocity / "days in stage" were derived from
--    updated_at, which any edit resets. Add a status_changed_at column that only
--    advances when status actually changes, set by a trigger.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_status_changed_at ON public.tasks;
CREATE TRIGGER trg_set_status_changed_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_status_changed_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Gantt timeline: tasks had no real planned start. Add an optional start_date
--    so the chart no longer fabricates bar starts from created_at.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date DATE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Realtime cross-tenant exposure: postgres_changes honors per-row RLS SELECT
--    policies, and every realtime table here already has a scoped SELECT policy
--    (tasks/comments/etc. by project membership; notifications by user_id;
--    companies/projects by membership). The client-side project_id filter in
--    useServerEvents is therefore a performance optimization, not the access
--    control boundary. Ensure RLS stays enabled on every published table.
-- ─────────────────────────────────────────────────────────────────────────────
-- (No-op assertion block — tables already have RLS enabled in earlier migrations.)
</content>
