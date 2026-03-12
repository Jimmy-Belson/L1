/**
 * ЛОГИКА ПРОФИЛЯ ORBITRON (v2.0 - Синхронизированная)
 */

// 1. Предпросмотр фото (ПРЕЛОАД)
function previewFile() {
    const fileInput = document.getElementById('avatar-file');
    const preview = document.getElementById('avatar-img');
    
    if (!fileInput || !fileInput.files[0]) return;

    const reader = new FileReader();
    reader.onloadend = () => {
        preview.src = reader.result; // Мгновенная подмена на экране
        if (window.Core && Core.Msg) {
            Core.Msg("IMAGE_STAGED: READY_FOR_SYNC", "info");
        }
    }
    reader.readAsDataURL(fileInput.files[0]);
}

// 2. Основная функция сохранения (вызывается из HTML кнопки)
async function updateProfile() {
    // Просто перенаправляем выполнение в главный объект Core
    if (window.Core && Core.UpdateProfile) {
        await Core.UpdateProfile();
    } else {
        console.error("Core Engine не найден!");
    }
}

// 3. Авто-загрузка данных при входе на страницу
window.addEventListener('DOMContentLoaded', () => {
    // Даем Core инициализироваться (0.5 сек)
    setTimeout(async () => {
        if (!window.Core || !Core.sb || !Core.user) return;
        
        try {
            const { data: p, error } = await Core.sb
                .from('profiles')
                .select('*')
                .eq('id', Core.user.id)
                .single();
            
            if (p) {
                // ИСПОЛЬЗУЕМ ТВОИ ID ИЗ HTML: nick-input и avatar-img
                const nickEl = document.getElementById('nick-input');
                const imgEl = document.getElementById('avatar-img');
                
                if (nickEl) nickEl.value = p.nickname || "";
                if (imgEl && p.avatar_url) imgEl.src = p.avatar_url;
                
                Core.Msg("BIOMETRICS_RECOGNIZED", "info");
            }
        } catch (err) {
            console.warn("Ошибка загрузки профиля:", err);
        }
    }, 500);
});