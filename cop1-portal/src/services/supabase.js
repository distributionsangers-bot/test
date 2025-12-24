import { createClient } from '@supabase/supabase-js'

// Vite charge automatiquement les variables qui commencent par VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ ERREUR CRITIQUE : Les clés Supabase sont manquantes dans le fichier .env")
}

export const supabase = createClient(supabaseUrl, supabaseKey)