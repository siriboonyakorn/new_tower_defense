// js/managers/AdaptationManager.js

/**
 * Tracks player strategy and adapts enemy spawns accordingly
 */
export const AdaptationManager = {
    // Damage tracking by tower type
    damageByType: {
        laser: 0,
        machine: 0,
        rail: 0,
        eco: 0,
        spawner: 0
    },

    // Thresholds for adaptation triggers
    thresholds: {
        LASER_RESIST: 5000,   // After 5000 laser damage, spawn resistant enemies
        SLOW_IMMUNE: 3000,    // After 3000 slow applications, spawn immune enemies
        AOE_SPLIT: 4000       // After 4000 splash damage, spawn splitting enemies
    },

    // Track what adaptations have been triggered
    triggeredAdaptations: new Set(),

    // Slow application counter
    slowApplications: 0,

    // Splash damage counter
    splashDamage: 0,

    // Track total damage for saturation calculation
    totalSessionDamage: 0,

    /**
     * Initialize for a new game
     */
    init() {
        this.damageByType = {
            laser: 0,
            machine: 0,
            rail: 0,
            flak: 0,
            commander: 0,
            spawner: 0,
            eco: 0
        };
        this.totalSessionDamage = 0;
        this.triggeredAdaptations = new Set();
        this.slowApplications = 0;
        this.splashDamage = 0;
    },

    /**
     * Track damage dealt by a tower type
     * @param {string} towerTypeId - The tower type that dealt damage
     * @param {number} amount - Amount of damage dealt
     */
    trackDamage(towerTypeId, amount) {
        if (this.damageByType[towerTypeId] !== undefined) {
            this.damageByType[towerTypeId] += amount;
            this.totalSessionDamage += amount;
        }
    },

    /**
     * Get damage multiplier for a tower type based on saturation
     * If one type does > 40% of total damage, it starts to lose effectiveness
     */
    getDamageMultiplier(towerTypeId) {
        if (this.totalSessionDamage < 2000) return 1.0; // Grace period

        const damageRatio = this.damageByType[towerTypeId] / this.totalSessionDamage;

        if (damageRatio > 0.4) {
            // Gradually reduce damage from 1.0 down to 0.65 (35% reduction)
            const penalty = Math.min(0.35, (damageRatio - 0.4) * 2);
            return 1.0 - penalty;
        }

        return 1.0;
    },

    /**
     * Track slow application
     */
    trackSlow() {
        this.slowApplications++;
    },

    /**
     * Track splash/AoE damage
     */
    trackSplash(amount) {
        this.splashDamage += amount;
        this.totalSessionDamage += amount;
    },

    /**
     * Check and apply adaptations to a spawn queue
     * @param {string[]} spawnQueue - The current spawn queue to modify
     * @param {number} waveIndex - Current wave number
     * @returns {string[]} Modified spawn queue
     */
    adaptSpawnQueue(spawnQueue, waveIndex) {
        // Only adapt after wave 3
        if (waveIndex < 3) return spawnQueue;

        const adapted = [...spawnQueue];

        // 1. Laser Resistance (Energy Shields)
        const laserRatio = this.totalSessionDamage > 0 ? this.damageByType.laser / this.totalSessionDamage : 0;
        if ((this.damageByType.laser > this.thresholds.LASER_RESIST || laserRatio > 0.5) &&
            !this.triggeredAdaptations.has('LASER_RESIST')) {

            console.log('[Adaptation] Laser resistance triggered!');
            if (window.notifier) window.notifier.notify('⚠️ ADAPTATION: ENEMIES GAINING ENERGY SHIELDS', 'danger');
            this.triggeredAdaptations.add('LASER_RESIST');
        }

        // Apply Shields if triggered
        if (this.triggeredAdaptations.has('LASER_RESIST')) {
            for (let i = 0; i < adapted.length; i++) {
                if (Math.random() < 0.2) adapted[i] = 'SHIELDED';
            }
        }

        // 2. Slow/AoE Adaptation (Teleporters/Splitters)
        if (this.slowApplications > this.thresholds.SLOW_IMMUNE &&
            !this.triggeredAdaptations.has('SLOW_IMMUNE')) {

            console.log('[Adaptation] Slow immunity triggered!');
            if (window.notifier) window.notifier.notify('⚠️ ADAPTATION: ENEMIES GAINING EVASIVE MANEUVERS', 'danger');
            this.triggeredAdaptations.add('SLOW_IMMUNE');
        }

        if (this.triggeredAdaptations.has('SLOW_IMMUNE')) {
            for (let i = 0; i < adapted.length; i++) {
                if (Math.random() < 0.15) adapted[i] = 'TELEPORTER';
            }
        }

        // 3. High Damage Volume (Tougher enemies)
        if (this.totalSessionDamage > 20000 && !this.triggeredAdaptations.has('REINFORCED')) {
            if (window.notifier) window.notifier.notify('⚠️ ADAPTATION: HEAVY REINFORCEMENTS DETECTED', 'danger');
            this.triggeredAdaptations.add('REINFORCED');
        }

        if (this.triggeredAdaptations.has('REINFORCED')) {
            for (let i = 0; i < adapted.length; i++) {
                if (adapted[i] === 'DRONE' && Math.random() < 0.3) adapted[i] = 'TANK';
            }
        }

        return adapted;
    },

    /**
     * Get current adaptation status for debugging
     */
    getStatus() {
        return {
            damageByType: { ...this.damageByType },
            totalSessionDamage: this.totalSessionDamage,
            slowApplications: this.slowApplications,
            splashDamage: this.splashDamage,
            triggered: Array.from(this.triggeredAdaptations)
        };
    }
};
