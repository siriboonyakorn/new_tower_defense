import { StoreService } from '../../modules/StoreService.js';

export function drawSpawnerTower(ctx, tower) {
    const level = tower.level;
    const skin = StoreService.getSkinConfig('spawner') || { colors: { base: '#2d2d2d', detail: '#555', highlight: '#ff8800' } };
    const c = skin.colors;

    const color = tower.type.color || c.highlight;

    // 1. Factory Base (Concrete Slab)
    ctx.fillStyle = c.base;
    ctx.fillRect(-20, -20, 40, 40);
    ctx.strokeStyle = c.highlight;
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, -20, 40, 40);

    // 2. Hangar Doors (Stripes)
    ctx.fillStyle = '#111';
    ctx.fillRect(-12, -20, 24, 40); // Central Hangar Way

    // Hazard Stripes on the floor
    ctx.strokeStyle = c.detail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -15); ctx.lineTo(8, -15);
    ctx.moveTo(-8, -5); ctx.lineTo(8, -5);
    ctx.moveTo(-8, 5); ctx.lineTo(8, 5);
    ctx.moveTo(-8, 15); ctx.lineTo(8, 15);
    ctx.stroke();

    // 3. Roof / Control Tower
    // Gets more complex with levels
    ctx.fillStyle = c.detail;
    ctx.fillRect(-22, -10, 8, 20); // Left Wing
    ctx.fillRect(14, -10, 8, 20);  // Right Wing

    // Level 2+: Radar Dish
    if (level >= 2) {
        const time = Date.now() / 1000;
        ctx.save();
        ctx.translate(-18, 0);
        ctx.rotate(time * 2); // Rotate dish
        ctx.fillStyle = '#888';
        ctx.fillRect(-4, -1, 8, 2);
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
    }

    // Level 3+: Active Production Lights (Blinking)
    const blink = Math.floor(Date.now() / 500) % 2 === 0;
    ctx.fillStyle = blink ? c.highlight : '#003300';
    ctx.beginPath();
    ctx.arc(18, 5, 2, 0, Math.PI * 2); // Light 1
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, -5, 2, 0, Math.PI * 2); // Light 2
    ctx.fill();

    // Level 5: Helipad H visual
    if (level >= 5) {
        ctx.strokeStyle = c.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();
    }
}
