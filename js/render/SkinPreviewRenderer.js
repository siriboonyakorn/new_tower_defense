/**
 * SkinPreviewRenderer.js
 * Renders a high-fidelity "Holographic" pseudo-3D preview of towers.
 */
export const SkinPreviewRenderer = {

    draw(ctx, skin, type, time, isLocked = false) {
        if (!ctx || !skin) return;

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);
        ctx.save();

        // Locked mode: Override colors
        let colors = skin.colors;
        if (isLocked) {
            colors = {
                base: '#080808',
                detail: '#111',
                highlight: '#222',
                glow: 'rgba(0,0,0,0)'
            };
        }

        // 1. Holographic Grid & Floor
        if (!isLocked) {
            this.drawHoloFloor(ctx, cx, cy + 60, time, colors.glow);
        }

        // 2. Main Tower Render
        ctx.translate(cx, cy);

        // Scale up for the preview
        ctx.scale(1.5, 1.5);

        // Use local colors
        const renderSkin = { ...skin, colors: colors };
        skin = renderSkin; // Dirty swap for this scope


        switch (type) {
            case 'machine': this.drawMachineGun(ctx, skin, time); break;
            case 'laser': this.drawLaser(ctx, skin, time); break;
            case 'eco': this.drawEco(ctx, skin, time); break;
            case 'rail': this.drawRail(ctx, skin, time); break;
            case 'spawner': this.drawSpawner(ctx, skin, time); break;
            default: this.drawGeneric(ctx, skin, time); break;
        }

        ctx.restore();
    },

    drawHoloFloor(ctx, x, y, time, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.3); // Flatten to look like floor

        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();

        // Spinning rings
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.arc(0, 0, 60 + Math.sin(time * 2) * 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    },

    // --- TOWER MODELS ---

    drawMachineGun(ctx, skin, time) {
        const angle = time; // Rotation angle
        const c = skin.colors;

        // Base implementation (Static-ish)
        ctx.fillStyle = c.detail;
        ctx.fillRect(-20, 10, 40, 10); // Base Plate
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.lineTo(-10, -10);
        ctx.lineTo(10, -10);
        ctx.lineTo(15, 10);
        ctx.fill();

        // Turret Head (Rotating)
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Calculate "3D" points for key features
        // Barrel position orbiting center
        const barrelLen = 25;
        const bx = cos * barrelLen;
        const by = sin * 0.2 * barrelLen; // Flatten Y to look 2.5D

        // Draw Turret Body
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.ellipse(0, -15, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c.highlight;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Barrels
        // Determine if barrels are "behind" or "in front" based on sin
        const isBehind = sin < 0;

        if (isBehind) {
            this.drawBarrels(ctx, bx, by, c);
            this.drawTurretTop(ctx, c); // Draw top over barrels
        } else {
            this.drawTurretTop(ctx, c); // Draw top under barrels
            this.drawBarrels(ctx, bx, by, c);
        }
    },

    drawBarrels(ctx, bx, by, c) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = c.detail;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.moveTo(0, -15);
        ctx.lineTo(bx, -15 + by);
        ctx.stroke();

        // Muzzle Glow
        ctx.beginPath();
        ctx.fillStyle = c.highlight;
        ctx.arc(bx, -15 + by, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
    },

    drawTurretTop(ctx, c) {
        ctx.fillStyle = c.detail;
        ctx.beginPath();
        ctx.ellipse(0, -22, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    // TODO: Implement other types with similar logic or simplified
    drawGeneric(ctx, skin, time) {
        // Floating Cube
        const c = skin.colors;
        const size = 30;
        ctx.fillStyle = c.base;
        ctx.strokeStyle = c.highlight;

        ctx.save();
        ctx.translate(0, Math.sin(time * 2) * 10);
        ctx.rotate(time);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.restore();
    },

    drawLaser(ctx, skin, time) {
        const c = skin.colors;

        // Prism Base
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.moveTo(-20, 20);
        ctx.lineTo(20, 20);
        ctx.lineTo(0, -30);
        ctx.fill();

        // Floating Crystal
        ctx.save();
        ctx.translate(0, -40 + Math.sin(time * 1.5) * 5);
        ctx.rotate(time * 0.5);

        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 15;
        ctx.fillStyle = c.highlight;

        // Draw Diamond shape
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-12, 0);
        ctx.fill();
        ctx.restore();
    },

    drawEco(ctx, skin, time) {
        const c = skin.colors;

        // Central Pylon
        ctx.fillStyle = c.base;
        ctx.fillRect(-10, -20, 20, 60);

        // Solar Panels (Orbiting)
        for (let i = 0; i < 3; i++) {
            const angle = time + (i * (Math.PI * 2 / 3));
            const x = Math.cos(angle) * 35;
            const y = Math.sin(angle) * 10; // 3D Tilt

            // Size based on depth (front = big)
            const scale = Math.sin(angle) > 0 ? 1.1 : 0.9;
            const zIndex = Math.sin(angle); // >0 = front

            if (zIndex < 0) this.drawPanel(ctx, x, y, scale, c);
        }

        // Re-draw pylon if needed or just Panels
        // Actually simple pylon is center z=0

        for (let i = 0; i < 3; i++) {
            const angle = time + (i * (Math.PI * 2 / 3));
            const zIndex = Math.sin(angle);
            if (zIndex >= 0) {
                const x = Math.cos(angle) * 35;
                const y = Math.sin(angle) * 10;
                const scale = 1.1;
                this.drawPanel(ctx, x, y, scale, c);
            }
        }
    },

    drawPanel(ctx, x, y, scale, c) {
        ctx.save();
        ctx.translate(x, y - 20);
        ctx.scale(scale, scale);
        ctx.fillStyle = c.detail;
        ctx.strokeStyle = c.highlight;
        ctx.beginPath();
        ctx.rect(-10, -8, 20, 16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = c.glow;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.restore();
    },

    drawRail(ctx, skin, time) {
        // Long barrel
        const c = skin.colors;
        const angle = time;

        ctx.rotate(angle);

        ctx.fillStyle = c.base;
        ctx.fillRect(-10, -30, 20, 60);

        // Rails
        ctx.fillStyle = c.highlight;
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 10;
        ctx.fillRect(-14, -40, 4, 80);
        ctx.fillRect(10, -40, 4, 80);
    },

    drawSpawner(ctx, skin, time) {
        const c = skin.colors;

        // Hangar box
        ctx.fillStyle = c.base;
        ctx.fillRect(-25, -15, 50, 30);
        ctx.strokeStyle = c.detail;
        ctx.strokeRect(-25, -15, 50, 30);

        // Drone orbiting
        const dx = Math.cos(time * 3) * 40;
        const dy = Math.sin(time * 3) * 10;

        ctx.fillStyle = c.highlight;
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 5;

        ctx.beginPath();
        ctx.arc(dx, dy - 10, 4, 0, Math.PI * 2);
        ctx.fill();
    }
};
