-- Pausar envios de cobrança somente hoje
SELECT cron.alter_job(3, active := false);
SELECT cron.alter_job(4, active := false);
SELECT cron.alter_job(5, active := false);

-- Reativar automaticamente amanhã (00:05) via job único auto-destrutivo
SELECT cron.schedule(
  'reativar-cobranca-amanha',
  '5 3 * * *', -- 00:05 horário de Brasília (UTC-3) = 03:05 UTC
  $$
  SELECT cron.alter_job(3, active := true);
  SELECT cron.alter_job(4, active := true);
  SELECT cron.alter_job(5, active := true);
  SELECT cron.unschedule('reativar-cobranca-amanha');
  $$
);