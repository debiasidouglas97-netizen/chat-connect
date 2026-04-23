-- 1) Add cpf and username columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS telegram_username text;

-- Unique indexes (nullable allowed but unique when present)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- 2) Helper: get user's linked lideranca_id
CREATE OR REPLACE FUNCTION public.get_user_lideranca_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lideranca_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- 3) Tighten RLS on eleitores: lideranca role only sees own
DROP POLICY IF EXISTS "Tenant users can read eleitores" ON public.eleitores;
DROP POLICY IF EXISTS "Tenant users can insert eleitores" ON public.eleitores;
DROP POLICY IF EXISTS "Tenant users can update eleitores" ON public.eleitores;
DROP POLICY IF EXISTS "Tenant users can delete eleitores" ON public.eleitores;

-- Read: admins/operators see all in tenant; lideranca sees only own linked
CREATE POLICY "Read eleitores by role"
ON public.eleitores
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'deputado'::app_role)
    OR public.has_role(auth.uid(), 'chefe_gabinete'::app_role)
    OR public.has_role(auth.uid(), 'secretario'::app_role)
    OR (
      public.has_role(auth.uid(), 'lideranca'::app_role)
      AND lideranca_id = public.get_user_lideranca_id(auth.uid())
    )
  )
);

-- Insert: admins/operators free; lideranca must set own lideranca_id
CREATE POLICY "Insert eleitores by role"
ON public.eleitores
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'deputado'::app_role)
    OR public.has_role(auth.uid(), 'chefe_gabinete'::app_role)
    OR public.has_role(auth.uid(), 'secretario'::app_role)
    OR (
      public.has_role(auth.uid(), 'lideranca'::app_role)
      AND lideranca_id = public.get_user_lideranca_id(auth.uid())
    )
  )
);

-- Update: same restriction
CREATE POLICY "Update eleitores by role"
ON public.eleitores
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'deputado'::app_role)
    OR public.has_role(auth.uid(), 'chefe_gabinete'::app_role)
    OR public.has_role(auth.uid(), 'secretario'::app_role)
    OR (
      public.has_role(auth.uid(), 'lideranca'::app_role)
      AND lideranca_id = public.get_user_lideranca_id(auth.uid())
    )
  )
);

-- Delete: only admins/operators
CREATE POLICY "Delete eleitores admin only"
ON public.eleitores
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'deputado'::app_role)
    OR public.has_role(auth.uid(), 'chefe_gabinete'::app_role)
    OR public.has_role(auth.uid(), 'secretario'::app_role)
  )
);