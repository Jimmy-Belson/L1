// js/init-core.js
window.GlobalVoiceInit = function() {
    const sb = window.Core?.sb;
    const user = window.Core?.user;

    if (!sb || !user) {
        console.error("[VOICE] Cannot start: Missing SB or User in Core");
        return;
    }

    const myId = String(user.id).toLowerCase().trim();
   

    console.log("%c[VOICE] SIGNAL LISTENER DEPLOYED:", "color: #0ff; font-weight: bold;", myId);

   
};