/**
 * ORBITRON CORE - INVISIBLE VOICE PROTECTOR
 */
(function() {
    const DEPLOY_LOG = "%c[VOICE] SIGNAL LISTENER ACTIVE";
    const LOG_STYLE = "color: #0ff; font-weight: bold; background: #002222; padding: 3px 10px; border-radius: 5px;";

    window.GlobalVoiceInit = function() {
        const sb = window.Core?.sb || window.supabaseClient;
        const user = window.Core?.user;

        if (!sb || !user) return false;

        const myId = String(user.id).toLowerCase().trim();
        sb.removeAllChannels();

        console.log(DEPLOY_LOG, LOG_STYLE, myId);

        sb.channel('voice-broadcast')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, 
            async (payload) => {
                const call = payload.new;
                if (String(call.receiver_id).toLowerCase().trim() === myId && call.status === 'pending') {
                    // Ждем VoiceModule, если он еще грузится
                    const checkModule = () => {
                        if (window.VoiceModule) {
                            if (window.confirm("INCOMING VOICE SIGNAL. ACCEPT?")) {
                                window.VoiceModule.acceptCall(call);
                            }
                        } else { setTimeout(checkModule, 500); }
                    };
                    checkModule();
                }
            }).subscribe();

        return true;
    };

    // Создаем клиент, если его нет
    if (!window.supabaseClient) {
        window.supabaseClient = window.supabase.createClient(
            'https://ebjsxlympwocluxgmwcu.supabase.co', 
            'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
        );
    }

    // Следим за объектом Core. Если его перезапишут — восстанавливаем функцию.
    const protectCore = () => {
        window.Core = window.Core || {};
        if (!window.Core.InitVoiceListener) {
            window.Core.InitVoiceListener = window.GlobalVoiceInit;
            
            // Если юзер уже есть в Core, запускаем слушателя
            if (window.Core.user) window.GlobalVoiceInit();
        }
    };

    // Запускаем защиту каждые 2 секунды (на всякий случай)
    setInterval(protectCore, 2000);

    // Автозапуск при логине через Supabase
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            window.Core = window.Core || {};
            window.Core.user = session.user;
            window.Core.sb = window.supabaseClient;
            protectCore();
        }
    });

    console.log("%c[SYSTEM] Voice Protection Shield: ENGAGED", "color: #55ff55");
})();