
-- Fix existing demanda_attachments with null tenant_id
UPDATE demanda_attachments da
SET tenant_id = d.tenant_id
FROM demandas d
WHERE da.demanda_id = d.id AND da.tenant_id IS NULL;

-- Fix existing emenda_attachments with null tenant_id
UPDATE emenda_attachments ea
SET tenant_id = e.tenant_id
FROM emendas e
WHERE ea.emenda_id = e.id AND ea.tenant_id IS NULL;
