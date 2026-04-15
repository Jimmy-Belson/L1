const createCore = () => {
    // 1. Создаем клиент только если его еще нет
    if (!window.sbClient) {
        window.sbClient = (window.supabase) ? window.supabase.createClient(
            'https://ebjsxlympwocluxgmwcu.supabase.co', 
            'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
        ) : null;
    }

    // 2. Инициализируем Core, если он пустой
    window.Core = window.Core || {};
    window.Core.sb = window.sbClient;
    window.Core.user = null;

    // 3. ПРЯМОЕ НАЗНАЧЕНИЕ ФУНКЦИИ (чтобы точно была)
    window.Core.InitVoiceListener = function() {
        const self = window.Core;
        if (!self.sb || !self.user) {
            console.error("[VOICE] Missing SB or User", {sb: !!self.sb, user: !!self.user});
            return;
        }

        self.sb.removeAllChannels();
        const myId = String(self.user.id).toLowerCase().trim();
        console.log("%c[VOICE] Listener Active:", "color: #f0f", myId);

        self.sb.channel('voice-room')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'calls'
            }, async (payload) => {
                const call = payload.new;
                const targetId = String(call.receiver_id).toLowerCase().trim();
                
                if (targetId === myId && call.status === 'pending') {
                    console.log("%c[MATCH] Incoming Call!", "color: #0f0");
                    let accept = window.confirm("INCOMING VOICE SIGNAL. ACCEPT?");
                    if (accept && window.VoiceModule) {
                        window.VoiceModule.acceptCall(call);
                    } else {
                        await self.sb.from('calls').update({ status: 'ended' }).eq('id', call.id);
                    }
                }
            }).subscribe();
    };

    // 4. Авто-запуск при логине
    if (window.sbClient) {
        window.sbClient.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                window.Core.user = session.user;
                window.Core.InitVoiceListener();
            }
        });
    }

    console.log("%c[SYSTEM] Core Foundation Ready", "color: #0ff");
};

createCore();