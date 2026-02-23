-- Supabase Row-Level Security (RLS) Policy Definitions
-- Execute these SQL statements in your Supabase SQL Editor
-- This ensures data access control is enforced at the database level

-- ============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_account ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ORDERS TABLE POLICIES
-- ============================================================================

-- Allow anyone to INSERT orders (public order placement)
-- Note: Price validation happens at API layer (src/app/api/orders/route.ts)
CREATE POLICY "allow_public_create_orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Prevent public from reading/updating orders
CREATE POLICY "deny_public_read_orders"
ON public.orders
FOR SELECT
TO anon
USING (false);

-- Allow authenticated users (via dashboard API) to read all orders
CREATE POLICY "authenticated_read_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  -- Authenticated through API layer, not direct Supabase auth
  true
);

-- Allow service role (API with service key) full access
-- Service role key bypasses RLS anyway, but we keep this explicit
CREATE POLICY "admin_orders_full_access"
ON public.orders
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. ORDER_HISTORY TABLE POLICIES
-- ============================================================================

-- Prevent public access
CREATE POLICY "deny_public_order_history"
ON public.order_history
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Allow authenticated access (admin only)
CREATE POLICY "admin_order_history_access"
ON public.order_history
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. BANK_ACCOUNT TABLE POLICIES  
-- ============================================================================

-- Critical: No public or anonymous access
CREATE POLICY "deny_public_bank_account"
ON public.bank_account
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only authenticated/admin access for bank details
CREATE POLICY "admin_bank_account_read"
ON public.bank_account
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admin_bank_account_write"
ON public.bank_account
FOR INSERT, UPDATE, DELETE
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- 5. MENU_ITEMS TABLE POLICIES
-- ============================================================================

-- Public read access for published items (for menu browsing)
CREATE POLICY "public_read_published_items"
ON public.menu_items
FOR SELECT
TO anon
USING (is_published = true);

-- Prevent public from modifying menu
CREATE POLICY "deny_public_modify_menu"
ON public.menu_items
FOR INSERT, UPDATE, DELETE
TO anon
WITH CHECK (false);

-- Admin modification access
CREATE POLICY "admin_modify_menu"
ON public.menu_items
FOR INSERT, UPDATE, DELETE
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- 6. PHOTOS TABLE POLICIES
-- ============================================================================

-- Public read access for published photos
CREATE POLICY "public_read_published_photos"
ON public.photos
FOR SELECT
TO anon
USING (is_published = true);

-- Prevent public from modifying photos
CREATE POLICY "deny_public_modify_photos"
ON public.photos
FOR INSERT, UPDATE, DELETE
TO anon
WITH CHECK (false);

-- Admin modification access
CREATE POLICY "admin_modify_photos"
ON public.photos
FOR INSERT, UPDATE, DELETE
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- 7. RESERVATIONS TABLE POLICIES
-- ============================================================================

-- Allow public to create reservations
CREATE POLICY "public_create_reservations"
ON public.reservations
FOR INSERT
TO anon
WITH CHECK (true);

-- Prevent public from reading/modifying reservations
CREATE POLICY "deny_public_read_reservations"
ON public.reservations
FOR SELECT
TO anon
USING (false);

-- Admin access for reservations
CREATE POLICY "admin_reservations_access"
ON public.reservations
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 8. BUSINESS_DAYS TABLE POLICIES
-- ============================================================================

-- Public read access (for checking if restaurant is open)
CREATE POLICY "public_read_business_days"
ON public.business_days
FOR SELECT
TO anon
USING (true);

-- Prevent public from modifying business days
CREATE POLICY "deny_public_modify_business_days"
ON public.business_days
FOR INSERT, UPDATE, DELETE
TO anon
WITH CHECK (false);

-- Admin modification access
CREATE POLICY "admin_modify_business_days"
ON public.business_days
FOR INSERT, UPDATE, DELETE
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('orders', 'order_history', 'reservations', 'business_days', 'menu_items', 'photos', 'bank_account')
ORDER BY tablename;

-- Show all policies
SELECT table_name, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schema_name = 'public'
ORDER BY table_name, policyname;
