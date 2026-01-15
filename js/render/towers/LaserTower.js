export function drawLaserTower(ctx, tower) {
    const level = tower.level;

    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(tower.rotation);

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-6, -26, 12, 36);

    const coilColor = level >= 3 ? '#ffffff' : '#00ffff';
    ctx.fillStyle = coilColor;
    ctx.fillRect(-3, -24, 6, 18);

    if (tower.pathB >= 2 || level >= 2) {
        ctx.fillStyle = '#0088aa';
        ctx.fillRect(-11, -12, 5, 14);
        ctx.fillRect(6, -12, 5, 14);
    }

    if (tower.pathA >= 4 || level >= 4) {
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, -26, 7, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}
