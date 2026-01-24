import { StoreService } from '../../modules/StoreService.js';

export function drawLaserTower(ctx, tower) {
    const level = tower.level;
    const skin = StoreService.getSkinConfig('laser') || { colors: { base: '#0a0a0a', detail: '#1a1a1a', highlight: '#00ffff' } };
    const c = skin.colors;

    ctx.fillStyle = c.base;
    ctx.strokeStyle = c.highlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(tower.rotation);

    ctx.shadowBlur = 10;
    ctx.shadowColor = c.glow || c.highlight;

    ctx.fillStyle = c.detail;
    ctx.fillRect(-6, -26, 12, 36);

    const coilColor = level >= 3 ? '#ffffff' : c.highlight;
    ctx.fillStyle = coilColor;
    ctx.fillRect(-3, -24, 6, 18);

    if (tower.pathB >= 2 || level >= 2) {
        ctx.fillStyle = c.base;
        ctx.fillRect(-11, -12, 5, 14);
        ctx.fillRect(6, -12, 5, 14);
    }

    if (tower.pathA >= 4 || level >= 4) {
        ctx.fillStyle = c.highlight;
        ctx.beginPath();
        ctx.arc(0, -26, 7, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}
