export const Utils = {
    // Часы
    startClock() {
        const clockEl = document.getElementById('clock');
        if (clockEl) {
            const update = () => {
                clockEl.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
            };
            update();
            setInterval(update, 1000);
        }
    },

    // Системные уведомления
    SystemNotify(title, body) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: 'space.png' 
            });
        }
    },

    // Глазик для пароля
    TogglePass(core) {
        const passInput = document.getElementById('pass');
        const toggleBtn = document.getElementById('toggle-pass');
        if (!passInput || !toggleBtn) return;
        
        passInput.type = (passInput.type === 'password') ? 'text' : 'password';
        toggleBtn.classList.toggle('viewing');
        
        // Вызываем Msg через переданный объект core
        core.Msg(passInput.type === 'text' ? "DECRYPTING_OVERSIGHT: VISIBLE" : "ENCRYPTING_OVERSIGHT: HIDDEN");
    }
};