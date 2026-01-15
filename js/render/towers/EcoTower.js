export function drawEcoTower(ctx, tower) {
    const level = tower.level;

    ctx.fillStyle = '#102012';
    ctx.fillRect(-18, -18, 36, 36);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;
    ctx.strokeRect(-18, -18, 36, 36);

    const time = Date.now() / 500;
    const lift = Math.sin(time) * 3;

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ff66';
    ctx.fillStyle = '#00ff66';

    ctx.beginPath();
    ctx.moveTo(0, -12 + lift);
    ctx.lineTo(10, 0 + lift);
    ctx.lineTo(0, 12 + lift);
    ctx.lineTo(-10, 0 + lift);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    if (level >= 3) {
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 8, time, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 8, -time, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (level >= 5) {
        ctx.fillStyle = '#00aa44';
        ctx.fillRect(-16, -16, 8, 8);
        ctx.fillRect(8, -16, 8, 8);
        ctx.fillRect(-16, 8, 8, 8);
        ctx.fillRect(8, 8, 8, 8);
    }
}
