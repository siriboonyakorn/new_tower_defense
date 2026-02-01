/**
 * SkinsData.js
 * Defines all available skins for towers.
 */
export const SkinsData = {
    // ---------------- MACHINE GUN ----------------
    machine: [
        {
            id: 'default_machine',
            name: 'Standard Issue',
            description: 'Reliable mass-produced ballistics.',
            cost: 0,
            rarity: 'common',
            colors: {
                base: '#222',
                detail: '#444',
                highlight: '#ffcc00',
                glow: 'rgba(255, 204, 0, 0.2)'
            }
        },
        {
            id: 'neon_machine',
            name: 'Neon Striker',
            description: 'Upgraded with high-voltage capacitors.',
            cost: 500,
            rarity: 'rare',
            colors: {
                base: '#0A0A15',
                detail: '#111',
                highlight: '#00f3ff', // Cyan
                glow: 'rgba(0, 243, 255, 0.6)'
            }
        },
        {
            id: 'crimson_machine',
            name: 'Crimson Fury',
            description: 'Overclocked for maximum aggression.',
            cost: 1200,
            rarity: 'epic',
            colors: {
                base: '#200000',
                detail: '#400000',
                highlight: '#ff003c', // Red
                glow: 'rgba(255, 0, 60, 0.8)'
            }
        },
        {
            id: 'gold_machine',
            name: 'Golden State',
            description: 'A symbol of ultimate wealth.',
            cost: 5000,
            rarity: 'legendary',
            colors: {
                base: '#332a00',
                detail: '#665500',
                highlight: '#ffd700', // Gold
                glow: 'rgba(255, 215, 0, 0.8)'
            }
        }
    ],

    // ---------------- LASER TOWER ----------------
    laser: [
        {
            id: 'default_laser',
            name: 'Prism Core',
            description: 'Standard directed energy weapon.',
            cost: 0,
            rarity: 'common',
            colors: {
                base: '#111',
                detail: '#333',
                highlight: '#00ff88', // Green
                glow: 'rgba(0, 255, 136, 0.3)'
            }
        },
        {
            id: 'void_laser',
            name: 'Void Ray',
            description: 'Harnesses dark matter energy.',
            cost: 1500,
            rarity: 'epic',
            colors: {
                base: '#1a0033',
                detail: '#2d0059',
                highlight: '#aa00ff', // Purple
                glow: 'rgba(170, 0, 255, 0.8)'
            }
        }
    ],

    // ---------------- ECO TOWER ----------------
    eco: [
        {
            id: 'default_eco',
            name: 'Solar Hub',
            description: 'Generates resources from ambient light.',
            cost: 0,
            rarity: 'common',
            colors: {
                base: '#222',
                detail: '#444',
                highlight: '#2ecc71',
                glow: 'rgba(46, 204, 113, 0.3)'
            }
        },
        {
            id: 'cyber_eco',
            name: 'Data Miner',
            description: 'Mines cryptocurrency from the network.',
            cost: 800,
            rarity: 'rare',
            colors: {
                base: '#053344',
                detail: '#0a6688',
                highlight: '#00f3ff',
                glow: 'rgba(0, 243, 255, 0.5)'
            }
        }
    ],

    // ---------------- RAILGUN ----------------
    rail: [
        {
            id: 'default_rail',
            name: 'Rail Cannon',
            description: 'Magnetic accelerator platform.',
            cost: 0,
            rarity: 'common',
            colors: {
                base: '#222',
                detail: '#444',
                highlight: '#00ccff', // Blue
                glow: 'rgba(0, 204, 255, 0.4)'
            }
        },
        {
            id: 'inferno_rail',
            name: 'Magma Driver',
            description: 'Shoots superheated slugs.',
            cost: 2000,
            rarity: 'epic',
            colors: {
                base: '#331100',
                detail: '#552200',
                highlight: '#ff5500', // Orange
                glow: 'rgba(255, 85, 0, 0.8)'
            }
        }
    ],

    // ---------------- SPAWNER ----------------
    spawner: [
        {
            id: 'default_spawner',
            name: 'Drone Hangar',
            description: 'Deploys autonomous combat units.',
            cost: 0,
            rarity: 'common',
            colors: {
                base: '#222',
                detail: '#444',
                highlight: '#ff9900',
                glow: 'rgba(255, 153, 0, 0.3)'
            }
        },
        {
            id: 'stealth_spawner',
            name: 'Ghost Ops',
            description: 'Fabricates stealth drones.',
            cost: 1000,
            rarity: 'rare',
            colors: {
                base: '#1a1a1a',
                detail: '#333',
                highlight: '#999', // Grey/White
                glow: 'rgba(200, 200, 200, 0.5)'
            }
        }
    ],
    // ---------------- FLAK TURRET ----------------
    flak: [
        {
            id: 'default_flak',
            name: 'Battery Alpha',
            description: 'Standard anti-air flak battery.',
            cost: 0,
            rarity: 'common',
            colors: {
                base: '#222',
                detail: '#444',
                highlight: '#ffaa00',
                glow: 'rgba(255, 170, 0, 0.3)'
            }
        },
        {
            id: 'storm_flak',
            name: 'Storm Cell',
            description: 'Deploys localized electrical clouds.',
            cost: 1500,
            rarity: 'epic',
            colors: {
                base: '#001a1a',
                detail: '#003333',
                highlight: '#00ffff',
                glow: 'rgba(0, 255, 255, 0.6)'
            }
        }
    ]
};
