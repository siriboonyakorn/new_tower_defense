// js/managers/DailyModifier.js

/**
 * Generates daily modifiers based on the current date
 * These create variety between play sessions
 */
export const DailyModifier = {
    // Current active modifier
    activeModifier: null,

    // All possible modifiers
    modifiers: [
        {
            id: 'SPEED_SURGE',
            name: 'Speed Surge',
            description: 'Enemies move 20% faster',
            icon: '⚡',
            apply: (game) => {
                // Applied when spawning enemies
            },
            enemySpeedMult: 1.2,
            towerDamageMult: 1.0,
            towerRangeMult: 1.0
        },
        {
            id: 'ARMOR_PLATING',
            name: 'Armor Plating',
            description: 'Enemies have 25% more HP',
            icon: '🛡️',
            apply: (game) => { },
            enemyHpMult: 1.25,
            towerDamageMult: 1.0,
            towerRangeMult: 1.0
        },
        {
            id: 'OVERCHARGE',
            name: 'Overcharge',
            description: 'Towers deal 30% more damage',
            icon: '🔥',
            apply: (game) => { },
            enemySpeedMult: 1.0,
            towerDamageMult: 1.3,
            towerRangeMult: 1.0
        },
        {
            id: 'EAGLE_EYE',
            name: 'Eagle Eye',
            description: 'Towers have 25% more range',
            icon: '👁️',
            apply: (game) => { },
            enemySpeedMult: 1.0,
            towerDamageMult: 1.0,
            towerRangeMult: 1.25
        },
        {
            id: 'CREDIT_CRUNCH',
            name: 'Credit Crunch',
            description: 'Start with 25% less credits',
            icon: '💸',
            apply: (game) => {
                game.credits = Math.floor(game.credits * 0.75);
                game.updateResourceDisplay();
            },
            enemySpeedMult: 1.0,
            towerDamageMult: 1.0,
            towerRangeMult: 1.0
        },
        {
            id: 'SWARM_MODE',
            name: 'Swarm Mode',
            description: '50% more enemies, but 30% less HP each',
            icon: '🐝',
            apply: (game) => { },
            enemyHpMult: 0.7,
            enemyCountMult: 1.5,
            towerDamageMult: 1.0,
            towerRangeMult: 1.0
        },
        {
            id: 'DOUBLE_REWARDS',
            name: 'Double Rewards',
            description: 'Enemies drop 2x credits',
            icon: '💰',
            apply: (game) => { },
            enemyRewardMult: 2.0,
            towerDamageMult: 1.0,
            towerRangeMult: 1.0
        }
    ],

    /**
     * Generate today's modifier based on date
     */
    init() {
        const today = new Date().toDateString();
        const hash = this.hashString(today);
        const index = hash % this.modifiers.length;
        this.activeModifier = this.modifiers[index];
        console.log(`[DailyModifier] Today's modifier: ${this.activeModifier.name}`);
        return this.activeModifier;
    },

    /**
     * Simple string hash function
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    },

    /**
     * Apply modifier to game on start
     */
    applyToGame(game) {
        if (!this.activeModifier) return;

        console.log(`[DailyModifier] Applying: ${this.activeModifier.name}`);
        this.activeModifier.apply(game);
    },

    /**
     * Get modifier for enemy stats
     */
    getEnemyModifiers() {
        if (!this.activeModifier) return { hp: 1, speed: 1, reward: 1, count: 1 };
        return {
            hp: this.activeModifier.enemyHpMult || 1,
            speed: this.activeModifier.enemySpeedMult || 1,
            reward: this.activeModifier.enemyRewardMult || 1,
            count: this.activeModifier.enemyCountMult || 1
        };
    },

    /**
     * Get modifier for tower stats
     */
    getTowerModifiers() {
        if (!this.activeModifier) return { damage: 1, range: 1 };
        return {
            damage: this.activeModifier.towerDamageMult || 1,
            range: this.activeModifier.towerRangeMult || 1
        };
    },

    /**
     * Get current modifier info for UI display
     */
    getCurrentInfo() {
        if (!this.activeModifier) return null;
        return {
            name: this.activeModifier.name,
            description: this.activeModifier.description,
            icon: this.activeModifier.icon
        };
    }
};
