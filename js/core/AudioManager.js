// js/core/AudioManager.js

export class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.volume = 0.5;
        this.buffer = null;
        this.isMusicPlaying = false;

        // FIX: Store the promise so we can 'await' it later
        this.musicReady = this.loadMusic(); 
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
            
            console.log("✅ Music decoded and ready.");
        } catch (e) {
            console.error("❌ Failed to load music:", e);
        }
    }   

    playMusic() {
        // If it's already playing, do nothing
        if (this.isMusicPlaying) return;

        // If buffer is still missing, something went wrong with the download
        if (!this.buffer) {
            console.error("Cannot play: Buffer is still empty.");
            return;
        }
        
        console.log("Audio Engine: Starting Stream...");
        this.isMusicPlaying = true; 

        // Stop previous source if exists
        if (this.source) {
            try { this.source.stop(); } catch(e) {}
        }

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.loop = true;
        this.source.connect(this.gainNode);
        
        this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        this.source.start(0);
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