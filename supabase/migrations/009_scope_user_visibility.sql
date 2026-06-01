-- 009_scope_user_visibility.sql
-- Security fix (SEC-03 / security_spec invariant #11 "PII Leak"):
--
-- Migration 001 created the policy "Authenticated users can view all profiles"
-- with USING (auth.role() = 'authenticated'), which let ANY logged-in user read
-- EVERY other user's profile row (email, display name, photo) regardless of whether
-- they shared a company. fetchUsers() relied on this.
--
-- This migration replaces it with a policy that limits profile visibility to:
--   1. the requester's own profile, and
--   2. profiles of users who are members of at least one company the requester
--      is also a member of.
--
-- companies.member_ids stores auth uids (the companies SELECT policy uses
-- `auth.uid() = ANY(member_ids)`), and public.users.id is the auth.users id, so
-- matching `users.id = ANY(c.member_ids)` correctly identifies company co-members.

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.users;

CREATE POLICY "Users can view profiles of company co-members"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE auth.uid() = ANY (c.member_ids)
        AND public.users.id = ANY (c.member_ids)
    )
  );
