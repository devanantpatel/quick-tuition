import { createClient } from '@supabase/supabase-js';

// Real Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rjieagewjuulnkxrrnny.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaWVhZ2V3anV1bG5reHJybm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MDc5MDksImV4cCI6MjEwNzQ4MzkwOX0.JyyOODDI0m3V4Ia4_y-6uK2-aSnvG2abjIVawA3Gb-o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);