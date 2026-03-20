
-- Deputy profile table
CREATE TABLE public.deputy_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  public_name text,
  party text NOT NULL,
  state text NOT NULL,
  regions text[] DEFAULT '{}',
  priority_cities text[] DEFAULT '{}',
  focus_areas text[] DEFAULT '{}',
  bio text,
  institutional_message text,
  avatar_url text,
  logo_url text,
  primary_color text DEFAULT '#2d5a3d',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deputy_profile ENABLE ROW LEVEL SECURITY;

-- Allow public read (no auth yet in this project)
CREATE POLICY "Anyone can read deputy profile" ON public.deputy_profile FOR SELECT USING (true);
CREATE POLICY "Anyone can insert deputy profile" ON public.deputy_profile FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update deputy profile" ON public.deputy_profile FOR UPDATE USING (true);

-- Storage bucket for avatar
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage RLS
CREATE POLICY "Anyone can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Anyone can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');
