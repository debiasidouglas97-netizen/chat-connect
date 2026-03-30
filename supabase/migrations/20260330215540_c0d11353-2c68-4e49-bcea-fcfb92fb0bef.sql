
UPDATE public.profiles 
SET tenant_id = 'b261fd81-9af8-46a3-91df-e57882508c0a', role = 'deputado'
WHERE email = 'douglasdebiasi@gmail.com';

UPDATE public.profiles 
SET tenant_id = 'b261fd81-9af8-46a3-91df-e57882508c0a', role = 'deputado'
WHERE email = 'debiasidouglas97@gmail.com';

UPDATE public.profiles 
SET tenant_id = 'b477b278-157d-4d4f-a576-f3fa660514a6'
WHERE email = 'teste@teste.com' AND tenant_id IS NULL;
