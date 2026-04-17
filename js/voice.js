// js/voice.js
export const VoiceModule = {
    pc: null,
    localStream: null,
    currentCallId: null,
    isMuted: false,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' }
        ]
    },
    
    // ПЕРЕМЕННЫЕ ТАЙМЕРА И ВХОДЯЩЕГО ВЫЗОВА
    callStartTime: null,
    timerInterval: null,
    incomingCallData: null,
    callTimeout: null,

    // --- INTERFACE MANAGEMENT ---
    showOverlay(nickname, avatarUrl = null) {
        const overlay = document.getElementById('voice-overlay');
        const avatarImg = document.getElementById('voice-target-avatar');
        if (!overlay) return;

        overlay.classList.add('active'); 
        overlay.classList.remove('active-call'); // Сброс анимации колец
        this.resetTimerDisplay();
        
        document.getElementById('voice-target-nick').innerText = nickname.toUpperCase();
        this.updateStatus("ESTABLISHING...");
        
        if (avatarImg) {
            avatarImg.src = avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=PILOT&backgroundColor=001a2d';
        }

        this.isMuted = false;
        const muteBtn = document.getElementById('mute-btn');
        const muteIcon = document.getElementById('mute-icon');

        if (muteBtn) {
            muteBtn.classList.remove('muted');
            if (muteIcon) {
                muteIcon.className = 'fas fa-microphone';
            }
        }
    },

    hideOverlay() {
        const overlay = document.getElementById('voice-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.classList.remove('active-call');
        }
        this.stopTimer();
    },

    updateStatus(text) {
        const statusEl = document.getElementById('voice-status');
        const dot = document.querySelector('.status-dot');
        const overlay = document.getElementById('voice-overlay');
        
        if (statusEl) statusEl.innerText = text.toUpperCase();

        if (text.includes('ACTIVE')) {
            if (dot) dot.style.background = '#0f0'; 
            if (overlay) overlay.classList.add('active-call');
            this.startTimer();
        } else if (text.includes('MUTED')) {
            if (dot) dot.style.background = '#ffaa00';
        } else {
            if (dot) dot.style.background = '#ff0';
            if (overlay) overlay.classList.remove('active-call');
        }
    },

    // --- ЛОГИКА ТАЙМЕРА ---
    startTimer() {
        if (this.timerInterval) return;
        this.callStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const delta = Date.now() - this.callStartTime;
            const minutes = Math.floor(delta / 60000);
            const seconds = Math.floor((delta % 60000) / 1000);
            const timerEl = document.getElementById('voice-timer');
            if (timerEl) {
                timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    },

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    resetTimerDisplay() {
        const timerEl = document.getElementById('voice-timer');
        if (timerEl) timerEl.innerText = "00:00";
    },

    // --- MUTE LOGIC ---
    toggleMute() {
        if (!this.localStream) return;
        this.isMuted = !this.isMuted;
        
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });

        const btn = document.getElementById('mute-btn');
        const icon = document.getElementById('mute-icon');
        
        if (this.isMuted) {
            btn.classList.add('muted');
            if (icon) icon.className = 'fas fa-microphone-slash'; 
            this.updateStatus("MICROPHONE_MUTED");
        } else {
            btn.classList.remove('muted');
            if (icon) icon.className = 'fas fa-microphone';
            this.updateStatus("ENCRYPTED_LINK_ACTIVE");
        }
    },

    // --- INCOMING CALL UI ---
    async showIncomingCall(callData) {
        this.incomingCallData = callData;
        const incomingCard = document.getElementById('incoming-call-card');
        const ringtone = document.getElementById('ringtone-audio');

        try {
            const { data: p } = await window.Core.sb.from('profiles')
                .select('nickname, avatar_url')
                .eq('id', callData.caller_id)
                .maybeSingle();
            
            if (p) {
                document.getElementById('incoming-nick').innerText = (p.nickname || "PILOT").toUpperCase();
                document.getElementById('incoming-avatar').src = window.Core.getAvatar(callData.caller_id, p.avatar_url);
            }
        } catch (err) { console.error(err); }

        if (incomingCard) incomingCard.classList.add('active');
        if (ringtone) ringtone.play().catch(e => console.log("Ringtone blocked"));
        
        this.callTimeout = setTimeout(() => this.rejectIncomingCall(), 30000);
    },

    hideIncomingCall() {
        const incomingCard = document.getElementById('incoming-call-card');
        const ringtone = document.getElementById('ringtone-audio');
        if (incomingCard) incomingCard.classList.remove('active');
        if (ringtone) { ringtone.pause(); ringtone.currentTime = 0; }
        if (this.callTimeout) clearTimeout(this.callTimeout);
    },

    async acceptIncomingCall() {
        if (!this.incomingCallData) return;
        const data = this.incomingCallData;
        this.incomingCallData = null;
        this.hideIncomingCall();
        this.acceptCall(data);
    },

    async rejectIncomingCall() {
        if (!this.incomingCallData) return;
        const id = this.incomingCallData.id;
        this.incomingCallData = null;
        await window.Core.sb.from('calls').update({ status: 'ended' }).eq('id', id);
        this.hideIncomingCall();
    },

    // --- CALL LOGIC ---
    async startCall() {
        const targetId = window.CommModule.activeTarget;
        if (!targetId) return;

        const nick = document.getElementById('private-target-name')?.innerText.replace('SECURE_LINE: ', '') || "PILOT";
        const currentAvatar = document.getElementById('pop-avatar')?.src || 'https://api.dicebear.com/7.x/bottts/svg?seed=PILOT&backgroundColor=001a2d';
        
        this.showOverlay(nick, currentAvatar);
        this.pc = new RTCPeerConnection(this.config);
        
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.localStream.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));
        } catch (e) {
            window.Core.Msg("MIC_ACCESS_DENIED", "error");
            return this.endCall();
        }

        this.pc.ontrack = (event) => {
            const remoteAudio = document.getElementById('remote-audio');
            if (remoteAudio) {
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(e => window.Core.Msg("CLICK TO ENABLE AUDIO", "info"));
            }
            this.updateStatus("ENCRYPTED_LINK_ACTIVE");
        };

        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.currentCallId) {
                this.saveIceCandidate(this.currentCallId, event.candidate, 'caller');
            }
        };

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        const { data, error } = await window.Core.sb.from('calls').insert([{
            caller_id: window.Core.user.id,
            receiver_id: targetId,
            offer: offer,
            status: 'pending'
        }]).select().single();

        if (error) return console.error(error);
        this.currentCallId = data.id;
        this.subscribeToCall(data.id);
    },

    async acceptCall(callData) {
        this.currentCallId = callData.id;
        this.showOverlay("CONNECTING...", 'https://api.dicebear.com/7.x/bottts/svg?seed=PILOT&backgroundColor=001a2d');

        try {
            const { data: p } = await window.Core.sb.from('profiles')
                .select('nickname, avatar_url')
                .eq('id', callData.caller_id)
                .maybeSingle();
            
            if (p) {
                document.getElementById('voice-target-nick').innerText = (p.nickname || "PILOT").toUpperCase();
                document.getElementById('voice-target-avatar').src = window.Core.getAvatar(callData.caller_id, p.avatar_url);
            }
        } catch (err) { console.error(err); }

        this.pc = new RTCPeerConnection(this.config);

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.localStream.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));
        } catch (e) {
            return this.endCall();
        }

        this.pc.ontrack = (event) => {
            const remoteAudio = document.getElementById('remote-audio');
            if (remoteAudio) {
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(e => console.log("Autoplay blocked"));
            }
            this.updateStatus("ENCRYPTED_LINK_ACTIVE");
        };

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.saveIceCandidate(this.currentCallId, event.candidate, 'receiver');
            }
        };

        await this.pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

         this.subscribeToCall(callData.id);

        await window.Core.sb.from('calls').update({ answer: answer, status: 'active' }).eq('id', callData.id);
       
    },

    async saveIceCandidate(callId, candidate, type) {
        const column = type === 'caller' ? 'ice_candidates_caller' : 'ice_candidates_receiver';
        const candJson = candidate.toJSON ? candidate.toJSON() : candidate;
        await window.Core.sb.rpc('add_ice_candidate', { 
            call_id: callId, 
            candidate: candJson, 
            target_col: column 
        });
    },

    // Добавь это свойство в начало объекта VoiceModule
