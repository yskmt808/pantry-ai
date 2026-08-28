-- 9. item_batches: 賞味期限別・購入ロット別の在庫内訳
CREATE TABLE IF NOT EXISTS public.item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    expiry_date DATE,
    opened_at DATE,
    purchased_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for batch query performance and FIFO sorting
CREATE INDEX IF NOT EXISTS idx_item_batches_item_id ON public.item_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_item_batches_expiry ON public.item_batches(item_id, expiry_date ASC NULLS LAST);

-- Enable RLS
ALTER TABLE public.item_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for item_batches
CREATE POLICY "Users can view batches of household items"
    ON public.item_batches FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_batches.item_id AND items.household_id = public.get_current_user_household_id()
    ));

CREATE POLICY "Users can insert batches to household items"
    ON public.item_batches FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_batches.item_id AND items.household_id = public.get_current_user_household_id()
    ));

CREATE POLICY "Users can update batches of household items"
    ON public.item_batches FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_batches.item_id AND items.household_id = public.get_current_user_household_id()
    ));

CREATE POLICY "Users can delete batches of household items"
    ON public.item_batches FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_batches.item_id AND items.household_id = public.get_current_user_household_id()
    ));
