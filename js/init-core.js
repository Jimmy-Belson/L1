// js/init-core.js
import { UI } from './ui.js';

window.GlobalVoiceInit = function() {
    const sb = window.Core?.sb;
    const user = window.Core?.user;

    // Запускаем проверку баннера при старте системы
    UI.Updates.check();

    if (!sb || !user) {
        console.error("[VOICE] Cannot start: Missing SB or User in Core");
        return;
    }

    const myId = String(user.id).toLowerCase().trim();
    console.log("%c[VOICE] SIGNAL LISTENER DEPLOYED:", "color: #0ff; font-weight: bold;", myId);
};

// Прокидываем метод закрытия в глобальный объект Core
// чтобы работало onclick="Core.closeUpdateBanner()"
if (window.Core) {
    window.Core.closeUpdateBanner = () => {
        UI.Updates.close();
        if (window.Core.Msg) window.Core.Msg("SYSTEM_DATA_STABILIZED", "success");
    };
}