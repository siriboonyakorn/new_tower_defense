export function drawMachineTower(ctx, tower) {
    const level = tower.level;

    ctx.fillStyle = '#222';
    ctx.fillRect(-18, -18, 36, 36);

    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -18); ctx.lineTo(-10, -18);
    ctx.moveTo(-18, -10); ctx.lineTo(18, -10);
    ctx.moveTo(10, 18); ctx.lineTo(18, 18);
    ctx.stroke();

    ctx.rotate(tower.rotation);

    ctx.fillStyle = '#444';
    ctx.fillRect(-10, -12, 20, 24);

    ctx.fillStyle = '#000';
    ctx.fillRect(-3, -28, 6, 18);

    if (level >= 2) {
        ctx.fillRect(-7, -26, 4, 16);
        ctx.fillRect(3, -26, 4, 16);
    }

    if (level >= 4) {
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-9, -30, 18, 4);
    }

    ctx.fillStyle = '#665500';
    ctx.fillRect(8, -6, 10, 18);
    ctx.strokeStyle = '#332a00';
    ctx.strokeRect(8, -6, 10, 18);
}
