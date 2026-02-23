import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for browser/client-side operations
 * Uses NEXT_PUBLIC_* keys (anon key) - Protected by RLS in Supabase
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
