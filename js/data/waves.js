// js/data/waves.js

// 1. Define the rules for each map
const WAVE_CONFIGS = {
    'sector1': { count: 10, difficulty: 1.0, startReward: 100 }, // Easy, Short
    'sector2': { count: 15, difficulty: 1.5, startReward: 120 }, // Normal
    'sector3': { count: 20, difficulty: 2.0, startReward: 150 }, // Hard
    'sector4': { count: 30, difficulty: 3.0, startReward: 200 }, // Insane
    'sector5': { count: 40, difficulty: 5.0, startReward: 300 }  // Omega
};

// 2. Helper to get a mixed composition
function getWaveComposition(waveNum, totalWaves, count) {
    const progress = waveNum / totalWaves;
    let composition = [];

    // Helper to add multiple enemies
    const add = (type, amount) => {
        for (let k = 0; k < amount; k++) composition.push(type);
    };

    if (progress < 0.15) {
        // Early Game: Pure Scouts
        add('SCOUT', count);
    }
    else if (progress < 0.35) {
        // Mid-Early: Mix Scouts & Soldiers
        const soldiers = Math.floor(count * 0.3); // 30% Soldiers
        add('SOLDIER', soldiers);
        add('SCOUT', count - soldiers);
    }
    else if (progress < 0.55) {
        // Mid Game: Soldiers & Tanks
        const tanks = Math.floor(count * 0.2);
        const soldiers = count - tanks;
        add('TANK', tanks);
        add('SOLDIER', soldiers);
    }
    else if (progress < 0.75) {
        // Late Game: Mix of Heavies, Tanks, Soldiers
        const heavies = Math.floor(count * 0.1);
        const tanks = Math.floor(count * 0.4);
        add('HEAVY', heavies);
        add('TANK', tanks);
        add('SOLDIER', count - heavies - tanks);
    }
    else {
        // End Game: BOSSES and HEAVIES
        const bosses = Math.floor(waveNum / 10); // 1 Boss every 10 waves (ish)
        const ultra = progress > 0.9 ? 1 : 0;

        if (ultra) add('BOSS_MEGA', 1);
        else if (bosses > 0) add('BOSS', bosses);

        const remaining = count - bosses - ultra;
        add('HEAVY', remaining);
    }

    // Shuffle array for randomness in spawn order
    return composition.sort(() => Math.random() - 0.5);
}

// 3. The Generator Function
function generateWaves(config) {
    let waves = [];
    for (let i = 1; i <= config.count; i++) {

        // Count increases slightly every wave
        const enemyCount = Math.floor(5 + (i * 1.5));

        // Reward increases with difficulty
        const reward = Math.floor(config.startReward + (i * 10 * config.difficulty));

        waves.push({
            waveNumber: i,
            composition: getWaveComposition(i, config.count, enemyCount),
            count: enemyCount, // Kept for reference, but composition.length is truth
            interval: Math.max(200, 1000 - (i * 15)), // Cap speed at 200ms
            reward: reward
        });
    }
    return waves;
}

// 4. Generate and Export the final list
export const LEVEL_WAVES = {
    'sector1': generateWaves(WAVE_CONFIGS['sector1']),
    'sector2': generateWaves(WAVE_CONFIGS['sector2']),
    'sector3': generateWaves(WAVE_CONFIGS['sector3']),
    'sector4': generateWaves(WAVE_CONFIGS['sector4']),
    'sector5': generateWaves(WAVE_CONFIGS['sector5'])
};