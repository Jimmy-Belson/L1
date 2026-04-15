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
        
        InitVoiceListener: function() {
            const self = window.Core; 
            if (!self.sb || !self.user) {
                console.error("[VOICE] Cannot init: SB or User missing");
                return;
            }

            self.sb.removeAllChannels();
            const myId = String(self.user.id).toLowerCase().trim();
            
            console.log("%c[VOICE] Signal listener activated for:", "color: #f0f", myId);

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

                    if (targetId === myId && call.status === 'pending') {
                        console.log("%c[MATCH] Triggering UI...", "color: #0f0");
                        
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
        }
    };

    // ГЛАВНОЕ: Активация при входе
    if (sbClient) {
        sbClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                window.Core.user = session?.user;
                window.Core.InitVoiceListener(); 
            }
        });
    }

    console.log("%c[SYSTEM] Core Foundation Established", "color: #0ff; font-weight: bold;");
};

createCore();