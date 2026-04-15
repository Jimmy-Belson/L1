// init-core.js
const createCore = () => {
    const sbClient = (window.supabase) ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null;

    window.Core = {
        sb: sbClient,
        user: null,
        UpdateCombatScore: async (score) => {
            console.log("Saving score...", score);
        },
        
        // ВЫНОСИМ СЛУШАТЕЛЯ В ОТДЕЛЬНУЮ ФУНКЦИЮ
 InitVoiceListener: function() {
            if (!this.sb || !this.user) return;

            // 1. УБИВАЕМ СТАРЫЕ КАНАЛЫ (чтобы не было дублей)
            this.sb.removeAllChannels();

            console.log("%c[VOICE] Signal listener activated for:", "color: #f0f", this.user.id);

            const voiceChannel = this.sb.channel('voice-room')
                .on('postgres_changes', { 
                    event: 'INSERT', // Можно поставить '*', если хочешь ловить и обновления
                    schema: 'public', 
                    table: 'calls'
                }, async (payload) => {
                    const call = payload.new;
                    
                    // --- МОЩНАЯ ПРОВЕРКА ---
                    const myId = String(this.user.id).toLowerCase().trim();
                    const targetId = String(call.receiver_id).toLowerCase().trim();
                    
                    console.log("[VOICE_DEBUG] Incoming call for ID:", targetId);
                    console.log("[VOICE_DEBUG] My ID:", myId);

                    if (targetId === myId && call.status === 'pending') {
                        console.log("%c[MATCH] Triggering UI...", "color: #0f0");
                        
                        if (window.CustomConfirm) {
                            const accept = await window.CustomConfirm("INCOMING VOICE SIGNAL. ESTABLISH ENCRYPTED LINK?");
                            
                            if (accept && window.VoiceModule) {
                                window.VoiceModule.acceptCall(call);
                            } else {
                                await this.sb.from('calls').update({ status: 'ended' }).eq('id', call.id);
                            }
                        }
                    } else {
                        console.log("[VOICE] Call ignored: not for me or not pending.");
                    }
                });

            voiceChannel.subscribe((status) => {
                console.log("[VOICE_CHANNEL_STATUS]:", status);
            });
        }
    };

    // Автоматическая активация при смене состояния сессии
    if (sbClient) {
        sbClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                window.Core.user = session?.user;
                window.Core.InitVoiceListener(); // Включаем уши, когда пилот на борту
            }
        });
    }

    console.log("%c[SYSTEM] Core Foundation Established", "color: #0ff; font-weight: bold;");
};

createCore();