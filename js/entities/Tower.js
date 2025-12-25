import { MathUtils } from '../utils/MathUtils.js';
import { Projectile } from './Projectile.js';
import { Enemy } from './Enemy.js';

export class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.range = 200;
        this.damage = 25;
        this.fireRate = 0.5;
        this.cooldown = 0;
        this.color = '#00f2ff';
        this.active = true;
    }

    update(deltaTime, entities) {
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime / 1000;
        }

        if (this.cooldown <= 0) {
            const target = this.findTarget(entities);
            if (target) {
                this.shoot(target, entities);
                this.cooldown = this.fireRate;
            }
        }
    }

    findTarget(entities) {
        let closestEnemy = null;
        let minDist = Infinity;

        for (const entity of entities) {
            if (entity instanceof Enemy && entity.active) {
                const dist = MathUtils.getDistance(this.x, this.y, entity.x, entity.y);
                if (dist <= this.range && dist < minDist) {
                    minDist = dist;
                    closestEnemy = entity;
                }
            }
        }
        return closestEnemy;
    }

    shoot(target, entities) {
        const projectile = new Projectile(this.x, this.y, target, this.damage);
        entities.push(projectile);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#050505';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.rect(-15, -15, 30, 30);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}