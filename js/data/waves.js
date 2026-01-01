// js/data/waves.js

// 1. Define the rules for each map
const WAVE_CONFIGS = {
    'sector1': { count: 10, difficulty: 1.0, startReward: 100 }, // Easy, Short
    'sector2': { count: 15, difficulty: 1.5, startReward: 120 }, // Normal
    'sector3': { count: 20, difficulty: 2.0, startReward: 150 }, // Hard
    'sector4': { count: 30, difficulty: 3.0, startReward: 200 }, // Insane
    'sector5': { count: 40, difficulty: 5.0, startReward: 300 }  // Omega
};

// 2. A Helper function to pick enemy types based on wave number
function getEnemyType(waveNum, totalWaves) {
    const progress = waveNum / totalWaves; // 0.0 to 1.0
    
    // Simple logic: As progress goes up, spawn harder enemies
    if (progress < 0.2) return 'SCOUT';      // Early game
    if (progress < 0.4) return 'SOLDIER';    // Mid-early
    if (progress < 0.6) return 'TANK';       // Mid game
    if (progress < 0.8) return 'HEAVY';      // Late game
    if (progress < 0.9) return 'BOSS';       // Very late
    return 'BOSS_MEGA';                      // End game
}

// 3. The Generator Function
function generateWaves(config) {
    let waves = [];
    for (let i = 1; i <= config.count; i++) {
        const type = getEnemyType(i, config.count);
        
        // Count increases slightly every wave
        const enemyCount = Math.floor(5 + (i * 1.5)); 
        
        // Reward increases with difficulty
        const reward = Math.floor(config.startReward + (i * 10 * config.difficulty));

        waves.push({
            waveNumber: i,
            type: type,
            count: enemyCount,
            interval: 1000 - (i * 10), // Spawn faster later
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