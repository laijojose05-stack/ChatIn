/**
 * ChatIn WebRTC Real-Time Audio & Video Call Engine
 * High-performance, peer-to-peer audio & video calls with WebRTC and Socket.IO
 */
(function () {
  'use strict';

  // State Management
  let socketInstance = null;
  let peerConnection = null;
  let localStream = null;
  let screenStream = null;
  let currentCall = null; // { peer, callType, conversationId, isCaller, offer }
  let pendingCandidates = [];
  let callTimerInterval = null;
  let callStartTime = null;
  let isMicMuted = false;
  let isCamOff = false;
  let isScreenSharing = false;
  let callTimeoutTimer = null;

  // Web Audio Tone Synthesizer
  let audioCtx = null;
  let toneInterval = null;

  function getAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  function stopAudioTones() {
    if (toneInterval) {
      clearInterval(toneInterval);
      toneInterval = null;
    }
  }

  // Play Dialing Ringback Tone (calling peer)
  function playDialTone() {
    stopAudioTones();
    const ctx = getAudioContext();
    if (!ctx) return;

    const playBeep = () => {
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.25);
        osc2.stop(now + 1.25);
      } catch (e) {}
    };

    playBeep();
    toneInterval = setInterval(playBeep, 3000);
  }

  // Play Incoming Ringtone (someone is calling you)
  function playIncomingRingtone() {
    stopAudioTones();
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const playChimes = () => {
      try {
        const now = ctx.currentTime;
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteStart = now + idx * 0.16;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0.12, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.32);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 0.35);
        });
      } catch (e) {}
    };

    playChimes();
    toneInterval = setInterval(playChimes, 2200);
  }

  // Play End Call Tone
  function playEndTone() {
    stopAudioTones();
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {}
  }

  // WebRTC Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  // Helper to get initials
  function getInitials(name) {
    if (!name) return 'CI';
    return name.trim().substring(0, 2).toUpperCase();
  }

  // DOM Elements Cache
  const dom = {};
  function cacheDomElements() {
    dom.headerAudioCallBtn = document.getElementById('headerAudioCallBtn');
    dom.headerVideoCallBtn = document.getElementById('headerVideoCallBtn');

    // Incoming Call Modal
    dom.incomingCallModal = document.getElementById('incomingCallModal');
    dom.incomingCallerAvatar = document.getElementById('incomingCallerAvatar');
    dom.incomingCallerName = document.getElementById('incomingCallerName');
    dom.incomingCallTypeLabel = document.getElementById('incomingCallTypeLabel');
    dom.btnAcceptCall = document.getElementById('btnAcceptCall');
    dom.btnDeclineCall = document.getElementById('btnDeclineCall');

    // Outgoing Call Modal
    dom.outgoingCallModal = document.getElementById('outgoingCallModal');
    dom.outgoingPeerAvatar = document.getElementById('outgoingPeerAvatar');
    dom.outgoingPeerName = document.getElementById('outgoingPeerName');
    dom.outgoingCallStatus = document.getElementById('outgoingCallStatus');
    dom.btnCancelCall = document.getElementById('btnCancelCall');

    // Active Call Overlay
    dom.activeCallModal = document.getElementById('activeCallModal');
    dom.activeCallPeerName = document.getElementById('activeCallPeerName');
    dom.callDurationTimer = document.getElementById('callDurationTimer');
    dom.callQualityBadge = document.getElementById('callQualityBadge');
    dom.btnMinimizeCall = document.getElementById('btnMinimizeCall');
    dom.btnFullscreenCall = document.getElementById('btnFullscreenCall');
    dom.remoteVideo = document.getElementById('remoteVideo');
    dom.remoteAudio = document.getElementById('remoteAudio');
    dom.remoteAudioPlaceholder = document.getElementById('remoteAudioPlaceholder');
    dom.remoteAudioAvatar = document.getElementById('remoteAudioAvatar');
    dom.remoteAudioName = document.getElementById('remoteAudioName');
    dom.audioCallDuration = document.getElementById('audioCallDuration');
    dom.localVideoPip = document.getElementById('localVideoPip');
    dom.localVideo = document.getElementById('localVideo');
    dom.localCamOffPlaceholder = document.getElementById('localCamOffPlaceholder');

    // Controls
    dom.callToggleMicBtn = document.getElementById('callToggleMicBtn');
    dom.callToggleCamBtn = document.getElementById('callToggleCamBtn');
    dom.callScreenShareBtn = document.getElementById('callScreenShareBtn');
    dom.btnEndActiveCall = document.getElementById('btnEndActiveCall');
    dom.iconMic = document.getElementById('iconMic');
    dom.iconCam = document.getElementById('iconCam');
    dom.iconScreen = document.getElementById('iconScreen');

    // Minimized Pill
    dom.minimizedCallPill = document.getElementById('minimizedCallPill');
    dom.minimizedCallPeerName = document.getElementById('minimizedCallPeerName');
    dom.minimizedCallTimer = document.getElementById('minimizedCallTimer');
    dom.minimizedCallTrigger = document.getElementById('minimizedCallTrigger');
    dom.btnExpandCall = document.getElementById('btnExpandCall');
    dom.btnEndMinimizedCall = document.getElementById('btnEndMinimizedCall');
  }

  // Toast Helper
  function showCallToast(message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message);
    } else {
      console.log('Call Notification:', message);
    }
  }

  // Duration Timer Helper
  function startCallTimer() {
    stopCallTimer();
    callStartTime = Date.now();
    const updateTimer = () => {
      if (!callStartTime) return;
      const elapsedSec = Math.floor((Date.now() - callStartTime) / 1000);
      const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
      const secs = (elapsedSec % 60).toString().padStart(2, '0');
      const timeStr = `${mins}:${secs}`;
      if (dom.callDurationTimer) dom.callDurationTimer.textContent = timeStr;
      if (dom.audioCallDuration) dom.audioCallDuration.textContent = timeStr;
      if (dom.minimizedCallTimer) dom.minimizedCallTimer.textContent = timeStr;
    };
    updateTimer();
    callTimerInterval = setInterval(updateTimer, 1000);
  }

  function stopCallTimer() {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
    callStartTime = null;
    if (dom.callDurationTimer) dom.callDurationTimer.textContent = '00:00';
    if (dom.audioCallDuration) dom.audioCallDuration.textContent = '00:00';
    if (dom.minimizedCallTimer) dom.minimizedCallTimer.textContent = '00:00';
  }

  // WebRTC Cleanup
  function cleanupCall() {
    stopAudioTones();
    stopCallTimer();
    if (callTimeoutTimer) {
      clearTimeout(callTimeoutTimer);
      callTimeoutTimer = null;
    }

    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      localStream = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      screenStream = null;
    }

    if (dom.localVideo) dom.localVideo.srcObject = null;
    if (dom.remoteVideo) dom.remoteVideo.srcObject = null;
    if (dom.remoteAudio) dom.remoteAudio.srcObject = null;

    if (peerConnection) {
      try {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
      } catch (e) {}
      peerConnection = null;
    }

    currentCall = null;
    pendingCandidates = [];
    isMicMuted = false;
    isCamOff = false;
    isScreenSharing = false;

    // Reset UI Elements
    if (dom.incomingCallModal) dom.incomingCallModal.classList.add('d-none');
    if (dom.outgoingCallModal) dom.outgoingCallModal.classList.add('d-none');
    if (dom.activeCallModal) dom.activeCallModal.classList.add('d-none');
    if (dom.minimizedCallPill) dom.minimizedCallPill.classList.add('d-none');

    // Reset control buttons state
    if (dom.callToggleMicBtn) {
      dom.callToggleMicBtn.classList.remove('off');
      if (dom.iconMic) dom.iconMic.className = 'bi bi-mic-fill fs-5';
    }
    if (dom.callToggleCamBtn) {
      dom.callToggleCamBtn.classList.remove('off');
      if (dom.iconCam) dom.iconCam.className = 'bi bi-camera-video-fill fs-5';
    }
    if (dom.callScreenShareBtn) {
      dom.callScreenShareBtn.classList.remove('off');
      if (dom.iconScreen) dom.iconScreen.className = 'bi bi-display fs-5';
    }
    if (dom.localCamOffPlaceholder) dom.localCamOffPlaceholder.classList.add('d-none');
  }

  // Create RTCPeerConnection and wire listeners
  function setupPeerConnection(targetUserId, callType) {
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // ICE Candidate handler
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketInstance && targetUserId) {
        socketInstance.emit('call:ice_candidate', {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Track handler
    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;

      if (dom.remoteVideo) {
        dom.remoteVideo.srcObject = stream;
      }
      if (dom.remoteAudio) {
        dom.remoteAudio.srcObject = stream;
      }

      // Check tracks to toggle video vs audio view
      const hasVideo = stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
      if (callType === 'video' && hasVideo) {
        if (dom.remoteAudioPlaceholder) dom.remoteAudioPlaceholder.classList.add('d-none');
        if (dom.remoteVideo) dom.remoteVideo.classList.remove('d-none');
      } else {
        if (dom.remoteAudioPlaceholder) {
          dom.remoteAudioPlaceholder.classList.remove('d-none');
          dom.remoteAudioPlaceholder.classList.add('d-flex');
        }
      }
    };

    // Connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection ? peerConnection.connectionState : 'closed';
      if (dom.callQualityBadge) {
        if (state === 'connected') {
          dom.callQualityBadge.textContent = 'Connected';
          dom.callQualityBadge.className = 'badge bg-success bg-opacity-75 text-white d-none d-sm-inline';
        } else if (state === 'connecting') {
          dom.callQualityBadge.textContent = 'Connecting...';
          dom.callQualityBadge.className = 'badge bg-warning bg-opacity-75 text-dark d-none d-sm-inline';
        } else if (state === 'disconnected' || state === 'failed') {
          dom.callQualityBadge.textContent = 'Reconnecting...';
          dom.callQualityBadge.className = 'badge bg-danger bg-opacity-75 text-white d-none d-sm-inline';
        }
      }

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (state === 'failed') {
          showCallToast('Call connection failed');
          cleanupCall();
        }
      }
    };

    return peerConnection;
  }

  // Flush queued ICE candidates after remote description is set
  async function flushPendingCandidates() {
    if (!peerConnection || !peerConnection.remoteDescription) return;
    while (pendingCandidates.length > 0) {
      const cand = pendingCandidates.shift();
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Error adding buffered ICE candidate:', e);
      }
    }
  }

  // Initiate an Outgoing Call (Audio or Video)
  async function startCall(targetUser, callType = 'video', conversationId = null) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support audio/video calls.');
      return;
    }

    if (currentCall) {
      showCallToast('You are already on a call.');
      return;
    }

    if (!targetUser || !targetUser._id) {
      showCallToast('Unable to start call: user not identified.');
      return;
    }

    const peerId = targetUser._id.toString();
    const peerName = targetUser.username || 'Contact';

    try {
      // 1. Get user media
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === 'video'
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
      };

      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (dom.localVideo) dom.localVideo.srcObject = localStream;

      // 2. Setup RTCPeerConnection
      setupPeerConnection(peerId, callType);

      // 3. Create WebRTC Offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await peerConnection.setLocalDescription(offer);

      // 4. Save call state
      currentCall = {
        peer: targetUser,
        callType,
        conversationId,
        isCaller: true,
        offer,
      };

      // 5. Update UI for Outgoing Call Dialog
      if (dom.outgoingPeerName) dom.outgoingPeerName.textContent = peerName;
      if (dom.outgoingPeerAvatar) {
        dom.outgoingPeerAvatar.textContent = getInitials(peerName);
        if (targetUser.profilePicture) {
          dom.outgoingPeerAvatar.innerHTML = `<img src="${targetUser.profilePicture}" alt="${peerName}" class="w-100 h-100 rounded-circle object-fit-cover">`;
        }
      }
      if (dom.outgoingCallStatus) {
        dom.outgoingCallStatus.innerHTML = `<span class="spinner-grow spinner-grow-sm text-primary me-1" role="status"></span> Ringing ${callType === 'video' ? 'video' : 'voice'} call...`;
      }
      if (dom.outgoingCallModal) dom.outgoingCallModal.classList.remove('d-none');

      // 6. Play dial tone
      playDialTone();

      // 7. Emit initiate event via Socket.IO
      socketInstance.emit('call:initiate', {
        targetUserId: peerId,
        conversationId,
        callType,
        offer,
      });

      // 8. 45s Timeout if peer doesn't answer
      callTimeoutTimer = setTimeout(() => {
        if (currentCall && currentCall.isCaller) {
          showCallToast('No answer from ' + peerName);
          cancelOutgoingCall();
        }
      }, 45000);
    } catch (err) {
      console.error('Failed to start call:', err);
      cleanupCall();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Camera or microphone permission was denied. Please allow permissions in your browser settings to make calls.');
      } else {
        alert('Could not start call: ' + (err.message || 'Media device error'));
      }
    }
  }

  // Cancel Outgoing Call
  function cancelOutgoingCall() {
    if (currentCall && currentCall.peer) {
      socketInstance.emit('call:end', {
        targetUserId: currentCall.peer._id,
      });
    }
    playEndTone();
    cleanupCall();
  }

  // Incoming Call Handler
  function handleIncomingCall(data) {
    const { caller, callType, offer, conversationId } = data || {};
    if (!caller) return;

    // If currently in a call, automatically reply busy
    if (currentCall) {
      socketInstance.emit('call:reject', {
        callerId: caller._id,
        reason: 'busy',
      });
      return;
    }

    currentCall = {
      peer: caller,
      callType: callType || 'video',
      conversationId,
      isCaller: false,
      offer,
    };

    // Update Incoming Call UI
    const callerName = caller.username || 'Someone';
    if (dom.incomingCallerName) dom.incomingCallerName.textContent = callerName;
    if (dom.incomingCallerAvatar) {
      dom.incomingCallerAvatar.textContent = getInitials(callerName);
      if (caller.profilePicture) {
        dom.incomingCallerAvatar.innerHTML = `<img src="${caller.profilePicture}" alt="${callerName}" class="w-100 h-100 rounded-circle object-fit-cover">`;
      }
    }
    if (dom.incomingCallTypeLabel) {
      dom.incomingCallTypeLabel.innerHTML =
        callType === 'video'
          ? '<i class="bi bi-camera-video me-1"></i> Incoming Video Call...'
          : '<i class="bi bi-telephone me-1"></i> Incoming Voice Call...';
    }

    // Play ringtone and show dialog
    playIncomingRingtone();
    if (dom.incomingCallModal) dom.incomingCallModal.classList.remove('d-none');
  }

  // Accept Incoming Call
  async function acceptIncomingCall() {
    if (!currentCall || !currentCall.peer || !currentCall.offer) return;
    const { peer, callType, offer } = currentCall;
    const peerId = peer._id.toString();

    stopAudioTones();
    if (dom.incomingCallModal) dom.incomingCallModal.classList.add('d-none');

    try {
      // 1. Get user media
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === 'video'
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
      };

      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (dom.localVideo) dom.localVideo.srcObject = localStream;

      // 2. Setup RTCPeerConnection
      setupPeerConnection(peerId, callType);

      // 3. Set Remote Description from Caller's Offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingCandidates();

      // 4. Create Answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // 5. Emit call:accept
      socketInstance.emit('call:accept', {
        callerId: peerId,
        answer,
        callType,
      });

      // 6. Transition to Active Call View
      showActiveCallView(peer, callType);
      startCallTimer();
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanupCall();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Microphone and camera permissions are required to answer the call.');
      } else {
        alert('Could not connect call: ' + (err.message || 'Media error'));
      }
    }
  }

  // Decline Incoming Call
  function declineIncomingCall() {
    if (currentCall && currentCall.peer) {
      socketInstance.emit('call:reject', {
        callerId: currentCall.peer._id,
        reason: 'declined',
      });
    }
    playEndTone();
    cleanupCall();
  }

  // Handle Call Accepted by Callee (Caller receives this)
  async function handleCallAccepted(data) {
    if (!currentCall || !peerConnection) return;
    stopAudioTones();
    if (callTimeoutTimer) {
      clearTimeout(callTimeoutTimer);
      callTimeoutTimer = null;
    }

    if (dom.outgoingCallModal) dom.outgoingCallModal.classList.add('d-none');

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      await flushPendingCandidates();

      showActiveCallView(currentCall.peer, currentCall.callType);
      startCallTimer();
    } catch (err) {
      console.error('Error handling call acceptance:', err);
      showCallToast('Failed to establish peer connection.');
      cleanupCall();
    }
  }

  // Handle Call Rejected
  function handleCallRejected(data) {
    stopAudioTones();
    if (callTimeoutTimer) {
      clearTimeout(callTimeoutTimer);
      callTimeoutTimer = null;
    }

    let msg = 'Call declined';
    if (data.reason === 'busy') msg = (currentCall?.peer?.username || 'User') + ' is busy on another call.';
    else if (data.reason === 'offline') msg = (currentCall?.peer?.username || 'User') + ' is currently offline.';
    showCallToast(msg);

    playEndTone();
    cleanupCall();
  }

  // Handle Remote ICE Candidate
  async function handleRemoteIceCandidate(data) {
    if (!data.candidate) return;
    if (peerConnection && peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.warn('Error adding received ICE candidate:', e);
      }
    } else {
      pendingCandidates.push(data.candidate);
    }
  }

  // Handle Remote Call Ended
  function handleRemoteCallEnded() {
    showCallToast('Call ended');
    playEndTone();
    cleanupCall();
  }

  // Display Active In-Call View
  function showActiveCallView(peer, callType) {
    const peerName = peer?.username || 'Contact';

    if (dom.activeCallPeerName) dom.activeCallPeerName.textContent = peerName;
    if (dom.remoteAudioName) dom.remoteAudioName.textContent = peerName;
    if (dom.minimizedCallPeerName) dom.minimizedCallPeerName.textContent = peerName;

    if (dom.remoteAudioAvatar) {
      dom.remoteAudioAvatar.textContent = getInitials(peerName);
      if (peer?.profilePicture) {
        dom.remoteAudioAvatar.innerHTML = `<img src="${peer.profilePicture}" alt="${peerName}" class="w-100 h-100 rounded-circle object-fit-cover">`;
      }
    }

    // Configure Video vs Audio Mode
    if (callType === 'video') {
      if (dom.remoteVideo) dom.remoteVideo.classList.remove('d-none');
      if (dom.localVideoPip) dom.localVideoPip.classList.remove('d-none');
      if (dom.remoteAudioPlaceholder) dom.remoteAudioPlaceholder.classList.add('d-none');
      if (dom.callToggleCamBtn) dom.callToggleCamBtn.classList.remove('d-none');
      if (dom.callScreenShareBtn) dom.callScreenShareBtn.classList.remove('d-none');
    } else {
      // Voice call mode
      if (dom.remoteVideo) dom.remoteVideo.classList.add('d-none');
      if (dom.localVideoPip) dom.localVideoPip.classList.add('d-none');
      if (dom.remoteAudioPlaceholder) {
        dom.remoteAudioPlaceholder.classList.remove('d-none');
        dom.remoteAudioPlaceholder.classList.add('d-flex');
      }
      if (dom.callToggleCamBtn) dom.callToggleCamBtn.classList.add('d-none');
      if (dom.callScreenShareBtn) dom.callScreenShareBtn.classList.add('d-none');
    }

    if (dom.activeCallModal) dom.activeCallModal.classList.remove('d-none');
  }

  // End Active Call (initiated locally)
  function endActiveCall() {
    if (currentCall && currentCall.peer) {
      socketInstance.emit('call:end', {
        targetUserId: currentCall.peer._id,
      });
    }
    playEndTone();
    showCallToast('Call ended');
    cleanupCall();
  }

  // Toggle Microphone (Mute / Unmute)
  function toggleMicrophone() {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    isMicMuted = !isMicMuted;
    audioTrack.enabled = !isMicMuted;

    if (dom.callToggleMicBtn) {
      dom.callToggleMicBtn.classList.toggle('off', isMicMuted);
      dom.callToggleMicBtn.title = isMicMuted ? 'Unmute Microphone' : 'Mute Microphone';
      if (dom.iconMic) {
        dom.iconMic.className = isMicMuted ? 'bi bi-mic-mute-fill fs-5' : 'bi bi-mic-fill fs-5';
      }
    }

    if (currentCall && currentCall.peer) {
      socketInstance.emit('call:toggle_track', {
        targetUserId: currentCall.peer._id,
        kind: 'audio',
        enabled: !isMicMuted,
      });
    }
  }

  // Toggle Camera (Video On / Off)
  function toggleCamera() {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    isCamOff = !isCamOff;
    videoTrack.enabled = !isCamOff;

    if (dom.callToggleCamBtn) {
      dom.callToggleCamBtn.classList.toggle('off', isCamOff);
      dom.callToggleCamBtn.title = isCamOff ? 'Turn Camera On' : 'Turn Camera Off';
      if (dom.iconCam) {
        dom.iconCam.className = isCamOff ? 'bi bi-camera-video-off-fill fs-5' : 'bi bi-camera-video-fill fs-5';
      }
    }

    if (dom.localCamOffPlaceholder) {
      dom.localCamOffPlaceholder.classList.toggle('d-none', !isCamOff);
    }

    if (currentCall && currentCall.peer) {
      socketInstance.emit('call:toggle_track', {
        targetUserId: currentCall.peer._id,
        kind: 'video',
        enabled: !isCamOff,
      });
    }
  }

  // Toggle Screen Sharing
  async function toggleScreenShare() {
    if (!peerConnection) return;

    if (isScreenSharing) {
      // Revert back to camera track
      try {
        if (screenStream) {
          screenStream.getTracks().forEach((t) => t.stop());
          screenStream = null;
        }

        const cameraTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && cameraTrack) {
          await sender.replaceTrack(cameraTrack);
        }
        if (dom.localVideo) dom.localVideo.srcObject = localStream;
        isScreenSharing = false;

        if (dom.callScreenShareBtn) {
          dom.callScreenShareBtn.classList.remove('off');
          if (dom.iconScreen) dom.iconScreen.className = 'bi bi-display fs-5';
        }
      } catch (e) {
        console.error('Error stopping screen share:', e);
      }
      return;
    }

    // Start Screen Sharing
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        showCallToast('Screen sharing is not supported by your browser.');
        return;
      }

      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }
      if (dom.localVideo) dom.localVideo.srcObject = screenStream;
      isScreenSharing = true;

      if (dom.callScreenShareBtn) {
        dom.callScreenShareBtn.classList.add('off');
        if (dom.iconScreen) dom.iconScreen.className = 'bi bi-stop-circle-fill fs-5 text-warning';
      }

      screenTrack.onended = () => {
        if (isScreenSharing) toggleScreenShare();
      };
    } catch (e) {
      console.warn('Screen share cancelled or failed:', e);
    }
  }

  // Minimize Active Call to Floating Pill
  function minimizeCall() {
    if (dom.activeCallModal) dom.activeCallModal.classList.add('d-none');
    if (dom.minimizedCallPill) dom.minimizedCallPill.classList.remove('d-none');
  }

  // Expand Minimized Call to Full Overlay
  function expandCall() {
    if (dom.minimizedCallPill) dom.minimizedCallPill.classList.add('d-none');
    if (dom.activeCallModal) dom.activeCallModal.classList.remove('d-none');
  }

  // Toggle Fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (dom.activeCallModal && dom.activeCallModal.requestFullscreen) {
        dom.activeCallModal.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // Bind UI Events
  function bindCallUiEvents() {
    // Incoming modal buttons
    if (dom.btnAcceptCall) dom.btnAcceptCall.addEventListener('click', acceptIncomingCall);
    if (dom.btnDeclineCall) dom.btnDeclineCall.addEventListener('click', declineIncomingCall);

    // Outgoing modal button
    if (dom.btnCancelCall) dom.btnCancelCall.addEventListener('click', cancelOutgoingCall);

    // In-call controls
    if (dom.btnEndActiveCall) dom.btnEndActiveCall.addEventListener('click', endActiveCall);
    if (dom.callToggleMicBtn) dom.callToggleMicBtn.addEventListener('click', toggleMicrophone);
    if (dom.callToggleCamBtn) dom.callToggleCamBtn.addEventListener('click', toggleCamera);
    if (dom.callScreenShareBtn) dom.callScreenShareBtn.addEventListener('click', toggleScreenShare);

    // Window control buttons
    if (dom.btnMinimizeCall) dom.btnMinimizeCall.addEventListener('click', minimizeCall);
    if (dom.btnExpandCall) dom.btnExpandCall.addEventListener('click', expandCall);
    if (dom.minimizedCallTrigger) dom.minimizedCallTrigger.addEventListener('click', expandCall);
    if (dom.btnEndMinimizedCall) dom.btnEndMinimizedCall.addEventListener('click', endActiveCall);
    if (dom.btnFullscreenCall) dom.btnFullscreenCall.addEventListener('click', toggleFullscreen);

    // Header buttons (Triggering call from current active conversation)
    if (dom.headerAudioCallBtn) {
      dom.headerAudioCallBtn.addEventListener('click', () => {
        const conv = window.ChatInApp?.getActiveConversation ? window.ChatInApp.getActiveConversation() : null;
        if (!conv) {
          showCallToast('Select a conversation first to make a call.');
          return;
        }
        if (conv.conversationType === 'group' || conv.isGroup) {
          showCallToast('Group audio calling will be available in the next release. Direct 1:1 call supported.');
          return;
        }
        const otherUser = window.ChatInApp?.getOtherUser ? window.ChatInApp.getOtherUser(conv) : null;
        if (!otherUser) {
          showCallToast('Could not find participant to call.');
          return;
        }
        startCall(otherUser, 'audio', conv._id);
      });
    }

    if (dom.headerVideoCallBtn) {
      dom.headerVideoCallBtn.addEventListener('click', () => {
        const conv = window.ChatInApp?.getActiveConversation ? window.ChatInApp.getActiveConversation() : null;
        if (!conv) {
          showCallToast('Select a conversation first to make a call.');
          return;
        }
        if (conv.conversationType === 'group' || conv.isGroup) {
          showCallToast('Group video calling will be available in the next release. Direct 1:1 call supported.');
          return;
        }
        const otherUser = window.ChatInApp?.getOtherUser ? window.ChatInApp.getOtherUser(conv) : null;
        if (!otherUser) {
          showCallToast('Could not find participant to call.');
          return;
        }
        startCall(otherUser, 'video', conv._id);
      });
    }
  }

  // Socket Signaling Listeners
  function registerSocketSignaling(socket) {
    socketInstance = socket;
    window.chatinSocket = socket;

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ice_candidate', handleRemoteIceCandidate);
    socket.on('call:ended', handleRemoteCallEnded);

    socket.on('call:track_toggled', (data) => {
      if (data.kind === 'video') {
        if (!data.enabled) {
          if (dom.remoteAudioPlaceholder) {
            dom.remoteAudioPlaceholder.classList.remove('d-none');
            dom.remoteAudioPlaceholder.classList.add('d-flex');
          }
        } else {
          if (dom.remoteAudioPlaceholder) {
            dom.remoteAudioPlaceholder.classList.add('d-none');
          }
        }
      }
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    bindCallUiEvents();
  });

  // Global ChatInCall Interface
  window.ChatInCall = {
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endActiveCall,
    registerSocketSignaling,
    getIsCallActive: () => !!currentCall,
  };
})();
