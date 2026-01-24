import { StoreService } from '../../modules/StoreService.js';

export function drawEcoTower(ctx, tower) {
    const level = tower.level;
    const skin = StoreService.getSkinConfig('eco') || { colors: { base: '#102012', detail: '#444', highlight: '#00ff66' } };
    const c = skin.colors;

    ctx.fillStyle = c.base;
    ctx.fillRect(-18, -18, 36, 36);
    ctx.strokeStyle = c.highlight;
    ctx.lineWidth = 1;
    ctx.strokeRect(-18, -18, 36, 36);

    const time = Date.now() / 500;
    const lift = Math.sin(time) * 3;

    ctx.shadowBlur = 12;
    ctx.shadowColor = c.glow || c.highlight;
    ctx.fillStyle = c.highlight;

    ctx.beginPath();
    ctx.moveTo(0, -12 + lift);
    ctx.lineTo(10, 0 + lift);
    ctx.lineTo(0, 12 + lift);
    ctx.lineTo(-10, 0 + lift);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    if (level >= 3) {
        ctx.strokeStyle = c.glow || c.highlight;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 8, time, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 8, -time, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (level >= 5) {
        ctx.fillStyle = c.detail;
        ctx.fillRect(-16, -16, 8, 8);
        ctx.fillRect(8, -16, 8, 8);
        ctx.fillRect(-16, 8, 8, 8);
        ctx.fillRect(8, 8, 8, 8);
    }
}
