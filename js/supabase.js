
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://ebjsxlympwocluxgmwcu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVianN4bHltcHdvY2x1eGdtd2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDI0MjYsImV4cCI6MjA4NzA3ODQyNn0.nm3OG4VxWClTV1UZz7veIRMLeShAczPP6utSIrIrzyI'; // Твой ПОЛНЫЙ ANON KEY

// Создаем ОДИН экземпляр и экспортируем его
export const supabase = createClient(supabaseUrl, supabaseKey);