export const TOWER_TYPES = {
    LASER: {
        id: 'laser',
        name: 'LASER CANNON',
        type: 'combat',
        cost: 100,
        range: 160,
        damage: 2,
        cooldown: 600,
        color: '#00ffff',
        description: 'Single target energy weapon with solar or prism tech.',
        paths: {
            A: {
                name: 'Solar Overdrive',
                levels: [
                    { level: 2, name: 'Focus Lens', cost: 150, damageMult: 1.4 },
                    { level: 3, name: 'Solar Burn', cost: 300, damageMult: 1.5, effect: 'burn' },
                    { level: 4, name: 'Plasma Core', cost: 600, damageMult: 1.6 },
                    { level: 5, name: 'Stellar Lance', cost: 1200, damageMult: 2.0, effect: 'pierce' }
                ]
            },
            B: {
                name: 'Prism Tech',
                levels: [
                    { level: 2, name: 'Beam Splitter', cost: 150, effect: 'split', rangeMult: 1.2 },
                    { level: 3, name: 'Cold Fusion', cost: 350, effect: 'slow', damageMult: 1.2 },
                    { level: 4, name: 'Refraction', cost: 700, rangeMult: 1.5 },
                    { level: 5, name: 'Spectrum Chain', cost: 1500, effect: 'chain' }
                ]
            }
        }
    },
    MACHINE: {
        id: 'machine',
        name: 'GATLING TURRET',
        type: 'combat',
        cost: 250,
        range: 120,
        damage: 1,
        cooldown: 180,
        color: '#ffcc00',
        description: 'Rapid fire kinetic weapon.',
        paths: {
            A: {
                name: 'Shredder Protocol',
                levels: [
                    { level: 2, name: 'Heavy Caliber', cost: 200, damageMult: 1.5 },
                    { level: 3, name: 'Spin-Up Motor', cost: 400, cooldownMult: 0.7 },
                    { level: 4, name: 'Depleted Uranium', cost: 800, damageMult: 1.5 },
                    { level: 5, name: 'The Shredder', cost: 1800, cooldownMult: 0.4 }
                ]
            },
            B: {
                name: 'Missile Pods',
                levels: [
                    { level: 2, name: 'Explosive Tips', cost: 250, effect: 'splash' },
                    { level: 3, name: 'Micro-Missiles', cost: 500, effect: 'missile_proc' },
                    { level: 4, name: 'Smart Tracking', cost: 900, rangeMult: 1.6 },
                    { level: 5, name: 'Hydra System', cost: 2000, effect: 'missile_storm' }
                ]
            }
        }
    },
    RAIL: {
        id: 'rail',
        name: 'RAILGUN',
        type: 'combat',
        cost: 500,
        range: 300,
        damage: 15,
        cooldown: 2500,
        color: '#00ccff',
        description: 'Long range precision weapon.',
        paths: {
            A: {
                name: 'Void Assassin',
                levels: [
                    { level: 2, name: 'Capacitor Charge', cost: 500, damageMult: 1.6 },
                    { level: 3, name: 'Critical Systems', cost: 1000, effect: 'crit25' },
                    { level: 4, name: 'Phase Round', cost: 1500, damageMult: 1.8 },
                    { level: 5, name: 'God Killer', cost: 3000, effect: 'execute' }
                ]
            },
            B: {
                name: 'Arc Caster',
                levels: [
                    { level: 2, name: 'Static Field', cost: 450, effect: 'stun' },
                    { level: 3, name: 'Tesla Coil', cost: 900, effect: 'chain3' },
                    { level: 4, name: 'High Voltage', cost: 1400, damageMult: 1.5 },
                    { level: 5, name: 'Thunderlord', cost: 2800, effect: 'chain_global' }
                ]
            }
        }
    },
    ECO: {
        id: 'eco',
        name: 'ENERGY CORE',
        type: 'economy',
        cost: 300,
        range: 150,
        damage: 0,
        cooldown: 1000,
        income: 50,
        color: '#00ff66',
        description: 'Generates credits or buffs nearby towers.',
        paths: {
            A: {
                name: 'Industrialist',
                levels: [
                    { level: 2, name: 'Deep Mining', cost: 400, incomeMult: 1.5 },
                    { level: 3, name: 'Efficiency AI', cost: 800, incomeMult: 1.6 },
                    { level: 4, name: 'Fracking', cost: 1500, incomeMult: 1.8 },
                    { level: 5, name: 'Core Tap', cost: 3000, incomeMult: 2.5 }
                ]
            },
            B: {
                name: 'Command Beacon',
                levels: [
                    { level: 2, name: 'Targeting Link', cost: 450, effect: 'buff_range' },
                    { level: 3, name: 'Overclock', cost: 900, effect: 'buff_speed' },
                    { level: 4, name: 'Damage Amp', cost: 1600, effect: 'buff_damage' },
                    { level: 5, name: 'War Network', cost: 3500, effect: 'buff_ultimate' }
                ]
            }
        }
    },
    SPAWNER: {
        id: 'spawner',
        name: 'BARRACKS',
        type: 'spawner',
        cost: 400,
        range: 0,
        damage: 0,
        cooldown: 5000,
        color: '#ff8800',
        description: 'Spawns units to block enemies.',
        paths: {
            A: {
                name: 'Mech Foundry',
                levels: [
                    { level: 2, name: 'Steel Plating', cost: 400, effect: 'troop_hp_1.5' },
                    { level: 3, name: 'Plasma Sabers', cost: 800, effect: 'troop_dmg_1.4' },
                    { level: 4, name: 'Heavy Mechs', cost: 1500, effect: 'unit_mech' },
                    { level: 5, name: 'Titan Class', cost: 3500, effect: 'unit_titan' }
                ]
            },
            B: {
                name: 'Drone Swarm',
                levels: [
                    { level: 2, name: 'Rapid Fab', cost: 400, cooldownMult: 0.7 },
                    { level: 3, name: 'Air Support', cost: 850, effect: 'unit_air' },
                    { level: 4, name: 'Mass Production', cost: 1600, cooldownMult: 0.6 },
                    { level: 5, name: 'Carrier', cost: 3000, effect: 'double_spawn' }
                ]
            }
        }
    }
};