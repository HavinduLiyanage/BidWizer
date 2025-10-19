import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { readEnvVar } from '@/lib/env'

export function createSupabaseServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase service clients must only be created on the server')
  }

  const supabaseUrl = readEnvVar('SUPABASE_URL')
  const supabaseServiceRoleKey = readEnvVar('SUPABASE_SERVICE_ROLE')

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
}
