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

// Исправленный блок экспорта метода
// Создаем Core в window, если его еще нет (чтобы кнопка в HTML его видела)
window.Core = window.Core || {}; 

window.Core.closeUpdateBanner = () => {
    UI.Updates.close();
    if (UI.Msg) {
        UI.Msg("SYSTEM_DATA_STABILIZED", "success");
    } else if (window.Core.Msg) {
        window.Core.Msg("SYSTEM_DATA_STABILIZED", "success");
    }
};