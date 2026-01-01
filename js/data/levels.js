export const levels = [
    {
        id: 'sector1',
        name: 'SOLAR POINT',
        difficulty: 'EASY',
        multiplier: 1.00,
        path: [
            { x: 0, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 8 }, { x: 35, y: 8 }
        ],
        briefing: 'A high-orbit refueling station bathed in blinding star-light. Scanners show light enemy resistance. Use this zone to calibrate your defense grid and secure the sun-link.'
    },
    {
        id: 'sector2',
        name: 'DEEP SPACE',
        difficulty: 'NORMAL',
        multiplier: 1.50,
        path: [
            { x: 0, y: 12 }, { x: 5, y: 12 }, { x: 5, y: 3 }, { x: 20, y: 3 }, { x: 20, y: 10 }, { x: 35, y: 10 }
        ],
        briefing: 'The quiet edge of the sector. Beyond the reach of star-light, hostile signals move through the freezing dark. Maintain thermal vision; the enemy here knows how to hide in the cold.'
    },
    {
        id: 'sector3',
        name: 'ORBITAL LIGHTS',
        difficulty: 'HARD',
        multiplier: 2.25,
        path: [
            { x: 0, y: 5 }, { x: 10, y: 5 }, { x: 10, y: 2 }, { x: 25, y: 2 }, { x: 25, y: 12 }, { x: 15, y: 12 }, { x: 15, y: 8 }, { x: 35, y: 8 }
        ],
        briefing: 'A sprawling mega-city suspended in orbit. The neon glare creates blind spots for our radar, allowing advanced interceptors to strike from the shadows. Watch the skyscrapers.'
    },
    {
        id: 'sector4',
        name: 'EVENT HORIZON',
        difficulty: 'INSANE',
        multiplier: 3.50,
        path: [
            { x: 15, y: 0 }, { x: 15, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 10 }, { x: 25, y: 10 }, { x: 25, y: 5 }, { x: 35, y: 5 }
        ],
        briefing: 'Warning: Gravity is warping reality. Space-time is stretching thin near the black hole, and the enemy is no longer bound by physics. If the sensors scream, it\'s already too late.'
    },
    {
        id: 'sector5',
        name: 'SINGULARITY',
        difficulty: 'OMEGA',
        multiplier: 5.00,
        path: [
            { x: 0, y: 7 }, { x: 35, y: 7 } // A straight, deadly line
        ],
        briefing: 'The Zero Point. Here, data and matter are crushed into a single coordinate. You are fighting at the absolute end of existence. No backup. No retreat. Good luck, Commander.'
    }
];