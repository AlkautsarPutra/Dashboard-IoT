import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'

console.log('Supabase URL:', supabaseUrl) // Debug log

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
