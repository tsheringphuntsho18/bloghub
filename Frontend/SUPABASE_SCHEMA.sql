-- ================================================
-- BLOGHUB DATABASE SCHEMA FOR SUPABASE
-- ================================================
-- This schema includes:
-- 1. Posts (with CRUD operations)
-- 2. Categories & Tags
-- 3. Comments (with replies)
-- 4. Claps/Likes system
-- 5. Bookmarks/Saved posts
-- 6. User profiles
-- 7. Full-text search
-- 8. Row Level Security (RLS) policies
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. USER PROFILES TABLE
-- ================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  twitter TEXT,
  github TEXT,
  linkedin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 2. CATEGORIES TABLE
-- ================================================
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default categories
INSERT INTO public.categories (name, slug, description) VALUES
  ('Technology', 'technology', 'Tech-related articles and tutorials'),
  ('Lifestyle', 'lifestyle', 'Life, health, and wellness topics'),
  ('Business', 'business', 'Business and entrepreneurship'),
  ('Travel', 'travel', 'Travel guides and experiences'),
  ('Food', 'food', 'Recipes and food reviews'),
  ('Education', 'education', 'Learning and educational content'),
  ('Entertainment', 'entertainment', 'Movies, music, and entertainment'),
  ('Sports', 'sports', 'Sports news and analysis'),
  ('Science', 'science', 'Scientific discoveries and research'),
  ('Art', 'art', 'Art, design, and creativity');

-- ================================================
-- 3. TAGS TABLE
-- ================================================
CREATE TABLE public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ================================================
-- 4. POSTS TABLE
-- ================================================
CREATE TABLE public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  reading_time INTEGER DEFAULT 0, -- in minutes
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE
);

-- Create index for full-text search
CREATE INDEX posts_title_content_idx ON public.posts USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX posts_user_id_idx ON public.posts(user_id);
CREATE INDEX posts_status_idx ON public.posts(status);
CREATE INDEX posts_published_at_idx ON public.posts(published_at);

-- ================================================
-- 5. POST_CATEGORIES (Many-to-Many)
-- ================================================
CREATE TABLE public.post_categories (
  post_id UUID REFERENCES public.posts ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- ================================================
-- 6. POST_TAGS (Many-to-Many)
-- ================================================
CREATE TABLE public.post_tags (
  post_id UUID REFERENCES public.posts ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ================================================
-- 7. COMMENTS TABLE (with support for replies)
-- ================================================
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.comments ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX comments_post_id_idx ON public.comments(post_id);
CREATE INDEX comments_user_id_idx ON public.comments(user_id);
CREATE INDEX comments_parent_id_idx ON public.comments(parent_id);

-- ================================================
-- 8. CLAPS/LIKES TABLE
-- ================================================
CREATE TABLE public.claps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  count INTEGER DEFAULT 1 CHECK (count >= 1 AND count <= 50), -- Max 50 claps per user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE INDEX claps_post_id_idx ON public.claps(post_id);
CREATE INDEX claps_user_id_idx ON public.claps(user_id);

-- ================================================
-- 9. BOOKMARKS/SAVED POSTS TABLE
-- ================================================
CREATE TABLE public.bookmarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE INDEX bookmarks_post_id_idx ON public.bookmarks(post_id);
CREATE INDEX bookmarks_user_id_idx ON public.bookmarks(user_id);

-- ================================================
-- 10. FOLLOWS TABLE (User following system)
-- ================================================
CREATE TABLE public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX follows_following_id_idx ON public.follows(following_id);

-- ================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES - PROFILES
-- ================================================
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ================================================
-- RLS POLICIES - CATEGORIES & TAGS
-- ================================================
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================
-- RLS POLICIES - POSTS
-- ================================================
CREATE POLICY "Anyone can view published posts"
  ON posts FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- RLS POLICIES - POST CATEGORIES & TAGS
-- ================================================
CREATE POLICY "Anyone can view post categories"
  ON post_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view post tags"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Post owners can manage post categories"
  ON post_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Post owners can manage post tags"
  ON post_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()
  ));

-- ================================================
-- RLS POLICIES - COMMENTS
-- ================================================
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- RLS POLICIES - CLAPS
-- ================================================
CREATE POLICY "Anyone can view claps"
  ON claps FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can clap posts"
  ON claps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claps"
  ON claps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own claps"
  ON claps FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- RLS POLICIES - BOOKMARKS
-- ================================================
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- RLS POLICIES - FOLLOWS
-- ================================================
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claps_updated_at BEFORE UPDATE ON claps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment post views
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET views = views + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get total claps for a post
CREATE OR REPLACE FUNCTION get_post_claps(post_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(count), 0)::INTEGER FROM claps WHERE claps.post_id = $1;
$$ LANGUAGE sql STABLE;

-- Function to get comment count for a post
CREATE OR REPLACE FUNCTION get_post_comments_count(post_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comments WHERE comments.post_id = $1;
$$ LANGUAGE sql STABLE;

-- ================================================
-- VIEWS FOR EASIER QUERYING
-- ================================================

-- View for posts with author info and stats
CREATE OR REPLACE VIEW posts_with_stats AS
SELECT 
  p.*,
  u.email as author_email,
  pr.username as author_username,
  pr.full_name as author_name,
  pr.avatar_url as author_avatar,
  get_post_claps(p.id) as total_claps,
  get_post_comments_count(p.id) as total_comments,
  ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories,
  ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
FROM posts p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN post_categories pc ON p.id = pc.post_id
LEFT JOIN categories c ON pc.category_id = c.id
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id, u.email, pr.username, pr.full_name, pr.avatar_url;

-- ================================================
-- STORAGE BUCKET FOR IMAGES
-- ================================================
-- Run this in Supabase Dashboard > Storage
-- 1. Create a bucket called 'blog-images'
-- 2. Make it public for reading
-- 3. Set up policy for authenticated users to upload

-- ================================================
-- SEARCH FUNCTION
-- ================================================
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  excerpt TEXT,
  slug TEXT,
  cover_image TEXT,
  author_username TEXT,
  author_avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.excerpt,
    p.slug,
    p.cover_image,
    pr.username as author_username,
    pr.avatar_url as author_avatar,
    p.created_at,
    ts_rank(to_tsvector('english', p.title || ' ' || p.content), plainto_tsquery('english', search_query)) as rank
  FROM posts p
  LEFT JOIN profiles pr ON p.user_id = pr.id
  WHERE 
    p.status = 'published' 
    AND to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMPLETE! 
-- ================================================
-- Copy and paste this entire schema into Supabase SQL Editor
-- Click "RUN" to create all tables, policies, and functions
-- ================================================
