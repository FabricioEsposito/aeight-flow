
SELECT cron.alter_job(job_id := 3::bigint, active := false);
SELECT cron.alter_job(job_id := 4::bigint, active := false);
SELECT cron.alter_job(job_id := 5::bigint, active := false);

SELECT cron.schedule(
  'reactivate-collection-emails',
  '5 0 14 5 *',
  $$
  SELECT cron.alter_job(job_id := 3::bigint, active := true);
  SELECT cron.alter_job(job_id := 4::bigint, active := true);
  SELECT cron.alter_job(job_id := 5::bigint, active := true);
  SELECT cron.unschedule('reactivate-collection-emails');
  $$
);
