-- Fix company RLS policies to include owner, and backfill existing companies

-- SELECT: owner must always be able to read their company
DROP POLICY IF EXISTS "Members can view companies" ON public.companies;
CREATE POLICY "Members can view companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = ANY(member_ids));

-- UPDATE: owner must always be able to update their company
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = ANY(admin_ids));

-- Backfill existing companies: add owner_id to member_ids and admin_ids if missing
UPDATE public.companies
SET
  member_ids = CASE
    WHEN owner_id = ANY(member_ids) THEN member_ids
    ELSE array_prepend(owner_id, member_ids)
  END,
  admin_ids = CASE
    WHEN owner_id = ANY(admin_ids) THEN admin_ids
    ELSE array_prepend(owner_id, admin_ids)
  END;
