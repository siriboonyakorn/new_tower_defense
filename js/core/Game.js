// js/core/Game.js

import { TOWER_TYPES } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { WAVES } from '../data/waves.js';
import { Renderer } from './Renderer.js';
import { Tower } from '../entities/Tower.js';

export class Game {
    constructor(canvasId, levelId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.levelId = levelId;
        
        // Dimensions
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.tileSize = 60;

        // Game State
        this.isRunning = true;
        this.credits = 600;
        this.lives = 20;
        
        // Wave System
        this.waveIndex = 0; 
        this.isWaveActive = false;
        this.waveTimer = 0; 
        this.enemiesRemainingToSpawn = 0;
        this.spawnTimer = 0;
        this.currentWaveConfig = null;

        // Entities
        this.towers = [];
        this.enemies = [];
        this.projectiles = []; 
        this.troops = [];
        
        // Input
        this.mouse = { x: 0, y: 0 };
        this.hoveredTile = { x: 0, y: 0 };
        this.selectedTowerType = null;

        this.path = [];
        this.setupPath();
        this.setupInputs();
        this.setupUI();
        
        // Renderer
        this.renderer = new Renderer(this);

        // Show UI
        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('btn-toggle-build').classList.remove('hidden');
        this.updateResourceDisplay();

        this.loop();
    }

    // --- GAME LOOP ---
    loop = () => {
        if (!this.isRunning) return;
        this.update();
        this.renderer.draw(); 
        requestAnimationFrame(this.loop);
    }

