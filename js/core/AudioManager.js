// js/core/AudioManager.js

export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.volume = 0.3; // Default volume
        this.init();
    }

    async init() {
        // Resume context if suspended (Browser policy)
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (e) {
                console.warn("Audio Context Resume failed", e);
            }
        }
    }

    playMusic() {
        // Placeholder for music logic
        // Only run if you actually have a file loaded
        console.log("Music playing...");
    }

    setVolume(val) {
        this.volume = val / 100;
    }

    // --- THIS WAS LIKELY THE CAUSE OF THE CRASH ---
    playUI(type) {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        // Different sounds for different actions
        if (type === 'hover') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gainNode.gain.setValueAtTime(this.volume * 0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } 
        else if (type === 'tower_place') {
            // Heavy mechanical thud
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            gainNode.gain.setValueAtTime(this.volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
        else if (type === 'shoot') {
            // Laser pew
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
            gainNode.gain.setValueAtTime(this.volume * 0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    }
}