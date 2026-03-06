import { DailyModifier } from '../managers/DailyModifier.js';

export class Enemy {
    constructor(game, typeKey, typeConfig, x, y) {
        this.game = game;
        this.type = typeConfig;
        this.typeName = typeKey;

        this.id = Math.random();
        this.x = x;
        this.y = y;
        this.pathIndex = 0;

        // Apply Daily Modifiers
        const mods = DailyModifier.getEnemyModifiers();
        this.hp = typeConfig.hp * mods.hp;
        this.maxHp = this.hp;
        this.speed = typeConfig.speed * mods.speed;
        this.baseSpeed = this.speed;
        this.reward = typeConfig.reward * mods.reward;

        // Status Effects
        this.effects = {
            burn: { stacks: 0, timer: 0 },
            slow: { intensity: 0, timer: 0 },
            distortion: { timer: 0 }
        };

        this.isAir = !!typeConfig.isAir;
    }

    takeDamage(amount) {
        if (this.hp <= 0) return;
        let dmg = amount;
        // EventManager SHIELD_GENERATOR event: shielded enemies take 50% damage
        if (this.shielded) dmg *= 0.5;
        const damageDealt = Math.min(this.hp, dmg);
        this.hp -= damageDealt;
        if (this.game) {
            this.game.sessionDamage += damageDealt;
        }
    }

    update() {
        // 1. Process Status Effects
        this.processEffects();

        // 2. Move Enemy Logic
        const target = this.game.path[this.pathIndex + 1];

        // If no target, they reached the end (Base Hit handled in Game.js)
        if (!target) return false; // Signal reached end

        const tx = target.x * this.game.tileSize + this.game.tileSize / 2;
        const ty = target.y * this.game.tileSize + this.game.tileSize / 2;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Apply EventManager SPEED_BOOST multiplier if active
        const currentSpeed = this.speed * (this.speedBoost || 1) * (1 - this.effects.slow.intensity);

        if (dist < currentSpeed) {
            // Snap to grid and move to next waypoint
            this.x = tx;
            this.y = ty;
            this.pathIndex++;
            return true;
        } else {
            // Smooth movement towards target
            let moveX = (dx / dist) * currentSpeed;
            let moveY = (dy / dist) * currentSpeed;

            // Movement Distortion (Zig-zag)
            if (this.effects.distortion.timer > 0) {
                const jitter = Math.sin(Date.now() * 0.02) * 2;
                // Apply jitter perpendicular to movement
                moveX += (dy / dist) * jitter;
                moveY += (-dx / dist) * jitter;
            }

            this.x += moveX;
            this.y += moveY;
            return true;
        }
    }

    processEffects() {
        const now = Date.now();

        // Burn (DoT)
        if (this.effects.burn.stacks > 0) {
            // Damage every frame based on stacks
            this.takeDamage(this.effects.burn.stacks * 0.05);
            if (this.effects.burn.timer < now) {
                this.effects.burn.stacks = 0;
            }
        }

        // Slow
        if (this.effects.slow.timer < now) {
            this.effects.slow.intensity = 0;
        }

        // Distortion
        if (this.effects.distortion.timer < now) {
            this.effects.distortion.timer = 0;
        }
    }

    applyBurn(stacks, duration = 2000) {
        this.effects.burn.stacks = Math.min(this.effects.burn.stacks + stacks, 10); // Limit stacks
        this.effects.burn.timer = Date.now() + duration;
    }

    applySlow(intensity, duration = 1000) {
        // TELEPORTER enemies are immune to slow
        if (this.type.slowImmune) return;
        this.effects.slow.intensity = Math.max(this.effects.slow.intensity, intensity);
        this.effects.slow.timer = Date.now() + duration;
    }

    applyDistortion(duration = 1000) {
        this.effects.distortion.timer = Date.now() + duration;
    }
}
