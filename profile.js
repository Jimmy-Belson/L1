// profile.js - только для прелоада и мостика
function previewFile() {
    const fileInput = document.getElementById('avatar-file');
    const preview = document.getElementById('avatar-img');
    if (fileInput && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; };
        reader.readAsDataURL(fileInput.files[0]);
    }
}


async function updateProfile() {
    await Core.UpdateProfile();
}

// Загрузка данных при входе (с твоим ID)
window.addEventListener('DOMContentLoaded', () => {

    setTimeout(async () => {
        if (!window.Core || !Core.user) return;
        const { data: p } = await Core.sb.from('profiles').select('*').eq('id', Core.user.id).single();
        if (p) {
            const nickEl = document.getElementById('nick-input');
            const imgEl = document.getElementById('avatar-img');
            if (nickEl) nickEl.value = p.nickname || "";
            if (imgEl && p.avatar_url) imgEl.src = p.avatar_url;
        }
    }, 500);
});