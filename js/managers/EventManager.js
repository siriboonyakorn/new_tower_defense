// js/managers/EventManager.js

/**
 * Manages mid-wave disruption events like EMP pulses, shield generators, etc.
 */
export const EventManager = {
    // Active events currently affecting the game
    activeEvents: [],

    // Cooldown between events (in ms)
    eventCooldown: 30000, // 30 seconds
    lastEventTime: 0,

    // Event definitions
    events: {
        EMP_PULSE: {
            id: 'EMP_PULSE',
            name: 'EMP PULSE',
            description: 'Disables all towers for 3 seconds',
            duration: 3000,
            chance: 0.15, // 15% chance per check
            minWave: 3,
            apply: (game) => {
                console.log('[Event] EMP PULSE activated!');
                for (const tower of game.towers) {
                    tower.isDisabled = true;
                    tower.disabledEndTime = Date.now() + 3000;
                }
                return { message: '⚡ EMP PULSE - TOWERS OFFLINE', color: '#00ffff', type: 'danger' };
            }
        },

        SHIELD_GENERATOR: {
            id: 'SHIELD_GENERATOR',
            name: 'SHIELD GENERATOR',
            description: 'Random enemy gains shield, reducing damage by 50%',
            duration: 10000,
            chance: 0.20,
            minWave: 2,
            apply: (game) => {
                if (game.enemies.length === 0) return null;
                const target = game.enemies[Math.floor(Math.random() * game.enemies.length)];
                if (target) {
                    target.shielded = true;
                    target.shieldEndTime = Date.now() + 10000;
                    console.log('[Event] SHIELD GENERATOR activated on enemy');
                    return { message: '🛡️ SHIELD GENERATOR DETECTED', color: '#00ff88', type: 'warning' };
                }
                return null;
            }
        },

        RESOURCE_DRAIN: {
            id: 'RESOURCE_DRAIN',
            name: 'RESOURCE DRAIN',
            description: 'Lose 10% of current credits',
            duration: 0, // Instant
            chance: 0.10,
            minWave: 5,
            apply: (game) => {
                const drain = Math.floor(game.credits * 0.1);
                game.credits = Math.max(0, game.credits - drain);
                game.updateResourceDisplay();
                console.log(`[Event] RESOURCE DRAIN - Lost ${drain} credits`);
                return { message: `💀 RESOURCE DRAIN: -${drain} CREDITS`, color: '#ff0055', type: 'danger' };
            }
        },

        SPEED_BOOST: {
            id: 'SPEED_BOOST',
            name: 'SPEED BOOST',
            description: 'All enemies gain 30% movement speed for 5 seconds',
            duration: 5000,
            chance: 0.15,
            minWave: 4,
            apply: (game) => {
                for (const enemy of game.enemies) {
                    enemy.speedBoost = 1.3;
                    enemy.speedBoostEndTime = Date.now() + 5000;
                }
                console.log('[Event] SPEED BOOST activated');
                return { message: '⚡ ENEMY SPEED BOOST', color: '#ffaa00', type: 'warning' };
            }
        }
    },

    /**
     * Initialize event manager for a new game
     */
    init() {
        this.activeEvents = [];
        this.lastEventTime = Date.now();
    },

    /**
     * Check and potentially trigger random events
     * Called during wave active phase
     * @param {Game} game - The game instance
     * @returns {object|null} Event notification if triggered
     */
    update(game) {
        const now = Date.now();

        // Check cooldown
        if (now - this.lastEventTime < this.eventCooldown) {
            return null;
        }

        // Only trigger during active waves
        if (!game.waveInProgress || game.enemies.length === 0) {
            return null;
        }

        // Roll for each event
        for (const [key, event] of Object.entries(this.events)) {
            // Check wave requirement
            if (game.waveIndex < event.minWave) continue;

            // Roll chance
            if (Math.random() < event.chance) {
                const result = event.apply(game);
                if (result) {
                    this.lastEventTime = now;
                    this.activeEvents.push({
                        id: key,
                        startTime: now,
                        duration: event.duration
                    });
                    return result;
                }
            }
        }

        return null;
    },

    /**
     * Clean up expired events and effects
     * @param {Game} game - The game instance
     */
    cleanup(game) {
        const now = Date.now();

        // Remove expired active events
        this.activeEvents = this.activeEvents.filter(e => {
            return now - e.startTime < e.duration || e.duration === 0;
        });

        // Clean up enemy effects
        for (const enemy of game.enemies) {
            if (enemy.shielded && now > enemy.shieldEndTime) {
                enemy.shielded = false;
            }
            if (enemy.speedBoost && now > enemy.speedBoostEndTime) {
                enemy.speedBoost = 1;
            }
        }
    },

    /**
     * Get active event names for UI display
     */
    getActiveEventNames() {
        return this.activeEvents.map(e => this.events[e.id]?.name || e.id);
    }
};
