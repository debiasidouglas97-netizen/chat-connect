
-- Reset password for test user (test environment)
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '3678e645-4ee4-458a-b867-d400cde142bd';
