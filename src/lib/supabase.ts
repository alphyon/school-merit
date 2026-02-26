import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Faltan las variables de entorno de Supabase en app/.env")
  console.info("Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas.")
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)