    update() {
        // --- 1. WAVE LOGIC (Restored) ---
        if (this.isWaveActive) {
            // Spawning
            if (this.enemiesRemainingToSpawn > 0) {
                this.spawnTimer++;
                const framesToWait = this.currentWaveConfig.interval / 16; 
                if (this.spawnTimer >= framesToWait) {
                    this.spawnEnemy();
                    this.spawnTimer = 0;
                }
            } else if (this.enemies.length === 0) {
                // Wave Complete
                this.isWaveActive = false;
                const startBtn = document.getElementById('btn-start-wave');
                const skipBtn = document.getElementById('btn-skip-wave');
                if(startBtn) {
                    startBtn.classList.remove('hidden');
                    startBtn.innerText = `START WAVE ${this.waveIndex + 1}`;
                }
                if(skipBtn) skipBtn.classList.add('hidden');
            }

            // Skip Timer
            this.waveTimer++;
            if (this.waveTimer > 600 && this.enemies.length > 0) {
                const skipBtn = document.getElementById('btn-skip-wave');
                if(skipBtn) skipBtn.classList.remove('hidden');
            }
        }

        this.troops.forEach((troop, index) => {
            troop.update();
            if (troop.markedForDeletion) {
                this.troops.splice(index, 1);
            }
        });

        // --- 2. UPDATE ENTITIES ---
        this.towers.forEach(tower => tower.update());

        this.projectiles.forEach((proj, index) => {
            proj.update();
            if (proj.markedForDeletion) {
                this.projectiles.splice(index, 1);
            }
        });

        this.enemies.forEach((enemy, index) => {
            // Check Death
            if (enemy.hp <= 0) {
                this.credits += enemy.type.reward;
                this.updateResourceDisplay(); // FIX: Removed 'this.ui.'
                this.enemies.splice(index, 1);
                return;
            }

            // Move Enemy
            const target = this.path[enemy.pathIndex + 1];
            if (!target) return;

            const tx = target.x * this.tileSize + this.tileSize/2;
            const ty = target.y * this.tileSize + this.tileSize/2;
            const dx = tx - enemy.x;
            const dy = ty - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < enemy.speed) {
                enemy.x = tx; enemy.y = ty; enemy.pathIndex++;
                if (enemy.pathIndex >= this.path.length - 1) {
                    this.lives--;
                    this.updateResourceDisplay(); // FIX: Removed 'this.ui.'
                    this.enemies.splice(index, 1);
                }
            } else {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }
        });
    }

    spawnEnemy() {
        const typeConfig = ENEMIES[this.currentWaveConfig.type];
        const enemy = {
            id: Math.random(),
            type: typeConfig,
            x: this.path[0].x * this.tileSize + this.tileSize/2,
            y: this.path[0].y * this.tileSize + this.tileSize/2,
            pathIndex: 0,
            hp: typeConfig.hp,
            maxHp: typeConfig.hp,
            speed: typeConfig.speed,
            frozen: false
        };
        this.enemies.push(enemy);
        this.enemiesRemainingToSpawn--;
    }

    // js/core/Game.js

    startNextWave() {
        if (this.waveIndex >= WAVES.length) return;

        this.currentWaveConfig = WAVES[this.waveIndex];
        this.enemiesRemainingToSpawn = this.currentWaveConfig.count;
        this.spawnTimer = 0;
        this.isWaveActive = true;
        this.waveTimer = 0;
        // --- NEW: ECONOMY CALCULATION ---
        let waveReward = this.currentWaveConfig.reward;
        let towerIncome = 0;
        // 1. Loop through all towers
        this.towers.forEach(tower => {
            // 2. Check if it's an Economy tower (like the Energy Core)
            if (tower.type.type === 'economy') {
                towerIncome += tower.type.income;
            }
        });
        // 3. Log it so you can see it working in the Console (F12)
        if (towerIncome > 0) {
            console.log(`$$$ PAYDAY: Generated ${towerIncome} credits from towers.`);
        }
        // 4. Add everything to your bank
        this.credits += (waveReward + towerIncome);
        // -----------------------------
        this.updateResourceDisplay();
        this.waveIndex++;
        
        document.getElementById('res-wave').innerText = this.waveIndex;
        document.getElementById('btn-start-wave').classList.add('hidden');
        document.getElementById('btn-skip-wave').classList.add('hidden');
    }

    setupPath() {
         this.path = [
            { x: 0, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 10 }, 
            { x: 12, y: 10 }, { x: 12, y: 4 }, { x: 20, y: 4 }, 
            { x: 20, y: 12 }, { x: 28, y: 12 }, { x: 35, y: 12 }
        ];
    }

    setupUI() {
        const startBtn = document.getElementById('btn-start-wave');
        const skipBtn = document.getElementById('btn-skip-wave');
        if (startBtn) startBtn.onclick = () => this.startNextWave();
        if (skipBtn) skipBtn.onclick = () => this.startNextWave();
        
        const gridContainer = document.querySelector('.tower-grid');
        const sidePanel = document.querySelector('.side-panel');
        const buildBtn = document.getElementById('btn-toggle-build');

        if (buildBtn) {
            buildBtn.onclick = (e) => {
                e.stopPropagation(); 
                sidePanel.classList.toggle('open');
            };
        }

        window.addEventListener('click', (e) => {
            if (sidePanel.classList.contains('open') && 
                !sidePanel.contains(e.target) && 
                e.target !== buildBtn) {
                sidePanel.classList.remove('open');
            }
        });

        gridContainer.innerHTML = '';
        Object.values(TOWER_TYPES).forEach(tower => {
            const btn = document.createElement('div');
            btn.className = 'build-btn';
            btn.innerHTML = `
                <div class="tower-icon" style="background:${tower.color}"></div>
                <span>${tower.name.split(' ')[0]}</span>
                <span class="tower-cost">${tower.cost}</span>
            `;
            btn.onclick = (e) => {
                e.stopPropagation();
                if (this.selectedTowerType === tower) {
                    this.selectedTowerType = null;
                    btn.classList.remove('active');
                } else {
                    document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
                    this.selectedTowerType = tower;
                    btn.classList.add('active');
                    sidePanel.classList.remove('open');
                }
            };
            gridContainer.appendChild(btn);
        });
    }

    setupInputs() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.hoveredTile.x = Math.floor(this.mouse.x / this.tileSize) * this.tileSize;
            this.hoveredTile.y = Math.floor(this.mouse.y / this.tileSize) * this.tileSize;
        });

        this.canvas.addEventListener('click', () => {
            if (this.selectedTowerType) this.placeTower();
        });
    }

    updateResourceDisplay() {
        document.getElementById('res-credits').innerText = this.credits;
        document.getElementById('res-lives').innerText = this.lives;
    }

    placeTower() {
         if (this.credits < this.selectedTowerType.cost) return;
         
         const newTower = new Tower(
             this, 
             this.hoveredTile.x + this.tileSize/2,
             this.hoveredTile.y + this.tileSize/2,
             this.selectedTowerType
         );

        this.towers.push(newTower);
        this.credits -= this.selectedTowerType.cost;
        
        this.updateResourceDisplay(); // FIX: Removed 'this.ui.'
        
        // Manual Deselect Logic
        this.selectedTowerType = null;
        document.querySelectorAll('.build-btn').forEach(btn => btn.classList.remove('active'));
    }
}