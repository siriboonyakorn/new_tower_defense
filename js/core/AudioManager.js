// js/core/AudioManager.js

export class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.volume = 0.5;
        this.buffer = null;

        // FIX: Store the "loading" process in a variable we can wait for later
        this.musicReady = this.loadMusic(); 
    }

    // ... keep resumeContext() ...

    async loadMusic() {
        try {
            const response = await fetch('assets/audio/music.mp3');
            const arrayBuffer = await response.arrayBuffer();
            this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log("Music Ready!");
        } catch (e) {
            console.error("Music failed to load, but game will continue:", e);
        }
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
        
        // This is the critical line: we wait for the decoding to finish
        this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        console.log("✅ Music decoded and buffer filled.");
    } catch (e) {
        console.error("❌ Failed to load music:", e);
    }
}   

    playMusic() {
    console.log("Attempting to play music...");
    
    if (!this.buffer) {
        console.error("Cannot play: Buffer is empty!");
        return;
    }
    
    // 1. If music is already playing, stop it first
    if (this.source) {
        try { this.source.stop(); } catch(e) {}
    }

    // 2. Create the source
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;

    // 3. Connect to the gain node (Volume Control)
    this.source.connect(this.gainNode);
    
    // 4. Connect gain node to speakers
    this.gainNode.connect(this.audioContext.destination);

    // 5. Set volume explicitly just in case
    this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

    // 6. START
    this.source.start(0);
    console.log("Music source started at volume:", this.volume);
    }

    setVolume(value) {
        this.volume = value / 100;
        this.gainNode.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.1);
    }

    // --- RESTORING YOUR ORIGINAL SHARP SFX ---
    playUI(type) {
        if (this.audioContext.state === 'suspended') return;

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        if (type === 'hover') {
            // Your original high-tech digital chirp
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(880, now); // High pitch (A5)
            
            gainNode.gain.setValueAtTime(this.volume * 0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.start();
            osc.stop(now + 0.1);
        } 
        else if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            gainNode.gain.setValueAtTime(this.volume * 0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start();
            osc.stop(now + 0.05);
        }
    }
}