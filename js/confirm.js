export async function CustomConfirm(text) {
    let overlay = document.getElementById('custom-confirm');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-confirm';
        overlay.className = 'confirm-overlay';
        overlay.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,5,10,0.85); z-index:99999; align-items:center; justify-content:center; backdrop-filter:blur(4px); pointer-events: auto;";
        overlay.innerHTML = `
            <div class="confirm-box" style="background: rgba(0, 10, 20, 0.95); border: 1px solid #0ff; padding: 20px; width: 320px; text-align: center; box-shadow: 0 0 30px rgba(0,255,255,0.2); position: relative; border-radius: 2px;">
                <div style="color: #0ff; font-size: 11px; margin-bottom: 20px; letter-spacing: 2px; font-family: 'Orbitron'; border-bottom: 1px solid rgba(0,255,255,0.2); padding-bottom: 10px;">
                    SYSTEM_CONFIRMATION
                </div>
                <div class="confirm-body" style="color: #fff; margin-bottom: 25px; font-family: 'Share Tech Mono'; font-size: 14px; line-height: 1.4;"></div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirm-yes" style="background: rgba(0,255,255,0.1); border: 1px solid #0ff; color: #0ff; padding: 8px 20px; cursor: pointer; font-family: 'Orbitron'; font-size: 10px; transition: 0.3s;">[ CONFIRM ]</button>
                    <button id="confirm-no" style="background: rgba(255,0,0,0.1); border: 1px solid #f00; color: #f00; padding: 8px 20px; cursor: pointer; font-family: 'Orbitron'; font-size: 10px; transition: 0.3s;">[ ABORT ]</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    const body = overlay.querySelector('.confirm-body');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    
    body.innerText = text;
    overlay.style.display = 'flex';

    return new Promise((resolve) => {
        yesBtn.onclick = () => { overlay.style.display = 'none'; resolve(true); };
        noBtn.onclick = () => { overlay.style.display = 'none'; resolve(false); };
    });
}