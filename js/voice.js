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
    showOverlay(nickname) {
        const overlay = document.getElementById('voice-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        document.getElementById('voice-target-nick').innerText = nickname.toUpperCase();
        document.getElementById('voice-status').innerText = "ESTABLISHING_LINK...";
        
        // Reset mute state visually
        this.isMuted = false;
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.classList.remove('muted');
            document.getElementById('mute-icon').innerText = "[ MIC_ON ]";
        }
    },

    hideOverlay() {
        const overlay = document.getElementById('voice-overlay');
        if (overlay) overlay.style.display = 'none';
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
            icon.innerText = "[ MIC_OFF ]";
            if (window.Core.Msg) window.Core.Msg("MICROPHONE_MUTED", "warning");
        } else {
            btn.classList.remove('muted');
            icon.innerText = "[ MIC_ON ]";
            if (window.Core.Msg) window.Core.Msg("MICROPHONE_ACTIVE", "success");
        }
    },

    // --- CALL LOGIC ---
    async startCall() {
        const targetId = window.CommModule.activeTarget;
        if (!targetId) return;

        // Get nickname from private panel header
        const nick = document.getElementById('private-target-name')?.innerText.replace('SECURE_LINE: ', '') || "PILOT";
        this.showOverlay(nick);

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
                this.updateStatus("ENCRYPTED_LINK_ACTIVE");
            }
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
        this.showOverlay("PILOT SIGNAL"); // Simplified for incoming

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

                // Handle incoming candidates from the other side
                const myRole = data.caller_id === window.Core.user.id ? 'caller' : 'receiver';
                const remoteCandidates = myRole === 'caller' ? data.ice_candidates_receiver : data.ice_candidates_caller;
                
                if (remoteCandidates && remoteCandidates.length > 0) {
                    remoteCandidates.forEach(cand => {
                        this.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => {});
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