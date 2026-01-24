import { StoreService } from '../../modules/StoreService.js';

export function drawRailTower(ctx, tower) {
    const level = tower.level;
    const skin = StoreService.getSkinConfig('rail') || { colors: { base: '#050505', detail: '#333', highlight: '#00ccff' } };
    const c = skin.colors;

    ctx.fillStyle = c.base;
    ctx.strokeStyle = c.highlight;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.rotate(tower.rotation);

    ctx.fillStyle = c.detail;
    ctx.fillRect(-9, -32, 5, 42);
    ctx.fillRect(4, -32, 5, 42);

    const time = Date.now();
    const pulse = (Math.sin(time / 200) + 1) / 2;
    ctx.fillStyle = c.glow || `rgba(0, 204, 255, ${0.4 + pulse * 0.6})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = c.highlight;

    const coreW = level >= 3 ? 8 : 4;
    ctx.fillRect(-coreW / 2, -28, coreW, 34);

    if (level >= 3) {
        ctx.fillStyle = c.detail;
        ctx.fillRect(-16, -5, 7, 12);
        ctx.fillRect(9, -5, 7, 12);
    }

    ctx.shadowBlur = 0;
}
