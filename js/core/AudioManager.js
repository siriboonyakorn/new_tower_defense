// js/core/AudioManager.js

export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.source = null;
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.volume = 0.5;
        this.buffer = null;

        // Load the file immediately using 'fetch' (Bypasses 416 errors)
        this.loadMusic();
    }

    async loadMusic() {
    try {
        console.log("Fetching music from assets/audio/music.mp3...");
        
        // UPDATE THIS LINE to match your new folder location:
        const response = await fetch('assets/audio/music.mp3');
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
        console.log("SUCCESS: Music decoded and ready to play.");
    } catch (error) {
        console.error("Music Load Failed:", error);
    }
}

    playMusic() {
        // Resume context if it was suspended (Browser requirement)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (!this.buffer) {
            console.log("Music not loaded yet...");
            return;
        }

        // If already playing, stop previous instance
        if (this.source) {
            this.source.stop();
        }

        // Create a new source node (Standard for Web Audio API)
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.loop = true;
        this.source.connect(this.gainNode);
        
        this.source.start(0);
        console.log("Playing Music via Web Audio API");
    }

    setVolume(value) {
        // Value 0-100 converted to 0.0-1.0
        this.volume = value / 100;
        this.gainNode.gain.value = this.volume;
    }
    // Add this to your AudioManager class
async playUI(type) {
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
    
    // We can use the same music logic for SFX, 
    // but for now, let's just create a "Synthetic Beep" 
    // so you don't even need a new file!
    const osc = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    osc.type = 'square'; // Makes it sound "retro/tech"
    osc.frequency.setValueAtTime(880, this.audioContext.currentTime); // High pitch
    
    envelope.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

    osc.connect(envelope);
    envelope.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
    }
}