/**
 * ORBITRON CORE - VOICE INITIALIZER (Final Stable Version)
 */
(function() {
    // 1. Создаем функцию в глобальном пространстве, чтобы её никто не стер
    window.GlobalVoiceInit = function() {
        // Проверяем зависимости
        const sb = window.Core?.sb || window.supabaseClient;
        const user = window.Core?.user;

        if (!sb || !user) {
            console.warn("[VOICE] Waiting for Core/User to be ready...");
            return false; 
        }

        const myId = String(user.id).toLowerCase().trim();
        
        // Очистка старых каналов перед запуском нового
        sb.removeAllChannels();

        console.log("%c[VOICE] SIGNAL LISTENER DEPLOYED:", "color: #0ff; font-weight: bold;", myId);

        const voiceChannel = sb.channel('voice-broadcast')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'calls'
            }, async (payload) => {
                const call = payload.new;
                if (!call) return;

                const targetId = String(call.receiver_id).toLowerCase().trim();
                
                // Проверка: звонят ли именно мне?
                if (targetId === myId && call.status === 'pending') {
                    console.log("%c[INCOMING] VOICE SIGNAL DETECTED!", "color: #f0f; border: 1px solid #f0f; padding: 5px;");
                    
                    // Используем фоллбек: если VoiceModule еще грузится, подождем его
                    const triggerCall = async () => {
                        if (window.VoiceModule) {
                            let accept = window.confirm("INCOMING VOICE SIGNAL. ESTABLISH LINK?");
                            if (accept) {
                                window.VoiceModule.acceptCall(call);
                            } else {
                                await sb.from('calls').update({ status: 'ended' }).eq('id', call.id);
                            }
                        } else {
                            console.log("Waiting for VoiceModule...");
                            setTimeout(triggerCall, 500);
                        }
                    };
                    triggerCall();
                }
            });

        voiceChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') console.log("[VOICE] Realtime Channel: ONLINE");
        });

        return true;
    };

    // 2. Инициализация Supabase клиента (если еще нет)
    if (!window.supabaseClient) {
        window.supabaseClient = window.supabase.createClient(
            'https://ebjsxlympwocluxgmwcu.supabase.co', 
            'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
        );
    }

    // 3. Автозапуск с защитой от перезаписи
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            // Создаем Core если его нет, но НЕ перезаписываем его, если он уже есть
            window.Core = window.Core || {};
            window.Core.user = session.user;
            window.Core.sb = window.supabaseClient;

            // Цикл "умного запуска" - пробуем запуститься, пока не получится
            const attemptInit = () => {
                const success = window.GlobalVoiceInit();
                if (!success) setTimeout(attemptInit, 1000);
            };
            attemptInit();
        }
    });

    console.log("%c[SYSTEM] Voice Core Initialized", "color: #55ff55");
})();