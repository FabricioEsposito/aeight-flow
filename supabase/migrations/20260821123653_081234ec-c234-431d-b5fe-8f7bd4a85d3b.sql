SELECT cron.alter_job(14, active := false);
SELECT cron.alter_job(15, active := false);
SELECT cron.alter_job(16, active := false);

SELECT cron.schedule(
  'reativar-cobrancas-24-08-2026',
  '0 9 24 8 *',
  $$
    SELECT cron.alter_job(14, active := true);
    SELECT cron.alter_job(15, active := true);
    SELECT cron.alter_job(16, active := true);
    SELECT cron.unschedule('reativar-cobrancas-24-08-2026');
  $$
);