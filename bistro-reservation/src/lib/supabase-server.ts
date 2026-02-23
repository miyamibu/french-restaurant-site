import { createClient } from '@supabase/supabase-js'

/**
 * Supabase server client for server-side operations (API routes, scheduled tasks, etc.)
 * Uses SERVICE_ROLE_KEY - Bypasses RLS, use with caution and strict authentication
 * 
 * IMPORTANT: Only use this on server-side. Never expose SERVICE_ROLE_KEY to client.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
