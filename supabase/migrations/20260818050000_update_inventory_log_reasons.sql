-- Ensure inventory_logs reason includes consumption, waste, correction, purchase
DO $$
BEGIN
  -- If constraint exists, drop and re-create to support all reasons
  ALTER TABLE public.inventory_logs
  DROP CONSTRAINT IF EXISTS inventory_logs_reason_check;

  ALTER TABLE public.inventory_logs
  ADD CONSTRAINT inventory_logs_reason_check
  CHECK (reason IN ('purchase', 'consumption', 'waste', 'correction', 'adjustment'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
