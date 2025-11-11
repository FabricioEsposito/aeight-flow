-- Adicionar role de admin para o usuário existente
-- Email: fabricio@aeight.global

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '8eb4a615-395d-41c7-9996-d2384166836a';