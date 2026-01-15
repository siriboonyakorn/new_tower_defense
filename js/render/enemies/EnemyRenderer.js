export function drawEnemies(ctx, game) {
    game.enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        ctx.beginPath();
        if (enemy.effects && enemy.effects.burn && enemy.effects.burn.stacks > 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff4400';
        }

        ctx.fillStyle = enemy.type.color;
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (enemy.effects && enemy.effects.distortion && enemy.effects.distortion.timer > 0) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-12, -12, 24, 24);
        }

        const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = '#400';
        ctx.fillRect(-15, -18, 30, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(-15, -18, 30 * hpPercent, 4);

        ctx.restore();
    });
}
