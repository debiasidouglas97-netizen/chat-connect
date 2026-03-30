
-- Fix: set tenant_id on telegram_contacts based on matched lideranca
UPDATE public.telegram_contacts tc
SET tenant_id = l.tenant_id
FROM public.liderancas l
WHERE tc.lideranca_name = l.name
  AND l.tenant_id IS NOT NULL
  AND tc.tenant_id IS NULL;

-- Also try matching by username
UPDATE public.telegram_contacts tc
SET tenant_id = l.tenant_id
FROM public.liderancas l
WHERE LOWER(REPLACE(tc.username, '@', '')) = LOWER(REPLACE(l.telegram_username, '@', ''))
  AND l.tenant_id IS NOT NULL
  AND tc.tenant_id IS NULL;

-- Remove orphan lideranca without tenant_id (duplicate)
DELETE FROM public.liderancas 
WHERE name = 'Douglas de Biasi' 
  AND tenant_id IS NULL;
