export function drawRange(ctx, tower) {
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.arc(0, 0, tower.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

export function drawLevelIndicators(ctx, tower) {
    ctx.save();
    ctx.translate(tower.x, tower.y);
    const time = Date.now() / 500;
    ctx.fillStyle = '#FFD700';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#FFD700';

    for (let i = 0; i < tower.level; i++) {
        const angle = time + (i * ((Math.PI * 2) / tower.level));
        const lx = Math.cos(angle) * 20;
        const ly = Math.sin(angle) * 20;

        ctx.beginPath();
        ctx.arc(lx, ly, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

export function drawPreview(ctx, game, renderSpecificTower) {
    const mx = game.mouse.x;
    const my = game.mouse.y;
    const type = game.selectedTowerType;

    ctx.beginPath();
    const isValid = game.checkPlacement(mx, my);
    ctx.strokeStyle = isValid ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.arc(mx, my, type.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.globalAlpha = 0.6;

    const mockTower = {
        x: mx,
        y: my,
        type: type,
        level: 1,
        rotation: -Math.PI / 2,
        pathA: 0,
        pathB: 0
    };

    renderSpecificTower(mockTower);
    ctx.restore();
}
