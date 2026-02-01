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
export function drawOverclockUI(ctx, tower) {
    const now = Date.now();
    ctx.save();
    ctx.translate(tower.x, tower.y);

    // 1. Electric Aura (Pulsing)
    if (tower.isOverclocked) {
        const pulse = (Math.sin(now / 100) + 1) / 2;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 210, 255, ${0.2 + pulse * 0.4})`;
        ctx.lineWidth = 2 + pulse * 4;
        ctx.setLineDash([5, 5]);
        ctx.arc(0, 0, 25 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Lightning bolts
        for (let i = 0; i < 3; i++) {
            const angle = (now / 200 + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
            ctx.beginPath();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            const r = 20 + Math.random() * 10;
            ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            ctx.stroke();
        }
    }

    // 2. Status Bar
    if (tower.isOverclocked || tower.isDisabled) {
        const barWidth = 30;
        const barHeight = 4;
        const yOffset = 25;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-barWidth / 2, yOffset, barWidth, barHeight);

        let progress = 0;
        let color = '#00d2ff';

        if (tower.isOverclocked) {
            const total = 5000;
            const remaining = Math.max(0, tower.overclockEndTime - now);
            progress = remaining / total;
            color = '#00d2ff';
        } else if (tower.isDisabled) {
            const total = 10000;
            const remaining = Math.max(0, tower.disabledEndTime - now);
            progress = 1 - (remaining / total);
            color = '#ff3e3e';
        }

        ctx.fillStyle = color;
        ctx.fillRect(-barWidth / 2, yOffset, barWidth * progress, barHeight);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, yOffset, barWidth, barHeight);
    }

    ctx.restore();
}
