// js/core/AudioManager.js

export class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.volume = 0.5;
        this.buffer = null;
        this.pauseBuffer = null; // New Buffer
        this.currentSource = null;
        this.isMusicPlaying = false;
        this.currentMode = 'game'; // 'game' or 'pause'

        // Load both tracks
        this.musicReady = Promise.all([
            this.loadMusic(),
            this.loadPauseMusic()
        ]);
    }

    async resumeContext() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    async loadMusic() {
        try {
            const response = await fetch('assets/audio/music.mp3');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log("✅ Main Music loaded.");
        } catch (e) {
            console.error("❌ Failed to load music:", e);
        }
    }

    async loadPauseMusic() {
        try {
            const response = await fetch('assets/audio/pause_music.mp3');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            this.pauseBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log("✅ Pause Music loaded.");
        } catch (e) {
            console.error("❌ Failed to load pause music:", e);
        }
    }

    playMusic() {
        this.playTrack('game');
    }

    // Unified Track Player
    playTrack(mode) {
        if (this.currentMode === mode && this.isMusicPlaying) return; // Already playing this mode

        this.currentMode = mode;
        const targetBuffer = mode === 'pause' ? this.pauseBuffer : this.buffer;

        if (!targetBuffer) {
            console.warn(`Audio: Buffer for ${mode} not ready.`);
            return;
        }

        // Stop current
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch (e) { }
        }

        this.isMusicPlaying = true;
        this.currentSource = this.audioContext.createBufferSource();
        this.currentSource.buffer = targetBuffer;
        this.currentSource.loop = true;
        this.currentSource.connect(this.gainNode);

        // Smooth transition
        this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.5);

        this.currentSource.start(0);
        console.log(`Audio: Switched to ${mode} track.`);
    }

    setVolume(value) {
        this.volume = value / 100;
        this.gainNode.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.1);
    }

    playUI(type) {
        if (this.audioContext.state === 'suspended') return;
        // ... (Keep your existing sound effect code here) ...
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        const now = this.audioContext.currentTime;

        if (type === 'hover') {
            osc.type = 'square'; osc.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(this.volume * 0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(); osc.stop(now + 0.1);
        } else if (type === 'click') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now);
            gainNode.gain.setValueAtTime(this.volume * 0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(); osc.stop(now + 0.05);
        }
    }
}