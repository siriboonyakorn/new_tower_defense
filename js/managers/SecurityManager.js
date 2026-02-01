/**
 * SecurityManager.js
 * Detects and prevents common client-side exploits and cheats.
 */
import { notifier } from './NotificationManager.js';

export const SecurityManager = {
    lastTickTime: 0,
    tickRates: [],
    MAX_TICK_RATE: 5.0, // Relaxed to support 240Hz monitors (approx 4x 60Hz)

    lastCredits: 0,
    isCompromised: false,

    init(game) {
        console.log('[SecurityManager] Protocol Engaged.');
        this.lastTickTime = performance.now();
        this.lastCredits = game.credits;

        // Start heartbeat check
        setInterval(() => this.heartbeat(game), 2000);
    },

    reset() {
        console.log('[SecurityManager] Resetting integrity buffers.');
        this.tickRates = [];
        this.lastTickTime = performance.now();
    },

    /**
     * Called every frame to monitor game speed (Anti-SpeedHack)
     */
    validateTick() {
        if (this.isCompromised) return false;

        const now = performance.now();
        const delta = now - this.lastTickTime;
        this.lastTickTime = now;

        // Skip massive spikes or tiny deltas (browser artifacts or extreme lag)
        if (delta < 2 || delta > 500) return true;

        // Ideal delta is 16.6ms (60fps)
        const currentRate = 16.66 / delta;

        // Cap individual tick rate contribution to prevent a single 1ms frame 
        // from destroying the average.
        this.tickRates.push(Math.min(currentRate, 4.0));

        if (this.tickRates.length > 200) this.tickRates.shift();

        if (this.tickRates.length >= 150) {
            const avgRate = this.tickRates.reduce((a, b) => a + b, 0) / this.tickRates.length;

            if (avgRate > this.MAX_TICK_RATE) {
                console.warn(`[Security] Speed warning: ${avgRate.toFixed(2)}x (Delta: ${delta.toFixed(2)}ms)`);
                this.flagCheat(`TEMPORAL ANOMALY DETECTED: Engine speed ${avgRate.toFixed(2)}x exceeded safety limits.`);
                return false;
            }
        }
        return true;
    },

    /**
     * Periodically check for impossible state changes
     */
    heartbeat(game) {
        if (this.isCompromised) return;

        // 1. Credit Check: Ensure credits didn't jump by an impossible amount
        // Max income per wave is generally < 5000 in early/mid game
        const creditDiff = game.credits - this.lastCredits;
        if (creditDiff > 10000 && !game.isPaused) {
            this.flagCheat('ECONOMY BREACH: Suspicious credit injection detected.');
        }
        this.lastCredits = game.credits;

        // 2. Lives Check
        if (game.lives > game.maxLives) {
            game.lives = game.maxLives;
            this.flagCheat('INTEGRITY ERROR: Hull integrity exceeded maximum specifications.');
        }
    },

    flagCheat(message) {
        if (this.isCompromised) return;

        console.error(`[SecurityManager] ${message}`);
        this.isCompromised = true;

        // Notify user via in-game system
        if (notifier && typeof notifier.notify === 'function') {
            notifier.notify(
                'SYSTEM COMPROMISED: Engine integrity failure.',
                'danger',
                10000
            );
        }

        // Suspend game logic in Game.js if needed, or simply stop rewarding players.
        if (window.game) {
            window.game.isPaused = true;
            window.game.isRunning = false;
        }
    }
};
