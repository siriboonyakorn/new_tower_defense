/**
 * ProgressionManager.js
 * Handles player leveling, XP calculations, and currency (Neon Tokens).
 */
export const ProgressionManager = {

    // Config for leveling
    BASE_XP: 1000,
    XP_MULTIPLIER: 1.2, // Each level requires 20% more XP than previous

    /**
     * Calculate XP required for a specific level
     * Formula: Base * (Multiplier ^ (Level - 1))
     */
    getXpForLevel(level) {
        return Math.floor(this.BASE_XP * Math.pow(this.XP_MULTIPLIER, level - 1));
    },

    /**
     * Calculate progress percentage for UI
     */
    getLevelProgress(xp, level) {
        const required = this.getXpForLevel(level);
        // Ensure we don't divide by zero or go over 100% physically
        if (required === 0) return 0;
        return Math.min(100, Math.max(0, (xp / required) * 100));
    },

    /**
     * Calculate rewards for a match outcome
     * @param {string} result - 'win' or 'loss'
     * @param {number} wavesCleared - Number of waves survived
     * @param {number} difficultyMultiplier - Map difficulty multiplier (1.0 to 5.0)
     * @returns {Object} { xp, tokens }
     */
    calculateMatchRewards(result, wavesCleared, difficultyMultiplier = 1.0) {
        let xp = 0;
        let tokens = 0;

        // Base rewards per wave
        const XP_PER_WAVE = 50;
        const TOKENS_PER_WAVE = 10;

        xp += wavesCleared * XP_PER_WAVE;
        tokens += wavesCleared * TOKENS_PER_WAVE;

        // Bonus for winning
        if (result === 'win') {
            xp += 500; // Win bonus
            tokens += 100; // Win bonus
        }

        // Apply difficulty multiplier
        xp = Math.floor(xp * difficultyMultiplier);
        tokens = Math.floor(tokens * difficultyMultiplier);

        return { xp, tokens };
    },

    /**
     * Check if player levels up based on current XP and Level
     * Returns new { level, xp } (carrying over excess XP) or null if no level up
     */
    checkLevelUp(currentXp, currentLevel) {
        let xp = currentXp;
        let level = currentLevel;
        let leveledUp = false;

        let required = this.getXpForLevel(level);

        while (xp >= required) {
            xp -= required;
            level++;
            leveledUp = true;
            required = this.getXpForLevel(level);
        }

        if (leveledUp) {
            return { level, xp };
        }
        return null;
    }
};
