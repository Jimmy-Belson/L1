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

    // КРАСИВОЕ НЕОНОВОЕ УВЕДОМЛЕНИЕ
    ShowNeonNotify(text, type = 'success') {
        // Удаляем старое, если оно еще висит
        const oldAlert = document.querySelector('.system-alert');
        if (oldAlert) oldAlert.remove();

        const alertEl = document.createElement('div');
        alertEl.className = `system-alert alert-${type}`;
        alertEl.innerHTML = `
            <div class="scan-line"></div>
            <i class="fas ${type === 'success' ? 'fa-user-plus' : 'fa-exclamation-triangle'}"></i>
            <span>${text.toUpperCase()}</span>
        `;

        document.body.appendChild(alertEl);

        // Плавное появление
        setTimeout(() => alertEl.classList.add('active'), 10);

        // Удаление
        setTimeout(() => {
            alertEl.classList.remove('active');
            setTimeout(() => alertEl.remove(), 300);
        }, 3000);
    },

    // Системные уведомления (браузерные)
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
        
        core.Msg(passInput.type === 'text' ? "DECRYPTING_OVERSIGHT: VISIBLE" : "ENCRYPTING_OVERSIGHT: HIDDEN");
    }
};