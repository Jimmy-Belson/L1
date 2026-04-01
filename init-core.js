// init-core.js
const createCore = () => {
    // Ждем, пока библиотека загрузится в window.supabase
    const sbClient = (window.supabase) ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null;

    window.Core = {
        sb: sbClient,
        user: null,
        // Добавляем заглушку для функции обновления, чтобы игра не падала
        UpdateCombatScore: async (score) => {
            console.log("Saving score...", score);
        }
    };
    console.log("%c[SYSTEM] Core Foundation Established", "color: #0ff; font-weight: bold;");
};

createCore();