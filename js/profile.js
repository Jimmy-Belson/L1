// profile.js - Мостик для связи UI и Core системы

// 1. Функция превью (теперь работает внутри модуля)
export function previewFile() {
    const fileInput = document.getElementById('avatar-file');
    const preview = document.getElementById('avatar-img');
    if (fileInput && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

// 2. Инициализация страницы
window.addEventListener('DOMContentLoaded', () => {
    // Ждем чуть-чуть, пока Core инициализируется
    setTimeout(async () => {
        if (!window.Core || !window.Core.sb) return;
        
        const user = window.Core.user;
        if (!user) return;

        // Загружаем данные профиля для полей ввода
        const { data: p } = await window.Core.sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
        
        if (p) {
            const nickInput = document.getElementById('nick-input');
            const imgEl = document.getElementById('avatar-img');
            
            if (nickInput) nickInput.value = p.nickname || "";
            
            // Используем метод из Core для правильной ссылки на аватарку
            if (imgEl && p.avatar_url) {
                imgEl.src = window.Core.getAvatar(user.id, p.avatar_url);
            }
        }

        // 3. ПРИВЯЗКА СОБЫТИЙ (Вместо onclick в HTML)
        const saveBtn = document.getElementById('save-btn');
        const fileBtn = document.querySelector('.nav-btn'); // Кнопка "UPLOAD"
        const fileInput = document.getElementById('avatar-file');

        if (saveBtn) {
            saveBtn.onclick = () => window.Core.UpdateProfile();
        }

        if (fileBtn && fileInput) {
            fileBtn.onclick = () => fileInput.click();
            fileInput.onchange = () => previewFile();
        }

    }, 600); // 600ms достаточно, чтобы Core.init() отработал
});