import { drawGrid, drawPath } from '../render/MapRenderer.js';
import { drawLaserTower } from '../render/towers/LaserTower.js';
import { drawMachineTower } from '../render/towers/MachineTower.js';
import { drawRailTower } from '../render/towers/RailTower.js';
import { drawEcoTower } from '../render/towers/EcoTower.js';
import { drawSpawnerTower } from '../render/towers/SpawnerTower.js';
import { drawFlakTower } from '../render/towers/FlakTower.js';
import { drawEnemies } from '../render/enemies/EnemyRenderer.js';
import { drawTroops } from '../render/TroopRenderer.js';
import { drawProjectiles } from '../render/ProjectileRenderer.js';
import { drawRange, drawLevelIndicators, drawPreview, drawOverclockUI } from '../render/UIOverlayRenderer.js';
import { MapModifier } from '../managers/MapModifier.js';

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

        // 2. Map Elements
        drawGrid(this.ctx, this.game);
        drawPath(this.ctx, this.game);

        // 2.5 Dynamic Map Zones
        MapModifier.draw(this.ctx);

        // 3. Dynamic Elements
        this.drawTowers();
        drawEnemies(this.ctx, this.game);
        drawTroops(this.ctx, this.game);
        drawProjectiles(this.ctx, this.game);

        // 4. UI Overlays
        if (this.game.selectedTowerType) {
            drawPreview(this.ctx, this.game, this.renderSpecificTower.bind(this));
        } else if (this.game.selectedTower) {
            drawRange(this.ctx, this.game.selectedTower);
        }
    }

    drawTowers() {
        this.game.towers.forEach(tower => {
            this.renderSpecificTower(tower);
            if (tower.level > 1) {
                drawLevelIndicators(this.ctx, tower);
            }
            // Add Overclock/Disable visuals
            drawOverclockUI(this.ctx, tower);
        });
    }

    renderSpecificTower(tower) {
        this.ctx.save();
        this.ctx.translate(tower.x, tower.y);

        switch (tower.type.id) {
            case 'laser':
                drawLaserTower(this.ctx, tower);
                break;
            case 'machine':
                drawMachineTower(this.ctx, tower);
                break;
            case 'rail':
                drawRailTower(this.ctx, tower);
                break;
            case 'eco':
                drawEcoTower(this.ctx, tower);
                break;
            case 'spawner':
                drawSpawnerTower(this.ctx, tower);
                break;
            case 'flak':
                drawFlakTower(this.ctx, tower);
                break;
            case 'commander':
                // Simple placeholder for now, red dish
                this.ctx.fillStyle = '#444';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#ff3333';
                this.ctx.beginPath();
                this.ctx.arc(0, -5, 8, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            default:
                this.ctx.fillStyle = tower.type.color || '#fff';
                this.ctx.fillRect(-15, -15, 30, 30);
                break;
        }
        this.ctx.restore();
    }
}