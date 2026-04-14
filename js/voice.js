export const VoiceModule = {
    pc: null,
    localStream: null,
    currentCallId: null,
    config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    },

    async startCall() {
        const targetId = window.CommModule.activeTarget;
        if (!targetId) return;

        this.pc = new RTCPeerConnection(this.config);
        
        // Setup local audio
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.localStream.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));

        // Listen for remote audio
        this.pc.ontrack = (event) => {
            const remoteAudio = document.getElementById('remote-audio') || new Audio();
            remoteAudio.id = 'remote-audio';
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play();
        };

        // Handle network routing (ICE)
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
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
        
        if (window.Core.Msg) window.Core.Msg("ESTABLISHING_LINK...", "info");
        this.subscribeToCall(data.id);
    },

    async acceptCall(callData) {
        this.currentCallId = callData.id;
        this.pc = new RTCPeerConnection(this.config);

        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.localStream.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));

        this.pc.ontrack = (event) => {
            const remoteAudio = document.getElementById('remote-audio') || new Audio();
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play();
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
        // Using array_append logic via RPC or simple update if JSONB array
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
                if (data.answer && !this.pc.remoteDescription) {
                    await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
                // Handle new candidates from remote
                // Logic to addIceCandidate...
            }).subscribe();
    },

    endCall() {
        if (this.localStream) this.localStream.getTracks().forEach(t => t.stop());
        if (this.pc) this.pc.close();
        window.Core.sb.from('calls').update({ status: 'ended' }).eq('id', this.currentCallId);
        if (window.Core.Msg) window.Core.Msg("LINK_TERMINATED", "warning");
    }
};
window.VoiceModule = VoiceModule;