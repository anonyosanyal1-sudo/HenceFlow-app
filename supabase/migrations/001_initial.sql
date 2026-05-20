-- HenceFlow – initial schema
-- Run this in the Supabase SQL editor or via supabase db push.

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  uid         TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  display_name TEXT,
  photo_url   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL,
  admin_ids   UUID[] NOT NULL DEFAULT '{}',
  member_ids  UUID[] NOT NULL DEFAULT '{}',
  location    TEXT,
  website     TEXT,
  industry    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID NOT NULL,
  members     UUID[] NOT NULL DEFAULT '{}',
  color       TEXT NOT NULL DEFAULT '#6366f1',
  stages      JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo',
  priority    TEXT NOT NULL DEFAULT 'medium',
  assignee_id UUID,
  creator_id  UUID NOT NULL,
  due_date    DATE,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL,
  user_id     UUID NOT NULL,
  content     TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  likes       UUID[] DEFAULT '{}',
  dislikes    UUID[] DEFAULT '{}',
  is_edited   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments  ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "Authenticated users can view all profiles"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- companies
CREATE POLICY "Members can view companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = ANY(member_ids));

CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = ANY(admin_ids));

CREATE POLICY "Owners can delete companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = owner_id);

-- projects
CREATE POLICY "Members can view projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = ANY(members));

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- tasks
CREATE POLICY "Project members can view tasks"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Project members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Project members can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Creators and project owners can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = owner_id
    )
  );

-- comments
CREATE POLICY "Project members can view comments"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Project members can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = ANY(members)
    )
  );

CREATE POLICY "Authors can update comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors and project owners can delete comments"
  ON public.comments FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND auth.uid() = owner_id
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- ── Auto-create user profile on sign-up ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, uid, email, display_name, photo_url)
  VALUES (
    NEW.id,
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    photo_url    = COALESCE(EXCLUDED.photo_url, public.users.photo_url),
    updated_at   = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
