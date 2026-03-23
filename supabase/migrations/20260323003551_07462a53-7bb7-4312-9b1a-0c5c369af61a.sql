
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('deputado', 'chefe_gabinete', 'secretario', 'lideranca');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'lideranca',
  lideranca_id UUID REFERENCES public.liderancas(id) ON DELETE SET NULL,
  avatar_url TEXT,
  cities TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate as per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'deputado') OR
    public.has_role(auth.uid(), 'chefe_gabinete') OR
    auth.uid() = id
  );

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'deputado') OR
    public.has_role(auth.uid(), 'chefe_gabinete')
  );

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'deputado') OR
    public.has_role(auth.uid(), 'chefe_gabinete') OR
    auth.uid() = id
  );

-- RLS policies for user_roles
CREATE POLICY "Admins can read roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'deputado') OR
    public.has_role(auth.uid(), 'chefe_gabinete') OR
    auth.uid() = user_id
  );

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'deputado') OR
    public.has_role(auth.uid(), 'chefe_gabinete')
  );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also allow public read for initial setup (first user scenario)
CREATE POLICY "Public can read profiles for setup" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Public can insert profiles for setup" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update profiles for setup" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "Public can read roles for setup" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "Public can insert roles for setup" ON public.user_roles
  FOR INSERT WITH CHECK (true);
