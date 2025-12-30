export class Projectile {
    constructor(x, y, target, damage, color, speed) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.color = color;
        this.speed = speed || 10;
        this.radius = 3;
        this.markedForDeletion = false;
    }

    update() {
        if (!this.target || this.target.hp <= 0) {
            this.markedForDeletion = true;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            this.target.hp -= this.damage;
            this.markedForDeletion = true;
            return;
        }

        const vx = (dx / dist) * this.speed;
        const vy = (dy / dist) * this.speed;

        this.x += vx;
        this.y += vy;
    }
}