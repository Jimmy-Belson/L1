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
            // Используем Core напрямую вместо this, чтобы не терять контекст
            const self = window.Core; 
            if (!self.sb || !self.user) {
                console.error("[VOICE] Cannot init: SB or User missing");
                return;
            }

            self.sb.removeAllChannels();

            const myId = String(self.user.id).toLowerCase().trim();
            console.log("%c[VOICE] Listening on ID:", "color: #f0f", myId);

            const voiceChannel = self.sb.channel('voice-room')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'calls'
                }, async (payload) => {
                    const call = payload.new;
                    if (!call) return;

                    const targetId = String(call.receiver_id).toLowerCase().trim();
                    
                    console.log("[VOICE_DEBUG] Incoming for:", targetId);
                    console.log("[VOICE_DEBUG] Current User:", myId);

                    // Сравниваем напрямую
                    if (targetId === myId && call.status === 'pending') {
                        console.log("%c[MATCH] Attempting UI Trigger...", "color: #0f0");
                        
                        // Если CustomConfirm не готов, используем стандартный для страховки
                        let accept = false;
                        if (window.CustomConfirm) {
                            accept = await window.CustomConfirm("INCOMING VOICE SIGNAL. ESTABLISH LINK?");
                        } else {
                            accept = window.confirm("INCOMING VOICE SIGNAL. ESTABLISH LINK?");
                        }
                        
                        if (accept && window.VoiceModule) {
                            window.VoiceModule.acceptCall(call);
                        } else {
                            await self.sb.from('calls').update({ status: 'ended' }).eq('id', call.id);
                        }
                    }
                });

            voiceChannel.subscribe((status) => {
                console.log("[VOICE_CHANNEL_STATUS]:", status);
            });
        },
    },

    console.log("%c[SYSTEM] Core Foundation Established", "color: #0ff; font-weight: bold;");
};

createCore();