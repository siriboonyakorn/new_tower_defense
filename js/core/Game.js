import { Renderer } from './Renderer.js';
import { WaveManager } from '../systems/WaveManager.js';
import { Input } from '../systems/Input.js';
import { Tower } from '../entities/Tower.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.renderer = new Renderer(this.ctx, this.width, this.height);
        this.input = new Input(this.canvas);
        this.waveManager = new WaveManager();
        
        this.lastTime = 0;
        this.entities = [];
        this.credits = 500;
        this.towerCost = 100;
        
        this.uiCredits = document.getElementById('credits');
    }

    start() {
        requestAnimationFrame((ts) => this.loop(ts));
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.handleInput();
        this.update(deltaTime);
        this.render();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    handleInput() {
        if (this.input.hasClicked()) {
            const mouse = this.input.getMousePos();
            if (this.canPlaceTower(mouse.x, mouse.y)) {
                this.placeTower(mouse.x, mouse.y);
            }
        }
    }

    canPlaceTower(x, y) {
        if (this.credits < this.towerCost) return false;

        if (this.isPointOnPath(x, y, 40)) return false;

        for (const entity of this.entities) {
            if (entity instanceof Tower) {
                const dist = MathUtils.getDistance(x, y, entity.x, entity.y);
                if (dist < entity.radius * 2) return false;
            }
        }
        return true;
    }

    isPointOnPath(x, y, buffer) {
        const path = this.waveManager.currentLevel.path;
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            const dist = this.distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            if (dist < buffer) return true;
        }
        return false;
    }

    distToSegment(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    placeTower(x, y) {
        this.entities.push(new Tower(x, y));
        this.credits -= this.towerCost;
        this.uiCredits.innerText = this.credits;
    }

    update(deltaTime) {
        this.waveManager.update(deltaTime, this.entities);
        
        for (const entity of this.entities) {
            entity.update(deltaTime, this.entities);
        }

        this.entities = this.entities.filter(entity => entity.active);
    }

    render() {
        this.renderer.clear();
        this.drawMap();
        
        const mouse = this.input.getMousePos();
        this.drawPlacementPreview(mouse);

        this.entities.forEach(entity => this.renderer.draw(entity));
    }

    drawPlacementPreview(mouse) {
        this.ctx.beginPath();
        this.ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.stroke();

        this.ctx.fillStyle = this.canPlaceTower(mouse.x, mouse.y) ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(mouse.x, mouse.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawMap() {
        if (!this.waveManager.currentLevel) return;
        const path = this.waveManager.currentLevel.path;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }
        this.ctx.stroke();
    }
}