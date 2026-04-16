// js/voice.js
export const VoiceModule = {
    pc: null,
    localStream: null,
    currentCallId: null,
    isMuted: false,
    config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    },

    // --- INTERFACE MANAGEMENT ---
    showOverlay(nickname, avatarUrl = null) {
        const overlay = document.getElementById('voice-overlay');
        const avatarImg = document.getElementById('voice-target-avatar');
        if (!overlay) return;

        // ВМЕСТО .style.display = 'flex' ИСПОЛЬЗУЕМ КЛАСС
        overlay.classList.add('active'); 
        
        document.getElementById('voice-target-nick').innerText = nickname.toUpperCase();
        this.updateStatus("ESTABLISHING_LINK...");
        
        if (avatarImg) {
            avatarImg.src = avatarUrl || 'assets/default-avatar.png';
        }

        this.isMuted = false;
        const muteBtn = document.getElementById('mute-btn');
        const muteIcon = document.getElementById('mute-icon');
        if (muteBtn) {
            muteBtn.classList.remove('muted');
            if (muteIcon) {
                if (muteIcon.tagName === 'I') muteIcon.className = 'fas fa-microphone';
                else muteIcon.innerText = "[ MIC_ON ]";
            }
        }
    },

   hideOverlay() {
        const overlay = document.getElementById('voice-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    updateStatus(text) {
        const statusEl = document.getElementById('voice-status');
        if (statusEl) statusEl.innerText = text.toUpperCase();
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
            if (icon.tagName === 'I') icon.className = 'fas fa-microphone-slash';
            else icon.innerText = "[ MIC_OFF ]";
            if (window.Core.Msg) window.Core.Msg("MICROPHONE_MUTED", "warning");
        } else {
            btn.classList.remove('muted');
            if (icon.tagName === 'I') icon.className = 'fas fa-microphone';
            else icon.innerText = "[ MIC_ON ]";
            if (window.Core.Msg) window.Core.Msg("MICROPHONE_ACTIVE", "success");
        }
    },

    // --- CALL LOGIC ---
    async startCall() {
        const targetId = window.CommModule.activeTarget;
        if (!targetId) return;

        const nick = document.getElementById('private-target-name')?.innerText.replace('SECURE_LINE: ', '') || "PILOT";
        
        // Пробуем достать аватарку из уже открытого поповера или чата
        const currentAvatar = document.getElementById('pop-avatar')?.src || 'assets/default-avatar.png';
        
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
        // ДОБАВЛЯЕМ ЭТО:
        remoteAudio.play().catch(e => {
            console.error("Autoplay blocked", e);
            window.Core.Msg("CLICK TO ENABLE AUDIO", "info");
        });
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
        
        // 1. Показываем оверлей (сначала заглушку)
        this.showOverlay("INCOMING SIGNAL", 'assets/default-avatar.png');

        // 2. Фоновый запрос на получение данных профиля звонящего
        try {
            const { data: p } = await window.Core.sb.from('profiles')
                .select('nickname, avatar_url')
                .eq('id', callData.caller_id)
                .maybeSingle();
            
            if (p) {
                const nick = (p.nickname || "PILOT").toUpperCase();
                const avatar = window.Core.getAvatar(callData.caller_id, p.avatar_url);
                document.getElementById('voice-target-nick').innerText = nick;
                document.getElementById('voice-target-avatar').src = avatar;
            }
        } catch (err) { console.error("Profile sync error", err); }

        this.pc = new RTCPeerConnection(this.config);

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.localStream.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));
        } catch (e) {
            return this.endCall();
        }

        this.pc.ontrack = (event) => {
            const remoteAudio = document.getElementById('remote-audio');
            if (remoteAudio) remoteAudio.srcObject = event.streams[0];
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

        await window.Core.sb.from('calls').update({ 
            answer: answer, 
            status: 'active' 
        }).eq('id', callData.id);

        this.subscribeToCall(callData.id);
    },

    async saveIceCandidate(callId, candidate, type) {
        const column = type === 'caller' ? 'ice_candidates_caller' : 'ice_candidates_receiver';
        await window.Core.sb.rpc('add_ice_candidate', { 
            call_id: callId, 
            candidate: candidate, 
            target_col: column 
        });
    },

    subscribeToCall(callId) {
        window.Core.sb.channel(`call_realtime:${callId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}` }, 
            async (payload) => {
                const data = payload.new;
                
                if (data.status === 'ended') {
                    this.endCall(false);
                }

                if (data.answer && !this.pc.remoteDescription) {
                    await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                }

                const myRole = data.caller_id === window.Core.user.id ? 'caller' : 'receiver';
                const remoteCandidates = myRole === 'caller' ? data.ice_candidates_receiver : data.ice_candidates_caller;
                
if (remoteCandidates && remoteCandidates.length > 0) {
    remoteCandidates.forEach(cand => {
        // Проверка: добавляем кандидатов только если мы уже знаем, КТО на другом конце (SDP)
        if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
            this.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => {
                console.warn("[VOICE] Ошибка добавления кандидата:", e);
            });
        }
    });
}
            }).subscribe();
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

window.VoiceModule = VoiceModule;