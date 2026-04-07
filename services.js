// services.js
export const AvatarService = {
    getPublicUrl(sb, user_id, avatar_url) {
        // 1. Если пусто — даем робота (ИСПОЛЬЗУЕМ ТИЛЬДЫ ` `)
        if (!avatar_url || avatar_url === "" || avatar_url === "null") {
            const seed = user_id || "guest";
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d`;
        }

        // 2. Если это уже ссылка http
        if (avatar_url.startsWith('http')) return avatar_url;
        
        // 3. Если это имя файла в бакете
        try {
            const { data } = sb.storage.from('avatars').getPublicUrl(avatar_url);
            return data.publicUrl;
        } catch (e) {
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${user_id}&backgroundColor=001a2d`;
        }
    }
};