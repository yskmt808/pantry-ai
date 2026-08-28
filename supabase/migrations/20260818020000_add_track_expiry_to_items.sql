-- Add track_expiry to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN NOT NULL DEFAULT true;

-- Update photo_analyses or items comments if needed
COMMENT ON COLUMN public.items.track_expiry IS '賞味期限を管理するかどうか（falseの場合は購入日ベースの管理）';
