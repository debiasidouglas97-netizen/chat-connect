
-- 1. role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role, module)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant_role ON public.role_permissions(tenant_id, role);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone in tenant reads
CREATE POLICY "Tenant members can read role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Only admins manage
CREATE POLICY "Admins manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'deputado'::public.app_role)
    OR public.has_role(auth.uid(), 'chefe_gabinete'::public.app_role)
  )
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'deputado'::public.app_role)
    OR public.has_role(auth.uid(), 'chefe_gabinete'::public.app_role)
  )
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_role_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.tg_role_permissions_updated_at();

-- 2. has_permission helper (security definer)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
  _role public.app_role;
  _row public.role_permissions%ROWTYPE;
BEGIN
  -- Admin (deputado/chefe_gabinete) and super_admin: full access
  IF public.has_role(_user_id, 'deputado'::public.app_role)
     OR public.has_role(_user_id, 'chefe_gabinete'::public.app_role)
     OR public.has_role(_user_id, 'super_admin'::public.app_role) THEN
    RETURN true;
  END IF;

  SELECT tenant_id, role INTO _tenant, _role
  FROM public.profiles WHERE id = _user_id LIMIT 1;

  IF _tenant IS NULL OR _role IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO _row
  FROM public.role_permissions
  WHERE tenant_id = _tenant AND role = _role AND module = _module
  LIMIT 1;

  IF NOT FOUND THEN
    -- No row configured: fall back to safe defaults
    -- secretario: view+create+edit; lideranca: view-only (eleitores handled by its own RLS)
    IF _role = 'secretario'::public.app_role THEN
      RETURN _action IN ('view','create','edit');
    ELSIF _role = 'lideranca'::public.app_role THEN
      RETURN _action = 'view';
    END IF;
    RETURN false;
  END IF;

  RETURN CASE _action
    WHEN 'view' THEN _row.can_view
    WHEN 'create' THEN _row.can_create
    WHEN 'edit' THEN _row.can_edit
    WHEN 'delete' THEN _row.can_delete
    ELSE false
  END;
END;
$$;

-- 3. Tighten RLS on liderancas, demandas, emendas, eventos to respect matrix
-- liderancas
DROP POLICY IF EXISTS "Anyone can delete liderancas" ON public.liderancas;
DROP POLICY IF EXISTS "Anyone can insert liderancas" ON public.liderancas;
DROP POLICY IF EXISTS "Anyone can update liderancas" ON public.liderancas;
DROP POLICY IF EXISTS "Anyone can read liderancas" ON public.liderancas;

CREATE POLICY "Tenant members read liderancas"
ON public.liderancas FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_permission(auth.uid(), 'liderancas', 'view')
);

CREATE POLICY "Insert liderancas by permission"
ON public.liderancas FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_permission(auth.uid(), 'liderancas', 'create')
);

CREATE POLICY "Update liderancas by permission"
ON public.liderancas FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_permission(auth.uid(), 'liderancas', 'edit')
);

CREATE POLICY "Delete liderancas by permission"
ON public.liderancas FOR DELETE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_permission(auth.uid(), 'liderancas', 'delete')
);

-- demandas
DROP POLICY IF EXISTS "Anyone can delete demandas" ON public.demandas;
DROP POLICY IF EXISTS "Anyone can insert demandas" ON public.demandas;
DROP POLICY IF EXISTS "Anyone can update demandas" ON public.demandas;
DROP POLICY IF EXISTS "Anyone can read demandas" ON public.demandas;

CREATE POLICY "Tenant members read demandas"
ON public.demandas FOR SELECT TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'demandas', 'view')
);

-- Allow public/service inserts (telegram bot etc.) AND authenticated by permission
CREATE POLICY "Service inserts demandas"
ON public.demandas FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Update demandas by permission"
ON public.demandas FOR UPDATE TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'demandas', 'edit')
);

CREATE POLICY "Delete demandas by permission"
ON public.demandas FOR DELETE TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'demandas', 'delete')
);

-- Service can still read for edge functions
CREATE POLICY "Public read demandas (service/bot)"
ON public.demandas FOR SELECT TO public
USING (true);

-- emendas
DROP POLICY IF EXISTS "Anyone can delete emendas" ON public.emendas;
DROP POLICY IF EXISTS "Anyone can insert emendas" ON public.emendas;
DROP POLICY IF EXISTS "Anyone can update emendas" ON public.emendas;
DROP POLICY IF EXISTS "Anyone can read emendas" ON public.emendas;

CREATE POLICY "Tenant members read emendas"
ON public.emendas FOR SELECT TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'emendas', 'view')
);

CREATE POLICY "Insert emendas by permission"
ON public.emendas FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_permission(auth.uid(), 'emendas', 'create')
);

CREATE POLICY "Update emendas by permission"
ON public.emendas FOR UPDATE TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'emendas', 'edit')
);

CREATE POLICY "Delete emendas by permission"
ON public.emendas FOR DELETE TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'emendas', 'delete')
);

CREATE POLICY "Public read emendas (service)"
ON public.emendas FOR SELECT TO public USING (true);

-- eventos
DROP POLICY IF EXISTS "Anyone can delete eventos" ON public.eventos;
DROP POLICY IF EXISTS "Anyone can insert eventos" ON public.eventos;
DROP POLICY IF EXISTS "Anyone can update eventos" ON public.eventos;
DROP POLICY IF EXISTS "Anyone can read eventos" ON public.eventos;

CREATE POLICY "Tenant members read eventos"
ON public.eventos FOR SELECT TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'agenda', 'view')
);

CREATE POLICY "Insert eventos by permission"
ON public.eventos FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_permission(auth.uid(), 'agenda', 'create')
);

CREATE POLICY "Update eventos by permission"
ON public.eventos FOR UPDATE TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'agenda', 'edit')
);

CREATE POLICY "Delete eventos by permission"
ON public.eventos FOR DELETE TO authenticated
USING (
  (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  AND public.has_permission(auth.uid(), 'agenda', 'delete')
);

CREATE POLICY "Public read eventos (service)"
ON public.eventos FOR SELECT TO public USING (true);

-- eleitores: tighten DELETE to use permission matrix
DROP POLICY IF EXISTS "Delete eleitores admin only" ON public.eleitores;
CREATE POLICY "Delete eleitores by permission"
ON public.eleitores FOR DELETE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_permission(auth.uid(), 'eleitores', 'delete')
);
