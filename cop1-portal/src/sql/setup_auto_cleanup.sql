-- ============================================================
-- AUTOMATED CLEANUP: DATA RETENTION POLICY (1 YEAR)
-- ============================================================
-- This script sets up an automatic job to delete conversations
-- that have been inactive for more than 1 year.

-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION delete_old_tickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete tickets inactive for >1 year
  -- Note: If foreign keys are set with ON DELETE CASCADE, messages will be deleted automatically.
  -- otherwise, we might need to delete messages first. We assume standard cascade or manual cleanup.
  
  -- Method: Delete tickets. 
  -- We include 'deleted' status ones too if they are old enough.
  DELETE FROM public.tickets
  WHERE last_message_at < (NOW() - INTERVAL '1 year');
  
  -- Optional: Log execution (if you have a logs table, otherwise ignored)
  -- RAISE NOTICE 'Cleaned up old tickets at %', NOW();
END;
$$;

-- 2. Schedule the job using pg_cron (if available)
-- The 'DO' block checks if the extension exists before trying to schedule.

DO $$
BEGIN
  -- Check if pg_cron extension is installed and available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unscheduling if it exists to avoid duplicates
    PERFORM cron.unschedule('cleanup_old_tickets_job');
    
    -- Schedule every day at 03:00 AM (GMT)
    PERFORM cron.schedule(
      'cleanup_old_tickets_job', -- Job name
      '0 3 * * *',               -- Cron schedule (03:00 daily)
      'SELECT delete_old_tickets()'
    );
    
    RAISE NOTICE 'Job scheduled successfully: cleanup_old_tickets_job';
  ELSE
    RAISE NOTICE 'pg_cron extension not found. You can run "SELECT delete_old_tickets();" manually.';
  END IF;
END;
$$;

-- 3. Comments
COMMENT ON FUNCTION delete_old_tickets IS 'Supprime les tickets inactifs depuis plus d''un an pour libérer de l''espace.';
