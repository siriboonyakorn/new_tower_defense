// js/managers/MapModifier.js

/**
 * Manages dynamic map elements like Void Zones and Environmental Hazards
 */
export const MapModifier = {
    // Active zones on the map
    zones: [],

    // Zone Types
    types: {
        RADIATION: {
            id: 'RADIATION',
            color: 'rgba(50, 255, 50, 0.2)',
            borderColor: '#32ff32',
            description: 'Deals damage to enemies inside',
            effect: (entity) => {
                if (entity.takeDamage) entity.takeDamage(0.5); // DoT
            }
        },
        GRAVITY_WELL: {
            id: 'GRAVITY_WELL',
            color: 'rgba(50, 0, 100, 0.3)',
            borderColor: '#aa00ff',
            description: 'Slows enemies massively',
            effect: (entity) => {
                if (entity.applySlow) entity.applySlow(0.8, 100);
            }
        },
        NULL_FIELD: {
            id: 'NULL_FIELD',
            color: 'rgba(255, 0, 0, 0.1)',
            borderColor: '#ff0000',
            description: 'Disables towers inside',
            effect: (entity) => {
                if (entity.isDisabled !== undefined) {
                    entity.isDisabled = true;
                    entity.disabledEndTime = Date.now() + 100;
                }
            }
        },
        TIME_WARP: {
            id: 'TIME_WARP',
            color: 'rgba(0, 243, 255, 0.2)',
            borderColor: '#00f3ff',
            description: 'Speeds up enemies (Hazard)',
            effect: (entity) => {
                if (entity.speed) entity.x += (Math.random() - 0.5) * 5; // Glitch movement
            }
        }
    },

    // Config
    width: 0,
    height: 0,
    tileSize: 32,

    /**
     * Initialize for a new game
     */
    init(game) {
        this.zones = [];
        this.width = game.width;
        this.height = game.height;
        this.tileSize = game.tileSize;
        console.log('[MapModifier] Dynamic Map System Initialized');
    },

    /**
     * Spawn a random zone
     */
    spawnRandomZone() {
        const typeKeys = Object.keys(this.types);
        const typeKey = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        const type = this.types[typeKey];

        // Random position
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        const radius = 100 + Math.random() * 100;

        const zone = {
            id: Math.random(),
            type: type,
            x: x,
            y: y,
            radius: radius,
            startTime: Date.now(),
            duration: 15000 + Math.random() * 15000 // 15-30 seconds
        };

        this.zones.push(zone);
        console.log(`[MapModifier] Spawned ${type.id} at ${Math.floor(x)},${Math.floor(y)}`);

        return zone;
    },

    /**
     * Update all zones and apply effects
     */
    update(game) {
        const now = Date.now();

        // 1. Cleanup expired
        this.zones = this.zones.filter(z => now - z.startTime < z.duration);

        // 2. Spawn new zones occasionally (5% chance per second approx)
        if (Math.random() < 0.001) {
            this.spawnRandomZone();
        }

        // 3. Apply Effects
        for (const zone of this.zones) {
            // Apply to Enemies
            for (const enemy of game.enemies) {
                const dx = enemy.x - zone.x;
                const dy = enemy.y - zone.y;
                if (dx * dx + dy * dy < zone.radius * zone.radius) {
                    zone.type.effect(enemy);
                }
            }

            // Apply to Towers (only Null Field affects towers usually)
            if (zone.type.id === 'NULL_FIELD') {
                for (const tower of game.towers) {
                    const dx = tower.x - zone.x;
                    const dy = tower.y - zone.y;
                    if (dx * dx + dy * dy < zone.radius * zone.radius) {
                        zone.type.effect(tower);
                    }
                }
            }
        }
    },

    /**
     * Draw zones on the canvas
     */
    draw(ctx) {
        for (const zone of this.zones) {
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            ctx.fillStyle = zone.type.color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = zone.type.borderColor;
            ctx.stroke();

            // Pulse effect
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius * (0.8 + Math.sin(Date.now() * 0.005) * 0.2), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,0.3)`;
            ctx.stroke();
        }
    }
};
