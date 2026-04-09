// services.js
export const AvatarService = {
    getPublicUrl(sb, user_id, avatar_url) {
        // Убираем лишние символы (типа :1 в конце) и пробелы
        let cleanUrl = String(avatar_url || "").trim();
        
        // Убираем номер строки, если он случайно приклеился к ссылке (защита от ошибки :1)
        if (cleanUrl.includes('.jpg:')) cleanUrl = cleanUrl.split('.jpg:')[0] + '.jpg';
        if (cleanUrl.includes('.png:')) cleanUrl = cleanUrl.split('.png:')[0] + '.png';

        // 1. Если в базе пусто — возвращаем робота
        if (!cleanUrl || cleanUrl === "" || cleanUrl === "null" || cleanUrl === "undefined") {
            const seed = user_id || "guest";
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d`;
        }

        // 2. Если в базе уже лежит полная ссылка (http...)
        if (cleanUrl.startsWith('http')) {
            // Если ссылка ведет на твой Supabase, но в ней нет /public/, добавляем его
            if (cleanUrl.includes('supabase.co') && cleanUrl.includes('/object/') && !cleanUrl.includes('/public/')) {
                return cleanUrl.replace('/object/avatars/', '/object/public/avatars/');
            }
            return cleanUrl;
        }
        
        // 3. Если в базе только имя файла — формируем URL через Supabase SDK
        try {
            const { data } = sb.storage.from('avatars').getPublicUrl(cleanUrl);
            let finalUrl = data.publicUrl;

            // ГЛАВНАЯ ПРАВКА: если SDK выдал ссылку без /public/, вставляем его принудительно
            if (finalUrl.includes('/object/avatars/') && !finalUrl.includes('/public/')) {
                finalUrl = finalUrl.replace('/object/avatars/', '/object/public/avatars/');
            }
            
            return finalUrl;
        } catch (e) {
            console.warn("AvatarService Error:", e);
            const seed = user_id || "guest";
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d`;
        }
    }
};