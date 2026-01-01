// js/data/enemies.js

export const ENEMIES = {
    'SCOUT': {
        name: 'Scout',
        hp: 50,
        speed: 3, // Fast but weak
        reward: 15,
        color: '#ffff00', // Yellow
        radius: 8
    },
    'SOLDIER': {
        name: 'Soldier',
        hp: 120,
        speed: 2, // Average
        reward: 25,
        color: '#00ff00', // Green
        radius: 10
    },
    'TANK': {
        name: 'Tank',
        hp: 400,
        speed: 1, // Slow but tough
        reward: 50,
        color: '#0000ff', // Blue
        radius: 14
    },
    'HEAVY': {
        name: 'Heavy Mech',
        hp: 800,
        speed: 0.8,
        reward: 100,
        color: '#ff00ff', // Purple
        radius: 16
    },
    'BOSS': {
        name: 'Sector Boss',
        hp: 2500,
        speed: 0.5,
        reward: 500,
        color: '#ff0000', // Red
        radius: 20
    },
    'BOSS_MEGA': {
        name: 'Omega Class',
        hp: 10000,
        speed: 0.3,
        reward: 2000,
        color: '#ffffff', // White
        radius: 30
    }
};