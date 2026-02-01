// js/data/enemies.js

export const ENEMIES = {
    'SCOUT': {
        name: 'Scout',
        hp: 5,
        speed: 3, // Fast but weak
        reward: 15,
        color: '#ffff00', // Yellow
        radius: 8
    },
    'SOLDIER': {
        name: 'Soldier',
        hp: 12,
        speed: 2, // Average
        reward: 25,
        color: '#00ff00', // Green
        radius: 10
    },
    'TANK': {
        name: 'Tank',
        hp: 40,
        speed: 1, // Slow but tough
        reward: 50,
        color: '#0000ff', // Blue
        radius: 14
    },
    'HEAVY': {
        name: 'Heavy Mech',
        hp: 80,
        speed: 0.8,
        reward: 100,
        color: '#ff00ff', // Purple
        radius: 16
    },
    'BOSS': {
        name: 'Sector Boss',
        hp: 250,
        speed: 0.5,
        reward: 500,
        color: '#ff0000', // Red
        radius: 20
    },
    'BOSS_MEGA': {
        name: 'Omega Class',
        hp: 1000,
        speed: 0.3,
        reward: 2000,
        color: '#ffffff', // White
        radius: 30
    },
    // ADAPTATION ENEMIES
    'SHIELDED': {
        name: 'Shielded Drone',
        hp: 20,
        speed: 2,
        reward: 35,
        color: '#00ffcc', // Teal
        radius: 10,
        laserResist: 0.5 // Takes 50% less laser damage
    },
    'TELEPORTER': {
        name: 'Teleporter',
        hp: 8,
        speed: 4, // Very fast
        reward: 40,
        color: '#ff00ff', // Magenta
        radius: 8,
        slowImmune: true // Cannot be slowed
    },
    'SPLITTER': {
        name: 'Splitter',
        hp: 15,
        speed: 1.5,
        reward: 20,
        color: '#ffaa00', // Orange
        radius: 12,
        splitOnDeath: 2 // Spawns 2 mini enemies on death
    },
    'DRONE': {
        name: 'Drone',
        hp: 8,
        speed: 2.5,
        reward: 20,
        color: '#88ff88',
        radius: 8
    },
    'RUNNER': {
        name: 'Runner',
        hp: 6,
        speed: 4,
        reward: 25,
        color: '#ff8888',
        radius: 7
    },
    'AIR_SCOUT': {
        name: 'Air Scout',
        hp: 10,
        speed: 3.5,
        reward: 35,
        color: '#00ffff',
        radius: 8,
        isAir: true
    },
    'AIR_HEAVY': {
        name: 'Air Tanker',
        hp: 60,
        speed: 1.2,
        reward: 80,
        color: '#55aaff',
        radius: 12,
        isAir: true
    }
};
