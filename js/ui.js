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
    }
};