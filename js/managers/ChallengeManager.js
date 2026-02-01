// js/managers/ChallengeManager.js

/**
 * Manages hidden objectives and challenges for bonus rewards
 */
export const ChallengeManager = {
    // Active challenges for current game
    activeChallenges: [],

    // Tracking state
    state: {
        towerTypesUsed: new Set(),
        towersSold: 0,
        gameStartTime: 0,
        towersPlaced: 0,
        towersLost: 0,
        creditsEarned: 0
    },

    /**
     * Challenge definitions
     */
    challenges: {
        MINIMALIST: {
            id: 'MINIMALIST',
            name: 'Minimalist',
            description: 'Win using 3 or fewer tower types',
            check: (state) => state.towerTypesUsed.size <= 3,
            reward: { xpMult: 1.5, tokenMult: 1.0 },
            icon: '🎯'
        },
        NO_SELL: {
            id: 'NO_SELL',
            name: 'Commitment',
            description: 'Complete without selling any towers',
            check: (state) => state.towersSold === 0,
            reward: { xpMult: 1.0, tokenMult: 1.25 },
            icon: '💎'
        },
        SPEED_RUN: {
            id: 'SPEED_RUN',
            name: 'Speed Demon',
            description: 'Win in under 5 minutes',
            check: (state) => (Date.now() - state.gameStartTime) < 300000, // 5 min
            reward: { xpMult: 1.25, tokenMult: 1.25 },
            icon: '⚡'
        },
        EFFICIENT: {
            id: 'EFFICIENT',
            name: 'Efficient',
            description: 'Win with 5 or fewer towers',
            check: (state) => state.towersPlaced <= 5,
            reward: { xpMult: 1.75, tokenMult: 1.0 },
            icon: '🏆'
        },
        FLAWLESS: {
            id: 'FLAWLESS',
            name: 'Flawless',
            description: 'Win without losing any lives',
            check: (state, game) => game && game.lives === game.maxLives,
            reward: { xpMult: 2.0, tokenMult: 1.5 },
            icon: '⭐'
        }
    },

    /**
     * Initialize tracking for a new game
     */
    init() {
        this.state = {
            towerTypesUsed: new Set(),
            towersSold: 0,
            gameStartTime: Date.now(),
            towersPlaced: 0,
            towersLost: 0,
            creditsEarned: 0
        };

        // All challenges are active by default
        this.activeChallenges = Object.keys(this.challenges);
        console.log('[ChallengeManager] Initialized with challenges:', this.activeChallenges);
    },

    /**
     * Track tower placement
     */
    onTowerPlaced(towerType) {
        this.state.towerTypesUsed.add(towerType.id);
        this.state.towersPlaced++;
    },

    /**
     * Track tower sold
     */
    onTowerSold() {
        this.state.towersSold++;
    },

    /**
     * Track tower lost (destroyed/sacrificed)
     */
    onTowerLost() {
        this.state.towersLost++;
    },

    /**
     * Evaluate all challenges at game end
     * @param {Game} game - The game instance
     * @returns {{ completed: object[], totalXpMult: number, totalTokenMult: number }}
     */
    evaluate(game) {
        const completed = [];
        let totalXpMult = 1.0;
        let totalTokenMult = 1.0;

        for (const challengeId of this.activeChallenges) {
            const challenge = this.challenges[challengeId];
            if (challenge && challenge.check(this.state, game)) {
                completed.push(challenge);
                totalXpMult *= challenge.reward.xpMult;
                totalTokenMult *= challenge.reward.tokenMult;
                console.log(`[ChallengeManager] Challenge completed: ${challenge.name}`);
            }
        }

        return {
            completed,
            totalXpMult,
            totalTokenMult
        };
    },

    /**
     * Get all challenge info for UI display
     */
    getAllChallenges() {
        return Object.values(this.challenges);
    }
};