processedCandidates: new Set(),

subscribeToCall(callId) {
    this.processedCandidates.clear(); // Очищаем историю при новом звонке

    window.Core.sb.channel(`call_realtime:${callId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}` }, 
        async (payload) => {
            const data = payload.new;
            if (data.status === 'ended') return this.endCall(false);
            
            // 1. Установка удаленного описания
            if (data.answer && !this.pc.remoteDescription) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    // ВАЖНО: После установки описания, сразу пробуем прогнать накопившиеся кандидаты
    this.retryPendingCandidates(data); 
}

            // 2. Умный обмен кандидатами
            const myRole = data.caller_id === window.Core.user.id ? 'caller' : 'receiver';
            const remoteCandidates = myRole === 'caller' ? data.ice_candidates_receiver : data.ice_candidates_caller;
            
            if (remoteCandidates && remoteCandidates.length > 0) {
                for (const cand of remoteCandidates) {
                    const candId = JSON.stringify(cand);
                    // Добавляем только если еще не обрабатывали и описание готово
                    if (!this.processedCandidates.has(candId) && this.pc.remoteDescription) {
                        try {
                            await this.pc.addIceCandidate(new RTCIceCandidate(cand));
                            this.processedCandidates.add(candId);
                            console.log("ICE_SUCCESS: Координаты синхронизированы");
                        } catch (e) { console.warn("ICE_ERROR", e); }
                    }
                }
            }
        }).subscribe();
    },

    async retryPendingCandidates(data) {
        const myRole = data.caller_id === window.Core.user.id ? 'caller' : 'receiver';
        const remoteCandidates = myRole === 'caller' ? data.ice_candidates_receiver : data.ice_candidates_caller;
        
        if (remoteCandidates && this.pc.remoteDescription) {
            for (const cand of remoteCandidates) {
                const candId = JSON.stringify(cand);
                if (!this.processedCandidates.has(candId)) {
                    try {
                        await this.pc.addIceCandidate(new RTCIceCandidate(cand));
                        this.processedCandidates.add(candId);
                    } catch (e) { console.warn("Retry ICE Error:", e); }
                }
            }
        }
    },

    async endCall(notifyDb = true) {
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        if (notifyDb && this.currentCallId) {
            await window.Core.sb.from('calls').update({ status: 'ended' }).eq('id', this.currentCallId);
        }
        this.currentCallId = null;
        this.hideOverlay();
        if (window.Core.Msg) window.Core.Msg("LINK_TERMINATED", "warning");
    }
};

// СОБЫТИЯ КЛИКОВ
document.addEventListener('click', (e) => {
    if (e.target.closest('#mute-btn')) VoiceModule.toggleMute();
    if (e.target.closest('#end-call-btn')) VoiceModule.endCall();
    if (e.target.closest('#accept-call-btn')) VoiceModule.acceptIncomingCall();
    if (e.target.closest('#reject-call-btn')) VoiceModule.rejectIncomingCall();
});

window.VoiceModule = VoiceModule;