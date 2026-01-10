// js/core/Renderer.js

export class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
    }

    draw() {
        // 1. Clear Screen
        this.ctx.fillStyle = '#05070d';
        this.ctx.fillRect(0, 0, this.game.width, this.game.height);

        // 2. Draw Layers
        this.drawGrid();
        this.drawPath();

        this.drawTowers();
        this.drawEnemies();

        // --- THIS IS WHAT YOU WERE MISSING ---
        this.drawTroops();
        // -------------------------------------

        this.drawProjectiles();

        // 3. Draw UI Preview (Ghost Tower OR Selected Tower)
        if (this.game.selectedTowerType) {
            this.drawPreview();
        } else if (this.game.selectedTower) {
            this.drawRange(this.game.selectedTower);
        }
    }

    drawRange(tower) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    drawTroops() {
        this.game.troops.forEach(troop => {
            this.ctx.beginPath();
            this.ctx.fillStyle = '#00ff00'; // Green Dot
            this.ctx.arc(troop.x, troop.y, 6, 0, Math.PI * 2);
            this.ctx.fill();

            // Optional: Draw a tiny sword/range circle
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.stroke();
            this.ctx.closePath();
        });
    }
    drawProjectiles() {
        this.game.projectiles.forEach((proj, index) => {
            if (proj.isPulse) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.strokeStyle = proj.color;
                this.ctx.globalAlpha = Math.max(0, 1 - (Date.now() - (proj.startTime || Date.now())) / proj.duration);
                this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();

                if (!proj.startTime) proj.startTime = Date.now();
                return;
            }

            if (proj.isBeam) {
                // Transient Laser Beam
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.strokeStyle = proj.color || '#fff';
                this.ctx.lineWidth = proj.width || 2;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = proj.color || '#fff';
                this.ctx.moveTo(proj.from.x, proj.from.y);
                this.ctx.lineTo(proj.to.x, proj.to.y);
                this.ctx.stroke();
                this.ctx.restore();

                // Manage lifetime (Now handled in Game.js / Projectile update)
                if (!proj.startTime) proj.startTime = Date.now();
                return;
            }

            this.ctx.beginPath();
            this.ctx.fillStyle = '#FFD700'; // Gold color
            this.ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.closePath();
        });
    }

    drawTowers() {
        this.game.towers.forEach(tower => {
            // Pass the whole tower object for path data
            this.drawSciFiTower(tower.x, tower.y, tower.type.color, tower.level, false, tower.type.id, tower.rotation, tower);
        });
    }

    drawSciFiTower(x, y, color, level, isPreview = false, typeId = 'laser', rotation = -Math.PI / 2, tower = null) {
        const ctx = this.ctx;
        const time = Date.now() / 200; // Animation time base

        ctx.save();
        ctx.translate(x, y);

        // Global Glow for all sci-fi towers
        ctx.shadowBlur = isPreview ? 10 : 15;
        ctx.shadowColor = color;

        // Dispatch based on Type
        switch (typeId) {
            case 'machine':
                this.drawMachineTower(ctx, color, level, time, isPreview, rotation);
                break;
            case 'rail':
                this.drawRailTower(ctx, color, level, time, isPreview, rotation);
                break;
            case 'eco':
                this.drawEcoTower(ctx, color, level, time, isPreview);
                break;
            case 'spawner':
                this.drawSpawnerTower(ctx, color, level, time, isPreview);
                break;
            case 'laser':
            default:
                this.drawLaserTower(ctx, color, level, time, isPreview, rotation, tower);
                break;
        }

        // Draw Level Indicators (Universal Style: Orbiting Dots)
        if (level > 1 && !isPreview) {
            this.drawLevelIndicators(ctx, level, time);
        }

        ctx.restore();
    }

    // --- TOWER TYPE IMPLEMENTATIONS ---

    drawLaserTower(ctx, color, level, time, isPreview, rotation, tower) {
        // Base
        this.drawPolygon(ctx, 0, 0, 20, 6, '#1a1d26', color);

        const pathA = tower ? tower.pathA : 0;
        const pathB = tower ? tower.pathB : 0;

        // Path B: Prism Splitter Visual (Lens)
        if (pathB >= 1) {
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }

        // Turret (Rotates)
        ctx.save();
        ctx.rotate(rotation + Math.PI / 2);

        // Solar Core (Path A)
        if (pathA >= 2) {
            const corePulse = 0.8 + Math.sin(time * 2) * 0.2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffaa00';
            this.drawPolygon(ctx, 0, 0, 12 * corePulse, 8, '#ffcc00', '#fff');
        }

        ctx.fillStyle = '#2a2f3d';
        ctx.fillRect(-8, -8, 16, 16);

        // Barrel
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -22);

        // Path A Lvl 4: Thick Intense Beam Barrel
        if (pathA >= 3) {
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            ctx.stroke();
        }

        // Path B Lvl 4: Geometric Patterns (Refraction Web)
        if (pathB >= 3) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.rotate(Math.PI / 1.5);
                ctx.strokeRect(-12, -25, 4, 4);
            }
        }

        ctx.restore();

        // Pulsing Core
        const pulse = isPreview ? 1 : 0.8 + Math.sin(time) * 0.2;
        ctx.fillStyle = color;
        ctx.beginPath();
        if (level >= 5) {
            this.drawPolygon(ctx, 0, 0, 8 * pulse, pathA >= 4 ? 3 : 4, color, '#fff');
        } else {
            ctx.arc(0, 0, 5 * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawMachineTower(ctx, color, level, time, isPreview, rotation) {
        // Square Armored Base (Static)
        ctx.fillStyle = level >= 5 ? '#111' : '#222';
        ctx.fillRect(-18, -18, 36, 36);
        ctx.strokeStyle = color;
        ctx.lineWidth = level >= 5 ? 3 : 2;
        ctx.strokeRect(-18, -18, 36, 36);

        // Lvl 2: Ammo Box
        if (level >= 2) {
            ctx.fillStyle = '#444';
            ctx.fillRect(12, 5, 8, 12);
        }

        // ROTATING TURRET
        ctx.save();
        ctx.rotate(rotation + Math.PI / 2);

        // Turret (Bulkier)
        ctx.fillStyle = '#333';
        ctx.fillRect(-10, -10, 20, 20);

        // Gatling Barrels (3 lines)
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;

        const drawBarrel = (ox) => {
            ctx.beginPath();
            ctx.moveTo(ox - 2, -10); ctx.lineTo(ox - 2, -22);
            ctx.moveTo(ox + 2, -10); ctx.lineTo(ox + 2, -22);
            ctx.stroke();
        };

        drawBarrel(0); // Center

        // Lvl 3: Dual Wield (Extra Barrels)
        if (level >= 3) {
            drawBarrel(-6);
            drawBarrel(6);
        }

        // Spin effect
        if (!isPreview) {
            ctx.fillStyle = `rgba(255, 255, 0, ${Math.abs(Math.sin(time * 5))})`;
            ctx.fillRect(-2, -2, 4, 4);
        }

        ctx.restore(); // END ROTATION
    }

    drawRailTower(ctx, color, level, time, isPreview, rotation) {
        // Triangle Base (Static)
        this.drawPolygon(ctx, 0, 3, 22, 3, '#0d1117', color);

        // Lvl 2: Rear Capacitors (Static)
        if (level >= 2) {
            ctx.fillStyle = color;
            ctx.fillRect(-8, 8, 4, 6);
            ctx.fillRect(4, 8, 4, 6);
        }

        // ROTATING BARREL
        ctx.save();
        ctx.rotate(rotation + Math.PI / 2);

        // Long Rail Barrel
        const len = level >= 4 ? 35 : 25; // Lvl 4: Longer Barrel
        ctx.fillStyle = '#222';
        ctx.fillRect(-3, -len, 6, len + 5);

        // Glowing Rail Channel
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(0, -len);
        ctx.stroke();

        // Lvl 5: Energy Spikes
        if (level >= 5) {
            ctx.beginPath();
            ctx.moveTo(-6, -10); ctx.lineTo(-10, -15);
            ctx.moveTo(6, -10); ctx.lineTo(10, -15);
            ctx.stroke();
        }

        ctx.restore(); // END ROTATION
    }

    drawEcoTower(ctx, color, level, time, isPreview) {
        // Circular Base
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();

        // Large Pulsing Reactor
        // Lvl 5: Unstable Core
        const pulse = 1 + Math.sin(time * (level >= 5 ? 10 : 2)) * 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Expanding Ring (Ripple)
        const ripple = (time * 20) % 30;
        ctx.beginPath();
        ctx.arc(0, 0, ripple, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - ripple / 30})`;
        ctx.stroke();

        // Lvl 2: Outer Rotating Ring
        if (level >= 2) {
            ctx.beginPath();
            ctx.arc(0, 0, 14, time, time + Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Lvl 4: Inner Counter-Rotating Ring
        if (level >= 4) {
            ctx.beginPath();
            ctx.arc(0, 0, 6, -time * 2, -time * 2 + Math.PI);
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
    }

    drawSpawnerTower(ctx, color, level, time, isPreview) {
        // Rectangular Factory Base
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(-20, -15, 40, 30);
        ctx.strokeStyle = color;
        ctx.strokeRect(-20, -15, 40, 30);

        // Hangar Door (Stripes)
        ctx.fillStyle = '#111';
        ctx.fillRect(-10, -15, 20, 30);

        // Lvl 4: Extra Runway Lights
        if (level >= 4) {
            ctx.fillStyle = '#555';
            ctx.fillRect(-2, -15, 4, 30); // Runway strip
        }

        // Landing Lights (Blinking)
        const blink = Math.sin(time * 10) > 0;
        ctx.fillStyle = blink ? 'red' : '#333';
        ctx.fillRect(-18, -13, 4, 4);
        ctx.fillRect(14, -13, 4, 4);

        // Lvl 2: Radar Dish
        if (level >= 2) {
            ctx.save();
            ctx.translate(-15, 10);
            ctx.rotate(time);
            ctx.fillStyle = '#888';
            ctx.fillRect(-3, -1, 6, 2); // Dish base
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI); ctx.stroke(); // Dish
            ctx.restore();
        }

        // Lvl 5: Roof Defense Turret
        if (level >= 5) {
            ctx.fillStyle = color;
            ctx.fillRect(12, 8, 6, 6);
        }
    }

    // Helper for polygon shapes
    drawPolygon(ctx, x, y, radius, sides, fill, stroke) {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }

    drawLevelIndicators(ctx, level, time, isPreview) {
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = '#FFD700';

        for (let i = 0; i < level; i++) {
            // Orbit dots around the center
            const orbitAngle = (time * 0.5) + (i * ((Math.PI * 2) / level));
            const lx = Math.cos(orbitAngle) * 16;
            const ly = Math.sin(orbitAngle) * 16;

            ctx.beginPath();
            ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawEnemies() {
        this.game.enemies.forEach(enemy => {
            // A. Draw the Enemy Circle
            this.ctx.save();
            this.ctx.beginPath();

            // Status: Glow Hot (Burn)
            if (enemy.effects.burn.stacks > 0) {
                this.ctx.shadowBlur = enemy.effects.burn.stacks * 3;
                this.ctx.shadowColor = 'orange';
            }

            // Status: Spectrum Collapse Pulse Visual
            // (Handled by transient pulses or simple effect)

            this.ctx.fillStyle = enemy.type.color;
            this.ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
            this.ctx.fill();

            // Status: Light Disruption (Geometric patterns over enemy)
            if (enemy.effects.distortion.timer > 0) {
                this.ctx.strokeStyle = '#00ffff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(enemy.x - 12, enemy.y - 12, 24, 24);
            }

            this.ctx.restore();
            this.ctx.closePath();

            // B. Draw Health Bar Background (Red)
            const barWidth = 30;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y - 18; // Position above enemy

            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            // C. Draw Current Health (Green) - THE IMPORTANT MATH
            // limit lower bound to 0 so bar doesn't draw backwards if HP < 0
            const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        });
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.game.width; x += this.game.tileSize) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.game.height); this.ctx.stroke();
        }
        for (let y = 0; y <= this.game.height; y += this.game.tileSize) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.game.width, y); this.ctx.stroke();
        }
    }

    drawPath() {
        if (this.game.path.length < 2) return;
        const ts = this.game.tileSize;
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        const startX = this.game.path[0].x * ts + ts / 2;
        const startY = this.game.path[0].y * ts + ts / 2;
        this.ctx.moveTo(startX, startY);
        for (let i = 1; i < this.game.path.length; i++) {
            const px = this.game.path[i].x * ts + ts / 2;
            const py = this.game.path[i].y * ts + ts / 2;
            this.ctx.lineTo(px, py);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawPreview() {
        const mx = this.game.mouse.x;
        const my = this.game.mouse.y;

        // 1. Draw Range Circle
        this.ctx.beginPath();
        const isValid = this.game.checkPlacement(mx, my);
        const color = isValid ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]); // Dashed line
        this.ctx.arc(mx, my, this.game.selectedTowerType.range, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset dash

        // 2. Draw Ghost Tower
        // Pass the actual ID of the selected tower
        const typeId = this.game.selectedTowerType.id;
        const ghostColor = isValid ? this.game.selectedTowerType.color : '#FF0000';

        this.drawSciFiTower(mx, my, ghostColor, 1, true, typeId);
    }
}