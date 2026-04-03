CREATE POLICY "Tenant members can update own tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (id = get_user_tenant_id(auth.uid()))
WITH CHECK (id = get_user_tenant_id(auth.uid()));