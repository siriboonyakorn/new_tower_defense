// js/entities/Tower.js
import { Projectile } from './Projectile.js';
import { Troop } from './Troop.js';

export class Tower {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.range = type.range;
        this.damage = type.damage;
        this.fireRate = type.fireRate;
        this.cooldown = 0;
        this.target = null;
    }

    // (You can remove findClosestPathTile, we don't need it for suicide troops)

    update() {
        if (this.cooldown > 0) this.cooldown--;

        // Combat Towers
        if (this.type.type === 'combat') {
            this.target = this.findTarget();
            if (this.target && this.cooldown <= 0) {
                this.shoot();
                this.cooldown = this.fireRate;
            }
        }
        // Barracks (Suicide Spawner)
        else if (this.type.id === 'spawner') {
            if (this.cooldown <= 0) {
                this.spawnTroop();
                this.cooldown = this.fireRate;
            }
        }
    }

    spawnTroop() {
        // 1. Start at the BASE (End of the path)
        const startIndex = this.game.path.length - 1; 
        const startTile = this.game.path[startIndex];
        
        const sx = startTile.x * this.game.tileSize + this.game.tileSize/2;
        const sy = startTile.y * this.game.tileSize + this.game.tileSize/2;

        // 2. Create Suicide Troop
        // We only need to tell it where it starts. It knows to walk to index 0.
        this.game.troops.push(new Troop(this.game, sx, sy, startIndex));
    }

    // ... (Keep findTarget and shoot functions) ...
    findTarget() {
        let nearest = null;
        let minDist = Infinity;
        this.game.enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.range && dist < minDist) {
                nearest = enemy;
                minDist = dist;
            }
        });
        return nearest;
    }

    shoot() {
        if (!this.target) return;
        const bulletSpeed = this.type.id === 'rail' ? 25 : 8;
        this.game.projectiles.push(new Projectile(
            this.x, this.y, this.target, this.damage, this.type.color, bulletSpeed
        ));
    }
}