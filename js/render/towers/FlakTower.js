import { StoreService } from '../../modules/StoreService.js';

export function drawFlakTower(ctx, tower) {
    const level = tower.level;
    const skin = StoreService.getSkinConfig('flak') || { colors: { base: '#222', detail: '#444', highlight: '#ffaa00' } };
    const c = skin.colors;

    // 1. OCTAGONAL BASE (Industrial Look)
    ctx.fillStyle = c.base;
    ctx.beginPath();
    const size = 20;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + Math.PI / 8;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Base Detail - Trim
    ctx.strokeStyle = c.highlight;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Inner mechanical ring
    ctx.fillStyle = c.detail;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // 2. ROTATING TURRET HEAD
    ctx.rotate(tower.rotation);

    // Turret Carriage
    ctx.fillStyle = c.detail;
    ctx.fillRect(-12, -8, 24, 16);

    // Side Armor Plates
    ctx.fillStyle = c.base;
    ctx.fillRect(-14, -10, 4, 20); // Left plate
    ctx.fillRect(10, -10, 4, 20);  // Right plate

    // 3. DUAL BARRELS
    ctx.fillStyle = '#111';

    // Animate recoil if recently shot
    const timeSinceShot = Date.now() - tower.lastShot;
    const recoil = Math.max(0, 8 - (timeSinceShot / 50));

    // Left Barrel
    ctx.fillRect(-8, -25 + recoil, 5, 18);
    // Right Barrel
    ctx.fillRect(3, -25 + recoil, 5, 18);

    // Barrel Tips (Highlight)
    ctx.fillStyle = c.highlight;
    ctx.fillRect(-8, -27 + recoil, 5, 3);
    ctx.fillRect(3, -27 + recoil, 5, 3);

    // 4. LEVEL UPGRADES
    if (level >= 2) {
        // Add Radar Dish on the side
        ctx.fillStyle = c.detail;
        ctx.beginPath();
        ctx.arc(12, 5, 6, 0, Math.PI, true);
        ctx.stroke();

        // Small antenna
        ctx.strokeStyle = c.highlight;
        ctx.beginPath();
        ctx.moveTo(12, 5);
        ctx.lineTo(16, 12);
        ctx.stroke();
    }

    if (level >= 4) {
        // Encase barrels in heavy shroud
        ctx.fillStyle = c.base;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-10, -15, 20, 10);
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = c.highlight;
        ctx.shadowBlur = 10;
        ctx.shadowColor = c.glow || c.highlight;
        ctx.strokeRect(-10, -15, 20, 10);
        ctx.shadowBlur = 0;
    }
}
