export function drawProjectiles(ctx, game) {
    game.projectiles.forEach((proj) => {
        if (proj.isPulse) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = proj.color;
            const life = (Date.now() - proj.startTime) / proj.duration;
            ctx.globalAlpha = Math.max(0, 1 - life);
            ctx.lineWidth = 2;
            ctx.arc(proj.x, proj.y, proj.radius * (0.2 + 0.8 * life), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            return;
        }

        if (proj.isBeam) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = proj.color || '#fff';
            ctx.lineWidth = proj.width || 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = proj.color || '#fff';
            ctx.lineCap = 'round';
            ctx.moveTo(proj.from.x, proj.from.y);
            ctx.lineTo(proj.to.x, proj.to.y);
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.beginPath();
        ctx.fillStyle = proj.color || '#FFD700';
        ctx.arc(proj.x, proj.y, proj.radius || 4, 0, Math.PI * 2);
        ctx.fill();
    });
}
