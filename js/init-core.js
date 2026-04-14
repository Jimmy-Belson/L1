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

    // --- ЛОГИКА ВХОДЯЩИХ ЗВОНКОВ (WebRTC Signaling) ---
    if (sbClient) {
        sbClient
            .channel('voice-signals')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'calls'
            }, async (payload) => {
                const call = payload.new;
                
                // Проверяем, что звонят именно ТЕБЕ и статус запроса — 'pending'
                if (window.Core.user && call.receiver_id === window.Core.user.id && call.status === 'pending') {
                    
                    // Используем твой CustomConfirm для стильного уведомления
                    if (window.CustomConfirm) {
                        const accept = await window.CustomConfirm("INCOMING CALL: LINE ENCRYPTED. ESTABLISH CONNECTION?");
                        
                        if (accept && window.VoiceModule) {
                            window.VoiceModule.acceptCall(call);
                        } else {
                            // Отклоняем звонок в базе данных
                            await sbClient.from('calls')
                                .update({ status: 'ended' })
                                .eq('id', call.id);
                        }
                    }
                }
            })
            .subscribe();
    }
    // --------------------------------------------------

    console.log("%c[SYSTEM] Core Foundation Established", "color: #0ff; font-weight: bold;");
};

createCore();