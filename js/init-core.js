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

            console.log("%c[VOICE] Signal listener activated for:", "color: #f0f", this.user.id);

            this.sb.channel('voice-room')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'calls'
                }, async (payload) => {
                    const call = payload.new;
                    console.log("[DEBUG] New entry in 'calls' table:", call);
                    
                    // Проверка: мы ли получатель?
                    if (call.receiver_id === this.user.id && call.status === 'pending') {
                        if (window.CustomConfirm) {
                            const accept = await window.CustomConfirm("INCOMING VOICE SIGNAL. ESTABLISH ENCRYPTED LINK?");
                            
                            if (accept && window.VoiceModule) {
                                window.VoiceModule.acceptCall(call);
                            } else {
                                await this.sb.from('calls').update({ status: 'ended' }).eq('id', call.id);
                            }
                        }
                    }
                })
                .subscribe();
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