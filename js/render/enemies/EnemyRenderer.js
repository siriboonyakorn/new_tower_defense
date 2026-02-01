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
            ctx.arc(0, 0, enemy.type.radius || 10, 0, Math.PI * 2);
            ctx.fill();

            // Add extra detail for Tank/Heavy
            if (enemy.typeName === 'TANK' || enemy.typeName === 'HEAVY') {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Armor plates
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(-6, -6, 4, 4);
                ctx.fillRect(2, 2, 4, 4);
            }
        }

        // --- ADAPTATION EFFECTS ---

        // 1. SHIELDED Effect
        if (enemy.typeName === 'SHIELDED') {
            const time = Date.now() * 0.005;
            const shieldAlpha = 0.3 + Math.sin(time) * 0.1;

            ctx.beginPath();
            ctx.arc(0, 0, (enemy.type.radius || 10) + 5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 204, ${shieldAlpha})`;
            ctx.fill();
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Hexagon pattern overlay (simple)
            ctx.globalAlpha = 0.1;
            ctx.rotate(time * 0.2);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * 12;
                const y = Math.sin(angle) * 12;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // 2. TELEPORTER Effect (Glitch/Flicker)
        if (enemy.typeName === 'TELEPORTER') {
            if (Math.random() < 0.15) {
                // Ghosting effect
                ctx.globalAlpha = 0.4;
                const offsetX = (Math.random() - 0.5) * 15;
                const offsetY = (Math.random() - 0.5) * 15;
                ctx.translate(offsetX, offsetY);

                ctx.beginPath();
                ctx.arc(0, 0, enemy.type.radius || 8, 0, Math.PI * 2);
                ctx.fillStyle = '#ff00ff';
                ctx.fill();

                ctx.translate(-offsetX, -offsetY);
                ctx.globalAlpha = 1.0;
            }
        }

        // 3. SPLITTER Effect (Pulsing orange aura)
        if (enemy.typeName === 'SPLITTER') {
            const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 5 + pulse * 10;
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, (enemy.type.radius || 12) + 2, 0, Math.PI * 2);
            ctx.stroke();
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
