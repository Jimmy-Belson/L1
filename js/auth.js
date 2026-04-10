import { getRankByScore } from './ranks.js';

export const AuthModule = {
async SyncProfile(Core, user) {
        if (!user) return;
        try {
            const { data, error } = await Core.sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (error) throw error;
            
            if (data) {
                Core.userProfile = data; 
                const avatarEl = document.getElementById('avatar-display');

                // Остальной код (ники, ранги) оставляем...

                if (avatarEl) {
                    // Получаем чистую ссылку из нашего нового сервиса
                    const newSrc = Core.getAvatar(user.id, data.avatar_url);
                    
                    // Сравниваем только чистые строки без лишних параметров
                    if (avatarEl.getAttribute('src') !== newSrc) {
                        avatarEl.onerror = () => {
                            console.warn("AVATAR_LOAD_FAILED. Check Storage Policies.");
                            avatarEl.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&backgroundColor=001a2d`;
                            avatarEl.onerror = null; 
                        };
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
            setTimeout(() => { 
                const isSubPage = window.location.pathname.includes('/html/');
                window.location.replace(isSubPage ? '../index.html' : 'index.html');
            }, 1200);
        } catch (e) {
            Core.Msg("SYNC_ERROR: " + e.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "[ SYNC_WITH_STATION ]";
        }
    },

    async Login(Core) {
        const emailEl = document.getElementById('email');
        const passEl = document.getElementById('pass');
        
        if (!emailEl || !passEl || !emailEl.value || !passEl.value) {
            Core.Msg("ACCESS_DENIED: MISSING_CREDENTIALS", "error");
            return;
        }

        try {
            const { error } = await Core.sb.auth.signInWithPassword({
                email: emailEl.value.trim(),
                password: passEl.value
            });

            if (error) throw error;

            Core.Msg("IDENTITY_CONFIRMED. WELCOME, PILOT.");
            
            setTimeout(() => { 
                const isSubPage = window.location.pathname.includes('/html/');
                window.location.replace(isSubPage ? '../index.html' : 'index.html');
            }, 1000);

        } catch (e) {
            Core.Msg("AUTH_ERR: " + e.message, "error");
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
            setTimeout(() => { 
                const isSubPage = window.location.pathname.includes('/html/');
                window.location.replace(isSubPage ? '../index.html' : 'index.html');
            }, 1500); 
        }
    },

    async Logout(Core) { 
        await Core.sb.auth.signOut(); 
        const isSubPage = window.location.pathname.includes('/html/');
        window.location.replace(isSubPage ? 'station.html' : 'html/station.html'); 
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
        // 1. Сначала проверяем текущий рекорд в базе
        const { data: profile, error: selectError } = await Core.sb.from('profiles')
            .select('combat_score')
            .eq('id', Core.user.id)
            .single();

        if (selectError) throw selectError;

        // 2. Если новый счет больше старого — обновляем
        if (newScore > (profile?.combat_score || 0)) {
            const { error: updateError } = await Core.sb
                .from('profiles')
                .update({ combat_score: newScore })
                .eq('id', Core.user.id);

            if (updateError) throw updateError;

            // ВАЖНО: Обновляем данные в текущей сессии, чтобы ранг пересчитался мгновенно
            Core.user.combat_score = newScore;
            console.log("SYSTEM: RECORD_UPDATED_LOCALLY");
        }
        
        // Возвращаем true, чтобы игра знала, что всё ок
        return true; 

    } catch(e) { 
        console.error("CRITICAL_SYNC_ERROR:", e); 
        return false;
    }
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