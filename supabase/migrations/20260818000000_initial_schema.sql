-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. households: 家族グループ
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. users: 家族メンバープロファイル（auth.users と連携）
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. items: 在庫物品
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    location TEXT NOT NULL DEFAULT 'refrigerator' CHECK (location IN ('refrigerator', 'freezer', 'vegetable_room', 'pantry', 'other')),
    current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT '個',
    min_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. item_procurement_channels: 調達ルート（実店舗・ネット・定期便）
CREATE TABLE IF NOT EXISTS public.item_procurement_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('physical_store', 'online', 'subscription')),
    provider_name TEXT NOT NULL,
    url TEXT,
    unit_price NUMERIC(10, 2),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. item_reference_images: AI認識精度向上のためのマスタ登録画像
CREATE TABLE IF NOT EXISTS public.item_reference_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. shopping_list_items: 買い物リスト & 担当者アサイン
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '個',
    is_purchased BOOLEAN NOT NULL DEFAULT false,
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. photo_analyses: 写真解析ログ
CREATE TABLE IF NOT EXISTS public.photo_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    analysis_result JSONB,
    model_used TEXT NOT NULL DEFAULT 'gemini-flash-latest',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. inventory_logs: 在庫増減履歴
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    change_amount NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('manual_adjustment', 'photo_analysis', 'purchase', 'consumption', 'expired', 'other')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_household_id ON public.users(household_id);
CREATE INDEX IF NOT EXISTS idx_items_household_id ON public.items(household_id);
CREATE INDEX IF NOT EXISTS idx_items_location ON public.items(location);
CREATE INDEX IF NOT EXISTS idx_shopping_list_household_id ON public.shopping_list_items(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_is_purchased ON public.shopping_list_items(is_purchased);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_household_id ON public.photo_analyses(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_id ON public.inventory_logs(item_id);

-- Enable RLS on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_procurement_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user's household_id
CREATE OR REPLACE FUNCTION public.get_current_user_household_id()
RETURNS UUID AS $$
    SELECT household_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies

-- households
CREATE POLICY "Users can view their own household"
    ON public.households FOR SELECT
    USING (id = public.get_current_user_household_id());

CREATE POLICY "Users can update their own household"
    ON public.households FOR UPDATE
    USING (id = public.get_current_user_household_id());

-- users
CREATE POLICY "Users can view members in the same household"
    ON public.users FOR SELECT
    USING (household_id = public.get_current_user_household_id() OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid());

-- items
CREATE POLICY "Users can view items in their household"
    ON public.items FOR SELECT
    USING (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can insert items into their household"
    ON public.items FOR INSERT
    WITH CHECK (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can update items in their household"
    ON public.items FOR UPDATE
    USING (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can delete items in their household"
    ON public.items FOR DELETE
    USING (household_id = public.get_current_user_household_id());

-- item_procurement_channels
CREATE POLICY "Users can view channels of household items"
    ON public.item_procurement_channels FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_procurement_channels.item_id AND items.household_id = public.get_current_user_household_id()
    ));

CREATE POLICY "Users can manage channels of household items"
    ON public.item_procurement_channels FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_procurement_channels.item_id AND items.household_id = public.get_current_user_household_id()
    ));

-- item_reference_images
CREATE POLICY "Users can view reference images of household items"
    ON public.item_reference_images FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_reference_images.item_id AND items.household_id = public.get_current_user_household_id()
    ));

CREATE POLICY "Users can manage reference images of household items"
    ON public.item_reference_images FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.items WHERE items.id = item_reference_images.item_id AND items.household_id = public.get_current_user_household_id()
    ));

-- shopping_list_items
CREATE POLICY "Users can view shopping items in their household"
    ON public.shopping_list_items FOR SELECT
    USING (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can insert shopping items into their household"
    ON public.shopping_list_items FOR INSERT
    WITH CHECK (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can update shopping items in their household"
    ON public.shopping_list_items FOR UPDATE
    USING (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can delete shopping items in their household"
    ON public.shopping_list_items FOR DELETE
    USING (household_id = public.get_current_user_household_id());

-- photo_analyses
CREATE POLICY "Users can view photo analyses in their household"
    ON public.photo_analyses FOR SELECT
    USING (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can create photo analyses in their household"
    ON public.photo_analyses FOR INSERT
    WITH CHECK (household_id = public.get_current_user_household_id());

-- inventory_logs
CREATE POLICY "Users can view inventory logs in their household"
    ON public.inventory_logs FOR SELECT
    USING (household_id = public.get_current_user_household_id());

CREATE POLICY "Users can create inventory logs in their household"
    ON public.inventory_logs FOR INSERT
    WITH CHECK (household_id = public.get_current_user_household_id());

-- Trigger: auto-create public.users row on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_household_id UUID;
BEGIN
    -- Create default household for new user
    INSERT INTO public.households (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', '我が家') || 'のパントリー')
    RETURNING id INTO new_household_id;

    -- Create public user profile
    INSERT INTO public.users (id, household_id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        new_household_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'ユーザー'),
        NEW.raw_user_meta_data->>'avatar_url',
        'owner'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
