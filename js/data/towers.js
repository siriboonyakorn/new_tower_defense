// js/data/towers.js

export const TOWER_TYPES = {
    LASER: {
        id: 'laser',
        name: 'LASER CANNON',
        type: 'combat',
        cost: 100,
        range: 160,
        damage: 15,
        cooldown: 600,
        color: '#00ffff', // Cyan Level 1
        description: 'Fires fast laser pulses. Modular space turret.',
        paths: {
            A: {
                name: 'Solar Overdrive',
                levels: [
                    { level: 2, name: 'Energy Amplifier', cost: 150, damageMult: 1.5, visual: 'brighter' },
                    { level: 3, name: 'Solar Burn Core', cost: 300, effect: 'burn', damageMult: 1.2 },
                    { level: 4, name: 'Plasma Saturation', cost: 500, effect: 'burn_spread', damageMult: 1.3 },
                    { level: 5, name: 'Stellar Lance', cost: 1000, effect: 'overcharge', damageMult: 2.5 }
                ]
            },
            B: {
                name: 'Prism Control',
                levels: [
                    { level: 2, name: 'Prism Splitter', cost: 150, effect: 'split', rangeMult: 1.1 },
                    { level: 3, name: 'Light Disruption', cost: 300, effect: 'slow', distortion: true },
                    { level: 4, name: 'Refraction Web', cost: 500, effect: 'chain' },
                    { level: 5, name: 'Spectrum Collapse', cost: 1000, effect: 'pulse_blast' }
                ]
            }
        }
    },
    MACHINE: {
        id: 'machine',
        name: 'GATLING TURRET',
        type: 'combat',
        cost: 250,
        range: 100, // Short range
        damage: 20,
        cooldown: 100, // Very fast
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
        cooldown: 1200, // Slow (3 sec)//1200
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
        cooldown: 0,
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
        cooldown: 120, // Spawn rate
        color: '#aa00ff', // Neon Purple
        description: 'Deploys mobile units (Robots, Cars, Tanks) to fight.'
    }
};