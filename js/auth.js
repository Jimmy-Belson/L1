import { getRankByScore } from './ranks.js';

export const AuthModule = {
    async SyncProfile(Core, user) {
        if (!user) return;
        try {
            const { data, error } = await Core.sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (error) throw error;
            
            if (data) {
                Core.userProfile = data; 
                const nickEl = document.getElementById('nick-display');
                const avatarEl = document.getElementById('avatar-display');

                if (nickEl) {
                    const rank = getRankByScore(data.combat_score || 0);
                    nickEl.innerText = data.nickname || user.email.split('@')[0];
                    nickEl.style.color = rank.color;
                    nickEl.style.textShadow = `0 0 8px ${rank.color}`;
                }

                // УЛУЧШЕННАЯ ЛОГИКА АВАТАРА
                if (avatarEl && data.avatar_url) {
                    const newSrc = Core.getAvatar(user.id, data.avatar_url);
                    
                    // Обновляем src только если он реально отличается от текущего
                    if (avatarEl.getAttribute('src') !== newSrc) {
                        // Сначала вешаем обработчик ошибки (защита от битых ссылок)
                        avatarEl.onerror = () => {
                            console.warn("AVATAR_LOAD_FAILED, using fallback.");
                            avatarEl.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&backgroundColor=001a2d`;
                            avatarEl.onerror = null; 
                        };
                        // Затем ставим источник
                        avatarEl.src = newSrc;
                    }
                }
            }
        } catch (e) { console.warn("SYNC_PROFILE_WARNING:", e.message); }
    },

    async UpdateProfile(Core) {
        if (!Core.user) return;
        const btn = document.getElementById('save-btn');
        const nickInput = document.getElementById('nick-input'); 
        const fileInput = document.getElementById('avatar-file');
        if (!nickInput || !btn) return;

        btn.innerText = ">> SYNCING...";
        btn.disabled = true;

        try {
            const nick = nickInput.value.trim();
            let fileName = Core.userProfile?.avatar_url || "";

            if (fileInput?.files[0]) {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                // Используем шаблонные строки через ` `
                fileName = `${Core.user.id}-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await Core.sb.storage
                    .from('avatars')
                    .upload(fileName, file, { upsert: true });

                if (uploadError) throw uploadError;
            }

            const { error: updateError } = await Core.sb.from('profiles').upsert({ 
                id: Core.user.id, 
                nickname: nick, 
                avatar_url: fileName 
            });

            if (updateError) throw updateError;

            Core.Msg("SYSTEM: DATA_SYNCED"); 
            // Используем replace для чистого перехода
            setTimeout(() => { window.location.replace('../index.html'); }, 1200);
        } catch (e) {
            Core.Msg("SYNC_ERROR: " + e.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "[ SYNC_WITH_STATION ]";
        }
    },

    async Register(Core) {
        const emailEl = document.getElementById('email'), passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await Core.sb.auth.signUp({ 
            email: emailEl.value.trim(), 
            password: passEl.value 
        });
        if(error) {
            Core.Msg("REG_ERROR: " + error.message, "error"); 
        } else {
            Core.Msg("PILOT_REGISTERED. INITIATING SESSION...");
            setTimeout(() => { window.location.replace('../index.html'); }, 1500); 
        }
    },

    async Logout(Core) { 
        await Core.sb.auth.signOut(); 
        window.location.replace('station.html'); 
    },

    async UpdateStat(Core, field, value = 1) {
        if (!Core.user) return;
        try {
            const { data, error } = await Core.sb.from('profiles')
                .select(field)
                .eq('id', Core.user.id)
                .single();
            if (error) throw error;
            if (data) {
                const newValue = (data[field] || 0) + value;
                await Core.sb.from('profiles').update({ [field]: newValue }).eq('id', Core.user.id);
            }
        } catch (e) { console.error("STAT_UPDATE_ERROR:", e.message); }
    },

    async UpdateCombatScore(Core, newScore) {
        if (!Core.user) return;
        try {
            const { data: profile } = await Core.sb.from('profiles')
                .select('combat_score')
                .eq('id', Core.user.id)
                .single();
            if (newScore > (profile?.combat_score || 0)) {
                await Core.sb.from('profiles').update({ combat_score: newScore }).eq('id', Core.user.id);
            }
        } catch(e) { console.error(e); }
    },

    previewFile() {
        const preview = document.getElementById('avatar-img');
        const file = document.getElementById('avatar-file').files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => { if (preview) preview.src = reader.result; };
        reader.readAsDataURL(file);
    }
};