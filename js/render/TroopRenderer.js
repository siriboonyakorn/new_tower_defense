export function drawTroops(ctx, game) {
    game.troops.forEach(troop => {
        ctx.save();
        ctx.translate(troop.x, troop.y);

        const model = troop.modelType || 'infantry';
        const color = troop.color || '#00ff00';
        const radius = troop.radius || 6;
        const time = Date.now() / 1000;

        // 1. Base Glow / Shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        switch (model) {
            case 'mech':
                drawMechTroop(ctx, color, radius, time);
                break;
            case 'titan':
                drawTitanTroop(ctx, color, radius, time);
                break;
            case 'drone':
                drawDroneTroop(ctx, color, radius, time);
                break;
            case 'carrier':
                drawCarrierTroop(ctx, color, radius, time);
                break;
            default:
                drawInfantryTroop(ctx, color, radius, time);
        }

        ctx.restore();
    });
}

function drawInfantryTroop(ctx, color, radius, time) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Weapon / Slash
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const swing = Math.sin(time * 10) * 0.2;
    ctx.rotate(swing);
    ctx.moveTo(-radius / 2, radius / 2);
    ctx.lineTo(radius, -radius);
    ctx.stroke();
}

function drawMechTroop(ctx, color, radius, time) {
    ctx.fillStyle = '#444';
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#666';
    ctx.fillRect(-radius - 2, -radius + 2, 4, 8);
    ctx.fillRect(radius - 2, -radius + 2, 4, 8);
}

function drawTitanTroop(ctx, color, radius, time) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6;
        const px = Math.cos(ang) * radius;
        const py = Math.sin(ang) * radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    const pulse = 0.8 + Math.sin(time * 5) * 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);
}

function drawDroneTroop(ctx, color, radius, time) {
    ctx.rotate(time * 4);
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, -radius / 2);
        ctx.lineTo(radius, radius / 2);
        ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawCarrierTroop(ctx, color, radius, time) {
    ctx.fillStyle = '#333';
    ctx.fillRect(-radius, -radius / 2, radius * 2, radius);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-radius, -radius / 2, radius * 2, radius);

    const rotorSize = radius * 0.6;
    const offsets = [[-radius, -radius / 2], [radius, -radius / 2], [-radius, radius / 2], [radius, radius / 2]];
    offsets.forEach(pos => {
        ctx.save();
        ctx.translate(pos[0], pos[1]);
        ctx.rotate(time * 10);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(-rotorSize / 2, 0); ctx.lineTo(rotorSize / 2, 0);
        ctx.moveTo(0, -rotorSize / 2); ctx.lineTo(0, rotorSize / 2);
        ctx.stroke();
        ctx.restore();
    });
}
