export const levels = [
    {
        id: 1,
        path: [
            { x: 0, y: 100 },
            { x: 300, y: 100 },
            { x: 300, y: 500 },
            { x: 800, y: 500 },
            { x: 800, y: 200 },
            { x: 1200, y: 200 }
        ],
        waves: [
            { count: 5, interval: 1500, hp: 100, speed: 100 },
            { count: 10, interval: 1000, hp: 150, speed: 120 },
            { count: 1, interval: 0, hp: 1000, speed: 50 }
        ]
    }
];