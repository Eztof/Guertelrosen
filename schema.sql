-- ============================================================
-- 7G Wiki – Supabase Schema
-- Run this in Supabase SQL Editor (Settings > SQL Editor)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Abenteurer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- WORLDS
-- ============================================================
CREATE TABLE public.worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORLD MEMBERS
-- ============================================================
CREATE TYPE public.world_role AS ENUM ('gm', 'editor', 'player');

CREATE TABLE public.world_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.world_role NOT NULL DEFAULT 'player',
  status TEXT NOT NULL DEFAULT 'active', -- active, invited, banned
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(world_id, user_id)
);

CREATE INDEX idx_world_members_user ON public.world_members(user_id);
CREATE INDEX idx_world_members_world ON public.world_members(world_id);

-- ============================================================
-- INVITE CODES
-- ============================================================
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role public.world_role NOT NULL DEFAULT 'player',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COLLECTIONS (Folder hierarchy)
-- ============================================================
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_collections_world ON public.collections(world_id);

-- ============================================================
-- ARTICLES
-- ============================================================
CREATE TYPE public.article_type AS ENUM (
  'location', 'npc', 'faction', 'item', 'deity', 'plot',
  'rule', 'handout', 'session_report', 'note'
);

CREATE TYPE public.visibility AS ENUM ('players', 'gm');

CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  type public.article_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  content_json JSONB,
  content_text TEXT,
  visibility public.visibility NOT NULL DEFAULT 'players',
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(world_id, slug)
);

CREATE INDEX idx_articles_world ON public.articles(world_id);
CREATE INDEX idx_articles_slug ON public.articles(world_id, slug);
CREATE INDEX idx_articles_type ON public.articles(world_id, type);
CREATE INDEX idx_articles_collection ON public.articles(collection_id);

-- Full text search index
CREATE INDEX idx_articles_fts ON public.articles
  USING GIN(to_tsvector('german', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content_text,'')));

-- ============================================================
-- ARTICLE VERSIONS
-- ============================================================
CREATE TABLE public.article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(article_id, version_no)
);

CREATE INDEX idx_article_versions_article ON public.article_versions(article_id);

-- ============================================================
-- ARTICLE LINKS (backlinks)
-- ============================================================
CREATE TABLE public.article_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  target_article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  UNIQUE(source_article_id, target_article_id)
);

CREATE INDEX idx_article_links_target ON public.article_links(target_article_id);

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  UNIQUE(world_id, name)
);

CREATE TABLE public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY(article_id, tag_id)
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_date DATE,
  recap TEXT,
  agenda TEXT,
  todos JSONB NOT NULL DEFAULT '[]',
  loot JSONB NOT NULL DEFAULT '[]',
  hooks TEXT,
  visibility public.visibility NOT NULL DEFAULT 'players',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_world ON public.sessions(world_id);

-- ============================================================
-- CHARACTERS
-- ============================================================
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('pc', 'npc')) DEFAULT 'npc',
  name TEXT NOT NULL,
  summary TEXT,
  details_json JSONB,
  visibility public.visibility NOT NULL DEFAULT 'players',
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_characters_world ON public.characters(world_id);

-- ============================================================
-- RELATIONSHIPS
-- ============================================================
CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  from_character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  to_character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  notes TEXT,
  visibility public.visibility NOT NULL DEFAULT 'players'
);

-- ============================================================
-- TIMELINES
-- ============================================================
CREATE TABLE public.timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES public.timelines(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT, -- freeform DSA dates like "3 Praios 1023 BF"
  end_date TEXT,
  related_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  visibility public.visibility NOT NULL DEFAULT 'players',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_timeline_events_timeline ON public.timeline_events(timeline_id);

-- ============================================================
-- MAPS
-- ============================================================
CREATE TABLE public.maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_path TEXT NOT NULL, -- path in storage bucket
  width INTEGER,
  height INTEGER,
  visibility public.visibility NOT NULL DEFAULT 'players',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maps_world ON public.maps(world_id);

CREATE TABLE public.map_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  x FLOAT NOT NULL, -- percentage 0-100
  y FLOAT NOT NULL, -- percentage 0-100
  title TEXT NOT NULL,
  notes TEXT,
  related_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  visibility public.visibility NOT NULL DEFAULT 'players'
);

