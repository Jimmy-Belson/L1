// js/init-core.js
window.GlobalVoiceInit = function() {
    const sb = window.Core?.sb;
    const user = window.Core?.user;

    if (!sb || !user) {
        console.error("[VOICE] Cannot start: Missing SB or User in Core");
        return;
    }

    const myId = String(user.id).toLowerCase().trim();
   

    console.log("%c[VOICE] SIGNAL LISTENER DEPLOYED:", "color: #0ff; font-weight: bold;", myId);

    sb.channel('voice-broadcast')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'calls'
        }, async (payload) => {
            const call = payload.new;
            if (String(call.receiver_id).toLowerCase().trim() === myId && call.status === 'pending') {
                console.log("%c[INCOMING] SIGNAL!", "color: #f0f;");
                
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
};