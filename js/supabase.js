// js/supabase.js
export const supabase = (window.supabase) ? window.supabase.createClient(
    'https://ebjsxlympwocluxgmwcu.supabase.co', 
    'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
) : null;