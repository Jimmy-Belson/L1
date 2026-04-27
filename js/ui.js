// ui.js
export const UI = {
    Msg(text, type = "info") {
        const container = document.getElementById('msg-container');
        if (!container) return;
        
        const m = document.createElement('div');
        m.className = `system-msg ${type}`;
        m.innerHTML = `<span class="msg-prefix">[SYSTEM_REPORT]:</span> ${text}`;
        
        container.prepend(m);
        setTimeout(() => m.classList.add('show'), 10);
        setTimeout(() => {
            m.classList.remove('show');
            setTimeout(() => { m.remove(); }, 500);
        }, 4000);
    },

    Updates: {
        VERSION: "2.1.0", 

        check() {
            const lastSeen = localStorage.getItem('orbitron_last_version');
            const banner = document.getElementById('update-banner');
            // Проверка: если баннер есть в HTML и версия в памяти старая/отсутствует
            if (banner && lastSeen !== this.VERSION) {
                banner.style.display = 'flex';
            }
        },

        close() {
            localStorage.setItem('orbitron_last_version', this.VERSION);
            const banner = document.getElementById('update-banner');
            if (banner) {
                banner.style.display = 'none';
                // Вызываем Msg через UI, чтобы показать, что данные сохранены
                UI.Msg("LOCAL_VERSION_SYNCHRONIZED", "success");
            }
        }
    }
};