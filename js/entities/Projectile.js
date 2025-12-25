import { MathUtils } from '../utils/MathUtils.js';
import { Enemy } from './Enemy.js';

export class Projectile {
    constructor(x, y, target, damage) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 400;
        this.active = true;
        this.radius = 3;
        this.color = '#ffff00';
    }

    update(deltaTime) {
        if (!this.active) return;

        if (!this.target.active) {
            this.active = false;
            return;
        }

        const dist = MathUtils.getDistance(this.x, this.y, this.target.x, this.target.y);
        const moveDist = (this.speed * deltaTime) / 1000;

        if (dist <= moveDist) {
            this.hitTarget();
        } else {
            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            this.x += Math.cos(angle) * moveDist;
            this.y += Math.sin(angle) * moveDist;
        }
    }

    hitTarget() {
        this.target.hp -= this.damage;
        if (this.target.hp <= 0) {
            this.target.active = false;
        }
        this.active = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = '#fff';
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}