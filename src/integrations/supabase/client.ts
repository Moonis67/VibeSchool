import { createClient } from '@supabase/supabase-js';

// IMPORTANT: We use import.meta.env for Vite projects
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing public Supabase configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
