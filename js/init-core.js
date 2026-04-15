// 1. Создаем функцию ВНЕ объекта Core
window.GlobalVoiceInit = function() {
    // Проверяем наличие Core и данных
    if (!window.Core || !window.Core.sb || !window.Core.user) {
        console.error("[VOICE] Core data not ready yet...");
        return;
    }

    const self = window.Core;
    self.sb.removeAllChannels();
    
    const myId = String(self.user.id).toLowerCase().trim();
    console.log("%c[VOICE] EMERGENCY START:", "color: #f0f", myId);

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

// 2. Пытаемся внедрить её в Core, но если Core перезапишут, у нас останется GlobalVoiceInit
window.Core = window.Core || {};
window.Core.InitVoiceListener = window.GlobalVoiceInit;

// 3. Автозапуск
if (window.supabase) {
    const tempClient = window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj');
    tempClient.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            // Ждем 1 секунду, пока остальные скрипты закончат перезаписывать window.Core
            setTimeout(() => {
                window.Core.user = session.user;
                window.GlobalVoiceInit();
            }, 1000);
        }
    });
}