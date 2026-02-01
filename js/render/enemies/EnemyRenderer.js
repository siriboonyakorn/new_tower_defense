export function drawEnemies(ctx, game) {
    game.enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        if (enemy.isAir) {
            // Draw Ground Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 15, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Floating Offset
            const floatY = Math.sin(Date.now() * 0.005) * 5 - 10;
            ctx.translate(0, floatY);

            // Diamond/Triangular Shape for Air
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(12, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(-12, 0);
            ctx.closePath();
            ctx.fillStyle = enemy.type.color;
            ctx.fill();

            // Cockpit/Glow
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(0, -4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        } else {
            // Standard Ground Shape (Circle)
            ctx.beginPath();
            ctx.fillStyle = enemy.type.color;
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;

        if (enemy.effects && enemy.effects.distortion && enemy.effects.distortion.timer > 0) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-12, -12, 24, 24);
        }

        const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);
        const barY = enemy.isAir ? -25 : -18; // Move health bar above air units

        // Background (Dark Red)
        ctx.fillStyle = '#400';
        ctx.fillRect(-15, barY, 30, 4);

        // Dynamic Color (Red -> Yellow -> Green)
        const hue = hpPercent * 120;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(-15, barY, 30 * hpPercent, 4);

        ctx.restore();
    });

    // Draw Tooltip for hovered enemy on top of everything
    if (game.hoveredEnemy) {
        drawTooltip(ctx, game.hoveredEnemy);
    }
}

function drawTooltip(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const text = `${enemy.type.name}`;
    const hpText = `${Math.ceil(enemy.hp)}/${enemy.maxHp}`;

    ctx.font = 'bold 12px "Orbitron", sans-serif';
    const width = Math.max(ctx.measureText(text).width, ctx.measureText(hpText).width) + 20;
    const height = 40;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Draw tooltip above enemy
    ctx.rect(-width / 2, -50, width, height);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, -35); // Name

    // HP Color based on health
    const hpPercent = enemy.hp / enemy.maxHp;
    ctx.fillStyle = `hsl(${hpPercent * 120}, 100%, 50%)`;
    ctx.fillText(hpText, 0, -20); // HP

    ctx.restore();
}
