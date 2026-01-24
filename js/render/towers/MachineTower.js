import { StoreService } from '../../modules/StoreService.js';

export function drawMachineTower(ctx, tower) {
    const level = tower.level;
    const skin = StoreService.getSkinConfig('machine') || { colors: { base: '#222', detail: '#444', highlight: '#ffcc00' } };
    const c = skin.colors;

    // Base
    ctx.fillStyle = c.base;
    ctx.fillRect(-18, -18, 36, 36);

    ctx.strokeStyle = c.highlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -18); ctx.lineTo(-10, -18);
    ctx.moveTo(-18, -10); ctx.lineTo(18, -10);
    ctx.moveTo(10, 18); ctx.lineTo(18, 18);
    ctx.stroke();

    ctx.rotate(tower.rotation);

    // Turret Body
    ctx.fillStyle = c.detail;
    ctx.fillRect(-10, -12, 20, 24);

    // Barrel
    ctx.fillStyle = '#000';
    ctx.fillRect(-3, -28, 6, 18);

    if (level >= 2) {
        ctx.fillStyle = c.detail;
        ctx.fillRect(-7, -26, 4, 16);
        ctx.fillRect(3, -26, 4, 16);
    }

    if (level >= 4) {
        ctx.fillStyle = c.highlight;
        ctx.shadowBlur = 10;
        ctx.shadowColor = c.glow || c.highlight;
        ctx.fillRect(-9, -30, 18, 4);
        ctx.shadowBlur = 0;
    }

    // Ammo Box
    ctx.fillStyle = c.base;
    ctx.fillRect(8, -6, 10, 18);
    ctx.strokeStyle = c.highlight;
    ctx.strokeRect(8, -6, 10, 18);
}
