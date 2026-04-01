// init-core.js
// МГНОВЕННАЯ ИНИЦИАЛИЗАЦИЯ ГЛОБАЛЬНОГО ОБЪЕКТА
window.Core = {
    sb: (window.supabase) ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null,
    user: null
};

console.log("%c[SYSTEM] Core Foundation Established", "color: #0ff; font-weight: bold;");