CREATE INDEX idx_map_pins_map ON public.map_pins(map_id);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  owner UUID NOT NULL REFERENCES auth.users(id),
  visibility public.visibility NOT NULL DEFAULT 'players',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_world ON public.assets(world_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if current user is a member of a world
CREATE OR REPLACE FUNCTION public.is_world_member(p_world_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.world_members
    WHERE world_id = p_world_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Get current user's role in a world
CREATE OR REPLACE FUNCTION public.get_user_world_role(p_world_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role::TEXT FROM public.world_members
  WHERE world_id = p_world_id
  AND user_id = auth.uid()
  AND status = 'active'
  LIMIT 1;
$$;

-- Check if current user is GM of a world
CREATE OR REPLACE FUNCTION public.is_world_gm(p_world_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.world_members
    WHERE world_id = p_world_id
    AND user_id = auth.uid()
    AND role = 'gm'
    AND status = 'active'
  );
$$;

-- Check if current user is GM or editor
CREATE OR REPLACE FUNCTION public.can_edit_world(p_world_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.world_members
    WHERE world_id = p_world_id
    AND user_id = auth.uid()
    AND role IN ('gm', 'editor')
    AND status = 'active'
  );
$$;

-- Full-text search function
CREATE OR REPLACE FUNCTION public.search_articles(p_world_id UUID, p_query TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  slug TEXT,
  type TEXT,
  summary TEXT,
  rank REAL
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    a.id,
    a.title,
    a.slug,
    a.type::TEXT,
    a.summary,
    ts_rank(
      to_tsvector('german', coalesce(a.title,'') || ' ' || coalesce(a.summary,'') || ' ' || coalesce(a.content_text,'')),
      plainto_tsquery('german', p_query)
    ) AS rank
  FROM public.articles a
  WHERE
    a.world_id = p_world_id
    AND public.is_world_member(p_world_id)
    AND (
      a.visibility = 'players'
      OR (a.visibility = 'gm' AND public.is_world_gm(p_world_id))
    )
    AND to_tsvector('german', coalesce(a.title,'') || ' ' || coalesce(a.summary,'') || ' ' || coalesce(a.content_text,''))
        @@ plainto_tsquery('german', p_query)
  ORDER BY rank DESC
  LIMIT 30;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- WORLDS
CREATE POLICY "Members can read their worlds" ON public.worlds FOR SELECT
  USING (public.is_world_member(id));
CREATE POLICY "GMs can update world" ON public.worlds FOR UPDATE
  USING (public.is_world_gm(id));
CREATE POLICY "Authenticated users can create worlds" ON public.worlds FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- WORLD MEMBERS
CREATE POLICY "Members can read world members" ON public.world_members FOR SELECT
  USING (public.is_world_member(world_id));
CREATE POLICY "GMs can manage world members" ON public.world_members FOR ALL
  USING (public.is_world_gm(world_id));
CREATE POLICY "Users can insert themselves as member" ON public.world_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- INVITE CODES
CREATE POLICY "GMs can manage invite codes" ON public.invite_codes FOR ALL
  USING (public.is_world_gm(world_id));
CREATE POLICY "Anyone can read unused codes to join" ON public.invite_codes FOR SELECT
  USING (auth.uid() IS NOT NULL AND used_by IS NULL);
CREATE POLICY "User can update code when using it" ON public.invite_codes FOR UPDATE
  USING (auth.uid() IS NOT NULL AND used_by IS NULL);

-- COLLECTIONS
CREATE POLICY "Members can read collections" ON public.collections FOR SELECT
  USING (public.is_world_member(world_id));
CREATE POLICY "Editors can manage collections" ON public.collections FOR ALL
  USING (public.can_edit_world(world_id));

-- ARTICLES
CREATE POLICY "Members can read player-visible articles" ON public.articles FOR SELECT
  USING (
    public.is_world_member(world_id)
    AND (
      visibility = 'players'
      OR (visibility = 'gm' AND public.is_world_gm(world_id))
    )
  );
CREATE POLICY "Editors can insert articles" ON public.articles FOR INSERT
  WITH CHECK (public.can_edit_world(world_id));
CREATE POLICY "Editors can update articles" ON public.articles FOR UPDATE
  USING (public.can_edit_world(world_id));
CREATE POLICY "GMs can delete articles" ON public.articles FOR DELETE
  USING (public.is_world_gm(world_id));

-- ARTICLE VERSIONS
CREATE POLICY "Members can read article versions" ON public.article_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id
        AND public.is_world_member(a.world_id)
        AND (a.visibility = 'players' OR public.is_world_gm(a.world_id))
    )
  );
CREATE POLICY "Editors can create versions" ON public.article_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id AND public.can_edit_world(a.world_id)
    )
  );

-- ARTICLE LINKS
CREATE POLICY "Members can read article links" ON public.article_links FOR SELECT
  USING (public.is_world_member(world_id));
CREATE POLICY "Editors can manage article links" ON public.article_links FOR ALL
  USING (public.can_edit_world(world_id));

-- TAGS
CREATE POLICY "Members can read tags" ON public.tags FOR SELECT
  USING (public.is_world_member(world_id));
CREATE POLICY "Editors can manage tags" ON public.tags FOR ALL
  USING (public.can_edit_world(world_id));

