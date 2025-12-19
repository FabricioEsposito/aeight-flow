-- Remove o cron job antigo
SELECT cron.unschedule(1);

-- Criar 3 cron jobs para os horários corretos (11h, 15h, 17h no horário de Brasília = 14h, 18h, 20h UTC)
SELECT cron.schedule(
  'send-collection-emails-11h',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://epgifclglrrgzpguqbde.supabase.co/functions/v1/send-collection-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2lmY2xnbHJyZ3pwZ3VxYmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNjI2MzMsImV4cCI6MjA3MjkzODYzM30.q4EGEYrHOOH-mmHL-3PvJNOw9gz8a0Fm0no44qQ61dI"}'::jsonb,
    body := '{"all": true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'send-collection-emails-15h',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://epgifclglrrgzpguqbde.supabase.co/functions/v1/send-collection-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2lmY2xnbHJyZ3pwZ3VxYmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNjI2MzMsImV4cCI6MjA3MjkzODYzM30.q4EGEYrHOOH-mmHL-3PvJNOw9gz8a0Fm0no44qQ61dI"}'::jsonb,
    body := '{"all": true}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'send-collection-emails-17h',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://epgifclglrrgzpguqbde.supabase.co/functions/v1/send-collection-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2lmY2xnbHJyZ3pwZ3VxYmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNjI2MzMsImV4cCI6MjA3MjkzODYzM30.q4EGEYrHOOH-mmHL-3PvJNOw9gz8a0Fm0no44qQ61dI"}'::jsonb,
    body := '{"all": true}'::jsonb
  ) AS request_id;
  $$
);