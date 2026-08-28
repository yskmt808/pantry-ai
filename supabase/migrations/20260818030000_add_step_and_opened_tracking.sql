-- Add consumption_step, track_opened, opened_shelf_life_days to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS consumption_step NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (consumption_step > 0),
ADD COLUMN IF NOT EXISTS track_opened BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS opened_shelf_life_days INTEGER;

COMMENT ON COLUMN public.items.consumption_step IS 'クイック消費・増減の単位（例: 1, 0.5, 0.25等）';
COMMENT ON COLUMN public.items.track_opened IS '開封日の管理を重視するかどうか';
COMMENT ON COLUMN public.items.opened_shelf_life_days IS '開封後の消費目安日数（例: 30日、60日等）';
