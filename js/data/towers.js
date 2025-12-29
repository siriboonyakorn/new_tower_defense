// js/data/towers.js

export const TOWER_TYPES = {
    LASER: {
        id: 'laser',
        name: 'LASER CANNON',
        type: 'combat',
        cost: 100,
        range: 150, // Medium range
        damage: 10,
        fireRate: 60, // Frames between shots (60 = 1 sec)
        color: '#ff0055', // Neon Red
        description: 'Standard defense unit. Balanced range and damage.'
    },
    MACHINE: {
        id: 'machine',
        name: 'GATLING TURRET',
        type: 'combat',
        cost: 250,
        range: 100, // Short range
        damage: 4,
        fireRate: 10, // Very fast
        color: '#ffcc00', // Neon Yellow
        description: 'High fire rate but low damage. Shreds weak enemies.'
    },
    RAIL: {
        id: 'rail',
        name: 'RAILGUN',
        type: 'combat',
        cost: 500,
        range: 300, // Long range
        damage: 80,
        fireRate: 180, // Slow (3 sec)
        color: '#00ccff', // Neon Cyan
        description: 'Snipers enemies from afar with massive damage.'
    },
    ECO: {
        id: 'eco',
        name: 'ENERGY CORE',
        type: 'economy',
        cost: 300,
        range: 0,
        damage: 0,
        fireRate: 0,
        income: 50, // Money per wave
        color: '#00ff66', // Neon Green
        description: 'Generates funds at the end of each wave.'
    },
    SPAWNER: {
        id: 'spawner',
        name: 'BARRACKS',
        type: 'support',
        cost: 450,
        range: 120, // Range to detect enemies to send troops?
        damage: 0,
        fireRate: 300, // Spawn rate
        color: '#aa00ff', // Neon Purple
        description: 'Deploys mobile units (Robots, Cars, Tanks) to fight.'
    }
};