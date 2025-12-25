import { MathUtils } from '../utils/MathUtils.js';

export class Enemy {
    constructor(path, stats) {
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.radius = 15;
        this.speed = stats.speed || 100;
        this.hp = stats.hp || 100;
        this.maxHp = this.hp;
        this.active = true;
        this.color = '#ff0055';
    }

    update(deltaTime) {
        if (!this.active) return;

        const target = this.path[this.pathIndex + 1];
        if (!target) {
            this.active = false;
            return;
        }

        const dist = MathUtils.getDistance(this.x, this.y, target.x, target.y);
        const moveDist = (this.speed * deltaTime) / 1000;

        if (dist <= moveDist) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
        } else {
            const angle = Math.atan2(target.y - this.y, target.x - this.x);
            this.x += Math.cos(angle) * moveDist;
            this.y += Math.sin(angle) * moveDist;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fill();

        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -25, 30, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-15, -25, 30 * hpPercent, 4);

        ctx.restore();
    }
}