-- ARTICLE TAGS
CREATE POLICY "Members can read article tags" ON public.article_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a WHERE a.id = article_id AND public.is_world_member(a.world_id)
    )
  );
CREATE POLICY "Editors can manage article tags" ON public.article_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a WHERE a.id = article_id AND public.can_edit_world(a.world_id)
    )
  );

-- SESSIONS
CREATE POLICY "Members can read player sessions" ON public.sessions FOR SELECT
  USING (
    public.is_world_member(world_id)
    AND (visibility = 'players' OR public.is_world_gm(world_id))
  );
CREATE POLICY "Editors can manage sessions" ON public.sessions FOR ALL
  USING (public.can_edit_world(world_id));

-- CHARACTERS
CREATE POLICY "Members can read player characters" ON public.characters FOR SELECT
  USING (
    public.is_world_member(world_id)
    AND (visibility = 'players' OR public.is_world_gm(world_id))
  );
CREATE POLICY "Editors can manage characters" ON public.characters FOR ALL
  USING (public.can_edit_world(world_id));

-- RELATIONSHIPS
CREATE POLICY "Members can read relationships" ON public.relationships FOR SELECT
  USING (
    public.is_world_member(world_id)
    AND (visibility = 'players' OR public.is_world_gm(world_id))
  );
CREATE POLICY "Editors can manage relationships" ON public.relationships FOR ALL
  USING (public.can_edit_world(world_id));

-- TIMELINES
CREATE POLICY "Members can read timelines" ON public.timelines FOR SELECT
  USING (public.is_world_member(world_id));
CREATE POLICY "Editors can manage timelines" ON public.timelines FOR ALL
  USING (public.can_edit_world(world_id));

-- TIMELINE EVENTS
CREATE POLICY "Members can read timeline events" ON public.timeline_events FOR SELECT
  USING (
    public.is_world_member(world_id)
    AND (visibility = 'players' OR public.is_world_gm(world_id))
  );
CREATE POLICY "Editors can manage timeline events" ON public.timeline_events FOR ALL
  USING (public.can_edit_world(world_id));

-- MAPS
CREATE POLICY "Members can read maps" ON public.maps FOR SELECT
  USING (
    public.is_world_member(world_id)
    AND (visibility = 'players' OR public.is_world_gm(world_id))
  );
CREATE POLICY "Editors can manage maps" ON public.maps FOR ALL
  USING (public.can_edit_world(world_id));

-- MAP PINS
CREATE POLICY "Members can read pins" ON public.map_pins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maps m
      WHERE m.id = map_id
        AND public.is_world_member(m.world_id)
        AND (map_pins.visibility = 'players' OR public.is_world_gm(m.world_id))
    )
  );
CREATE POLICY "Editors can manage pins" ON public.map_pins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.maps m WHERE m.id = map_id AND public.can_edit_world(m.world_id)
    )
  );

-- ASSETS
CREATE POLICY "Members can read assets" ON public.assets FOR SELECT
  USING (
    public.is_world_member(world_id)
    AND (visibility = 'players' OR public.is_world_gm(world_id))
  );
CREATE POLICY "Editors can manage assets" ON public.assets FOR ALL
  USING (public.can_edit_world(world_id));

-- ============================================================
-- STORAGE SETUP (run these separately or note them)
-- ============================================================
-- In Supabase Dashboard > Storage > New Bucket:
-- Name: assets
-- Public: TRUE (so images can be embedded in articles)
--
-- Storage RLS (Supabase Dashboard > Storage > Policies):
-- Or via SQL:

INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated members to upload
CREATE POLICY "Members can upload assets" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND auth.uid() IS NOT NULL
  );

-- Allow public to read (since bucket is public)
CREATE POLICY "Public can read assets" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'assets');

-- Allow owners to delete their uploads
CREATE POLICY "Owners can delete assets" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'assets' AND auth.uid() = owner);

-- ============================================================
-- SEED DATA (optional – creates a "DSA 7G" world)
-- ============================================================
-- After signup, run this to seed a world. Replace 'YOUR-USER-UUID' with your user ID.
-- You can find your user ID in Supabase Dashboard > Authentication > Users
--
-- INSERT INTO public.worlds (id, name, description, owner_id)
-- VALUES (
--   gen_random_uuid(),
--   'DSA – Sieben Gezeichnete',
--   'Eine Kampagne im Aventurien-Setting. Sieben Helden, ein Schicksal.',
--   'YOUR-USER-UUID'
-- );
--
-- -- Then add yourself as GM:
-- INSERT INTO public.world_members (world_id, user_id, role, status)
-- VALUES ((SELECT id FROM worlds WHERE name = 'DSA – Sieben Gezeichnete'), 'YOUR-USER-UUID', 'gm', 'active');
