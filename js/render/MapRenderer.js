export function drawGrid(ctx, game) {
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= game.width; x += game.tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, game.height);
        ctx.stroke();
    }
    for (let y = 0; y <= game.height; y += game.tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(game.width, y);
        ctx.stroke();
    }
}

export function drawPath(ctx, game) {
    if (game.path.length < 2) return;
    const ts = game.tileSize;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    const startX = game.path[0].x * ts + ts / 2;
    const startY = game.path[0].y * ts + ts / 2;
    ctx.moveTo(startX, startY);
    for (let i = 1; i < game.path.length; i++) {
        const px = game.path[i].x * ts + ts / 2;
        const py = game.path[i].y * ts + ts / 2;
        ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (game.path.length > 0) {
        const endPoint = game.path[game.path.length - 1];
        const baseX = endPoint.x * ts + ts / 2;
        const baseY = endPoint.y * ts + ts / 2;
        const baseSize = ts * 2.5;
        drawBaseHQ(ctx, baseX, baseY, baseSize);
    }
}

export function drawBaseHQ(ctx, x, y, size) {
    const radius = size / 2;
    ctx.save();
    ctx.translate(x, y);

    const hexRadius = radius * 0.9;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = Math.cos(angle) * hexRadius;
        const py = Math.sin(angle) * hexRadius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#0a1a2e';
    ctx.fill();

    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f3ff';
    ctx.stroke();

    const innerRadius = radius * 0.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = Math.cos(angle) * innerRadius;
        const py = Math.sin(angle) * innerRadius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = '#0088cc';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.stroke();

    const coreRadius = radius * 0.25;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(0.5, '#00aaff');
    gradient.addColorStop(1, '#0066aa');

    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    ctx.fill();

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = Math.cos(angle) * hexRadius * 0.85;
        const py = Math.sin(angle) * hexRadius * 0.85;

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.fill();
    }

    ctx.restore();
}
