-- Add package_quantity to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS package_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (package_quantity > 0);

COMMENT ON COLUMN public.items.package_quantity IS '購入・買い足し時のデフォルトロット数量（例: 卵1パック=10個、ビール1セット=6缶等）';
