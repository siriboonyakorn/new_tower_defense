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

        // 3. Draw UI Preview (Ghost Tower)
        if (this.game.selectedTowerType) {
            this.drawPreview();
        }
    }

    drawTroops() {
        // If this function is missing, troops are invisible!
        this.game.troops.forEach(troop => {
            this.ctx.fillStyle = troop.color || '#ffffff'; // Default to white
            this.ctx.beginPath();
            this.ctx.arc(troop.x, troop.y, troop.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw little sword/fight indicator if fighting
            if (troop.isFighting) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(troop.x - 4, troop.y - 4);
                this.ctx.lineTo(troop.x + 4, troop.y + 4);
                this.ctx.moveTo(troop.x + 4, troop.y - 4);
                this.ctx.lineTo(troop.x - 4, troop.y + 4);
                this.ctx.stroke();
            }
        });
    }

    drawProjectiles() {
        this.game.projectiles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.fillStyle = p.color;
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    drawTowers() {
        this.game.towers.forEach(tower => {
            this.ctx.fillStyle = tower.type.color;
            this.ctx.fillRect(tower.x - 20, tower.y - 20, 40, 40);
        });
    }

    drawEnemies() {
        this.game.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.type.color;
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, enemy.type.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // HP Bar
            const hpPercent = enemy.hp / enemy.type.maxHp;
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(enemy.x - 10, enemy.y - 20, 20, 4);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(enemy.x - 10, enemy.y - 20, 20 * hpPercent, 4);
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
        const tx = this.game.hoveredTile.x + this.game.tileSize/2;
        const ty = this.game.hoveredTile.y + this.game.tileSize/2;
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.arc(tx, ty, this.game.selectedTowerType.range, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fillStyle = this.game.selectedTowerType.color;
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillRect(tx - 20, ty - 20, 40, 40);
        this.ctx.globalAlpha = 1.0;
    }
}