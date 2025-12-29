import { TOWER_TYPES } from '../data/towers.js';

export class Game {
    constructor(canvasId, levelId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.levelId = levelId;
        
        // Size
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Grid
        this.tileSize = 60;
        
        // Game State
        this.isRunning = true;
        this.credits = 500;
        this.towers = []; // Array to store placed towers
        
        // Input State
        this.mouse = { x: 0, y: 0 };
        this.selectedTowerType = null; // What we are trying to build
        this.hoveredTile = { x: 0, y: 0 };

        this.path = [];
        this.setupPath();
        this.setupInputs();
        this.setupUI(); // Create the buttons

        // Show the HUD
        document.getElementById('game-hud').classList.remove('hidden');

        this.loop();
    }

    // --- SETUP ---
    setupUI() {
        const gridContainer = document.querySelector('.tower-grid');
        gridContainer.innerHTML = '';

        Object.values(TOWER_TYPES).forEach(tower => {
            const btn = document.createElement('div');
            btn.className = 'build-btn';
            btn.innerHTML = `
                <div class="tower-icon" style="background:${tower.color}"></div>
                <span>${tower.name.split(' ')[0]}</span>
                <span class="tower-cost">${tower.cost}</span>
            `;
            
            btn.onclick = () => {
                // Toggle selection
                if (this.selectedTowerType === tower) {
                    this.selectedTowerType = null;
                    btn.classList.remove('active');
                } else {
                    // Remove active from others
                    document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
                    this.selectedTowerType = tower;
                    btn.classList.add('active');
                }
            };
            gridContainer.appendChild(btn);
        });
    }

    setupInputs() {
        // Track Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;

            // Calculate Grid Tile
            this.hoveredTile.x = Math.floor(this.mouse.x / this.tileSize) * this.tileSize;
            this.hoveredTile.y = Math.floor(this.mouse.y / this.tileSize) * this.tileSize;
        });

        // Click to Build
        this.canvas.addEventListener('click', () => {
            if (this.selectedTowerType) {
                this.placeTower();
            }
        });
    }

    // --- GAME LOGIC ---
    placeTower() {
        // 1. Check Cost
        if (this.credits < this.selectedTowerType.cost) {
            console.log("Not enough credits!");
            return;
        }

        // 2. Check Valid Position (Not on path, Not on another tower)
        // (Simple check for now: just basic placement)
        
        // 3. Create Tower Object
        const newTower = {
            x: this.hoveredTile.x + this.tileSize/2,
            y: this.hoveredTile.y + this.tileSize/2,
            type: this.selectedTowerType,
            level: 1
        };

        this.towers.push(newTower);
        this.credits -= this.selectedTowerType.cost;
        this.updateResourceDisplay();
        
        // Optional: Deselect after building
        // this.selectedTowerType = null; 
    }

    updateResourceDisplay() {
        document.getElementById('res-credits').innerText = this.credits;
    }

    // ... (Keep setupPath, resize, stop from previous code) ...
    setupPath() { /* Use your winding path code here */ 
         this.path = [
            { x: 0, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 10 }, 
            { x: 12, y: 10 }, { x: 12, y: 4 }, { x: 20, y: 4 }, 
            { x: 20, y: 12 }, { x: 28, y: 12 }, { x: 35, y: 12 }
        ];
    }
    
    resize() { /* Keep resize code */ }
    stop() { this.isRunning = false; }

    // --- RENDER LOOP ---
    loop = () => {
        if (!this.isRunning) return;
        this.draw();
        requestAnimationFrame(this.loop);
    }

    draw() {
        // Clear Screen
        this.ctx.fillStyle = '#05070d';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawGrid();
        this.drawPath(); // (Assuming you kept this function)
        
        // Draw Towers
        this.drawTowers();

        // Draw Placement Preview (Ghost)
        if (this.selectedTowerType) {
            this.drawPreview();
        }
    }

    drawTowers() {
        this.towers.forEach(tower => {
            // Draw Base
            this.ctx.fillStyle = tower.type.color;
            this.ctx.fillRect(
                tower.x - 20, tower.y - 20, 
                40, 40
            );
            
            // Draw Level Badge
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`LV${tower.level}`, tower.x - 10, tower.y + 5);
        });
    }

    drawPreview() {
        const tx = this.hoveredTile.x + this.tileSize/2;
        const ty = this.hoveredTile.y + this.tileSize/2;
        
        // Draw Range Circle
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.arc(tx, ty, this.selectedTowerType.range, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw Ghost Tower
        this.ctx.fillStyle = this.selectedTowerType.color;
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillRect(tx - 20, ty - 20, 40, 40);
        this.ctx.globalAlpha = 1.0;
    }

    drawGrid() { /* Keep your grid code */ 
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.width; x += this.tileSize) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height); this.ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += this.tileSize) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y); this.ctx.stroke();
        }
    }
    
    drawPath() {
        if (this.path.length < 2) return;

        const ctx = this.ctx;
        const ts = this.tileSize;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)'; 
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]); 

        const startX = this.path[0].x * ts + ts / 2;
        const startY = this.path[0].y * ts + ts / 2;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < this.path.length; i++) {
            const px = this.path[i].x * ts + ts / 2;
            const py = this.path[i].y * ts + ts / 2;
            ctx.lineTo(px, py);
        }

        ctx.stroke();
        ctx.setLineDash([]); 

        ctx.fillStyle = '#ff4444';
        const endNode = this.path[this.path.length - 1];
        ctx.beginPath();
        ctx.arc(endNode.x * ts + ts / 2, endNode.y * ts + ts / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(startX, startY, 8, 0, Math.PI * 2);
        ctx.fill();
    }

}