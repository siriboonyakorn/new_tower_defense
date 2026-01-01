// js/core/Game.js

import { TOWER_TYPES } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { LEVEL_WAVES } from '../data/waves.js'; // Import the new object
import { Renderer } from './Renderer.js';
import { Tower } from '../entities/Tower.js';
import { levels } from '../data/levels.js';

export class Game {
    constructor(canvasId, levelId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.levelId = levelId;

        this.waves = LEVEL_WAVES[this.levelId] || LEVEL_WAVES['sector1']; 
        console.log(`Loaded ${this.waves.length} waves for ${this.levelId}`);

        console.log("Loading Level ID:", this.levelId);
        
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
        this.selectedTower = null;

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
            // 1. Spawning Logic (Keep this as is)
            if (this.enemiesRemainingToSpawn > 0) {
                this.spawnTimer++;
                const framesToWait = this.currentWaveConfig.interval / 16;
                if (this.spawnTimer >= framesToWait) {
                    this.spawnEnemy();
                    this.spawnTimer = 0;
                }
            
            // 2. CHECK: Are all enemies dead?
            } else if (this.enemies.length === 0) {
                
                // Turn off the current wave flag so we don't trigger this 60 times a second
                this.isWaveActive = false; 

                // Check if we have more waves left
                if (this.waveIndex < this.waves.length) {
                    console.log("Wave Cleared! Next wave incoming...");
                    
                    // HIDE the buttons so user doesn't click them by accident
                    const startBtn = document.getElementById('btn-start-wave');
                    if (startBtn) startBtn.classList.add('hidden');

                    // AUTO-START NEXT WAVE (with a 2-second breather)
                    setTimeout(() => {
                        this.startNextWave();
                    }, 2000); 

                } else {
                    // No more waves? YOU WIN!
                    this.handleVictory();
                }
            }
            
            // 3. Skip Button Logic (Optional: Hide it if wave is almost done)
            this.waveTimer++;
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
                // --- 3. UPDATE ENEMIES (Replace your old loop with this) ---
                // We loop backwards to safely remove enemies
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];

                    // A. Check Death (Health <= 0)
                    if (enemy.hp <= 0) {
                        this.credits += enemy.type.reward;
                        this.updateResourceDisplay();
                        this.enemies.splice(i, 1);
                        continue; // Move to next enemy
                    }

                    // B. Move Enemy Logic
                    const target = this.path[enemy.pathIndex + 1];
                    
                    // If no target, they reached the end (Base Hit!)
                    if (!target) {
                        this.lives--;             // Lose a life
                        this.updateResourceDisplay(); // Update HTML
                        this.enemies.splice(index, 1); // Remove enemy
                        
                        // Optional: Check Game Over
                        if (this.lives <= 0) {
                            alert("GAME OVER");
                            window.location.reload();
                        }
                        return; // Stop here for this enemy
                    }

                    const tx = target.x * this.tileSize + this.tileSize/2;
                    const ty = target.y * this.tileSize + this.tileSize/2;
                    const dx = tx - enemy.x;
                    const dy = ty - enemy.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < enemy.speed) {
                        // Snap to grid and move to next waypoint
                        enemy.x = tx; 
                        enemy.y = ty; 
                        enemy.pathIndex++;
                        
                        // Check if this was the FINAL waypoint
                        if (enemy.pathIndex >= this.path.length - 1) {
                            this.handleBaseHit(i);
                        }
                    } else {
                        // Smooth movement towards target
                        enemy.x += (dx / dist) * enemy.speed;
                        enemy.y += (dy / dist) * enemy.speed;
                    }
                }
            } else {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }
        });
    }

    spawnEnemy() {
        // 1. Get the enemy type string (e.g., 'SCOUT')
        const typeKey = this.currentWaveConfig.type;
        
        // 2. Look it up in the ENEMIES object
        const typeConfig = ENEMIES[typeKey];

        // --- SAFETY CHECK ---
        if (!typeConfig) {
            console.error(`CRITICAL: Enemy type '${typeKey}' not defined in enemies.js!`);
            this.enemiesRemainingToSpawn--; // Skip it so the game doesn't freeze
            return;
        }
        // --------------------

        const enemy = {
            id: Math.random(),
            type: typeConfig, // This is now safe
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

    handleVictory() {
        this.isRunning = false;

        const screen = document.getElementById('end-screen');
        const card = document.querySelector('.end-card');
        const title = document.getElementById('end-title');
        const reason = document.getElementById('end-reason');
        const waves = document.getElementById('end-waves');

        // 1. Set Content
        title.innerText = "MISSION COMPLETE";
        reason.innerText = "SECTOR SECURED";
        waves.innerText = "ALL WAVES CLEARED";

        // 2. Set Style (Green)
        card.className = 'end-card victory';

        // 3. Show Screen
        screen.classList.remove('hidden');
    }

    // js/core/Game.js

    startNextWave() {
        if (this.waveIndex >= this.waves.length) {
            console.log("VICTORY! ALL WAVES CLEARED.");
            // You can add a victory screen call here later
            return;
        }

        this.currentWaveConfig = this.waves[this.waveIndex];
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
        // Find the specific level object by its ID
        const levelData = levels.find(l => l.id === this.levelId);

        if (levelData) {
            this.path = levelData.path;
            console.log("Path loaded successfully!");
        } else {
            console.error("CRITICAL: Level ID not found in data! Fallback active.");
            // This is the straight line you are seeing now:
            this.path = [{ x: 0, y: 7 }, { x: 35, y: 7 }];
        }
    }

    setupUI() {
        const startBtn = document.getElementById('btn-start-wave');
        const skipBtn = document.getElementById('btn-skip-wave');
        const returnBtn = document.getElementById('btn-return-menu');
        if (returnBtn) {
            returnBtn.onclick = () => {
                window.location.reload(); // Reloads page to go back to Menu
            };
        }
        // Wire up Wave Buttons
        if (startBtn) startBtn.onclick = () => this.startNextWave();
        if (skipBtn) skipBtn.onclick = () => this.startNextWave();
        
        // --- TOWER GRID GENERATION ---
        const gridContainer = document.querySelector('.tower-grid');
        gridContainer.innerHTML = '';
        
        Object.values(TOWER_TYPES).forEach(tower => {
            const btn = document.createElement('div');
            btn.className = 'build-btn';
            btn.innerHTML = `
                <div class="tower-icon" style="background:${tower.color}"></div>
                <div class="build-info">
                    <span class="name">${tower.name.split(' ')[0]}</span>
                    <span class="cost">${tower.cost}</span>
                </div>
            `;
            
            btn.onclick = (e) => {
                e.stopPropagation();
                
                // Toggle Selection
                if (this.selectedTowerType === tower) {
                    this.selectedTowerType = null;
                    btn.classList.remove('active');
                } else {
                    // Deselect others
                    document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
                    // Select this one
                    this.selectedTowerType = tower;
                    btn.classList.add('active');
                    
                    // IMPORTANT: If we were inspecting a tower, switch back to build mode
                    this.deselectTower(); 
                }
            };
            gridContainer.appendChild(btn);
        });
        
        // --- REMOVED: The code that hid/showed the side panel ---
        // (We don't need the buildBtn.onclick logic anymore)
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
            // 1. Are we placing a new tower?
            if (this.selectedTowerType) {
                this.placeTower();
                return;
            }

            // 2. Did we click an EXISTING tower?
            const clickedTower = this.towers.find(t => {
                const dx = t.x - this.mouse.x;
                const dy = t.y - this.mouse.y;
                return Math.sqrt(dx*dx + dy*dy) < this.tileSize/2;
            });

            if (clickedTower) {
                this.selectTower(clickedTower);
            } else {
                this.deselectTower();
            }
        });

        this.setupInspectListeners();

        this.canvas.addEventListener('click', () => {
            if (this.selectedTowerType) this.placeTower();
        });
    }

    updateResourceDisplay() {
        const creditEl = document.getElementById('res-credits');
        const livesEl = document.getElementById('res-lives');
        
        if (creditEl) creditEl.innerText = this.credits;
        if (livesEl) livesEl.innerText = this.lives;
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

    // --- NEW HELPER FUNCTIONS ---

    handleBaseHit(enemyIndex) {
        // 1. Lose Life
        this.lives--;
        
        // 2. Update UI
        this.updateResourceDisplay();

        // 3. Visual Feedback (Screen Flash Red)
        document.body.style.boxShadow = "inset 0 0 50px rgba(255, 0, 0, 0.5)";
        setTimeout(() => {
            document.body.style.boxShadow = ""; 
        }, 100);

        // 4. Remove Enemy
        this.enemies.splice(enemyIndex, 1);

        // 5. Game Over Check
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.isRunning = false; // Stop game loop
        
        const screen = document.getElementById('end-screen');
        const card = document.querySelector('.end-card');
        const title = document.getElementById('end-title');
        const reason = document.getElementById('end-reason');
        const waves = document.getElementById('end-waves');

        // 1. Set Content
        title.innerText = "SYSTEM FAILURE";
        reason.innerText = "BASE DESTROYED";
        waves.innerText = `${this.waveIndex} / ${this.waves.length}`;
        
        // 2. Set Style (Red)
        card.className = 'end-card defeat';
        
        // 3. Show Screen
        screen.classList.remove('hidden');
    }

    selectTower(tower) {
        this.selectedTower = tower;
        
        // UI Swap: Hide Build, Show Inspect
        document.getElementById('build-menu').classList.add('hidden');
        document.getElementById('inspect-menu').classList.remove('hidden');
        
        // Open the side panel if it's closed
        document.querySelector('.side-panel').classList.add('open');

        this.updateInspectUI();
    }

    deselectTower() {
        this.selectedTower = null;
        
        // 1. Show Build Menu
        const buildMenu = document.getElementById('build-menu');
        const inspectMenu = document.getElementById('inspect-menu');
        
        if (buildMenu) buildMenu.classList.remove('hidden');
        if (inspectMenu) inspectMenu.classList.add('hidden');

        // 2. Clear any active visual selection on the map (optional)
    }

    updateInspectUI() {
        if (!this.selectedTower) return;
        const t = this.selectedTower;

        // 1. Name & Stats
        document.getElementById('inspect-name').innerText = `${t.type.name} (Lvl ${t.level})`;
        document.getElementById('inspect-stats').innerHTML = `
            <div class="stat-row"><span>DMG:</span> <span>${Math.floor(t.damage)}</span></div>
            <div class="stat-row"><span>RNG:</span> <span>${Math.floor(t.range)}</span></div>
            <div class="stat-row"><span>SPD:</span> <span>${(1000/t.cooldown).toFixed(1)}/s</span></div>
        `;

        // 2. Upgrade Button
        const upgBtn = document.getElementById('btn-upgrade');
        const costSpan = document.getElementById('upgrade-cost');
        
        if (t.level >= 5) {
            upgBtn.classList.add('locked');
            upgBtn.innerText = "MAX LEVEL";
        } else {
            upgBtn.classList.remove('locked');
            const cost = t.getUpgradeCost();
            upgBtn.innerHTML = `UPGRADE <span id="upgrade-cost">(${cost})</span>`;
            
            // Visual check if player can afford it
            if (this.credits < cost) upgBtn.style.opacity = '0.5';
            else upgBtn.style.opacity = '1';
        }

        // 3. Target Button
        document.getElementById('btn-target').innerText = `TARGET: ${t.targetMode}`;

        // 4. Sell Button
        document.getElementById('sell-value').innerText = t.getSellValue();
    }

    setupInspectListeners() {
        // Upgrade
        document.getElementById('btn-upgrade').onclick = () => {
            if (this.selectedTower && this.selectedTower.canUpgrade()) {
                const cost = this.selectedTower.getUpgradeCost();
                if (this.credits >= cost) {
                    this.credits -= cost;
                    this.selectedTower.upgrade();
                    this.updateResourceDisplay();
                    this.updateInspectUI();
                }
            }
        };

        // Sell
        document.getElementById('btn-sell').onclick = () => {
            if (this.selectedTower) {
                this.credits += this.selectedTower.getSellValue();
                
                // Remove from array
                const index = this.towers.indexOf(this.selectedTower);
                if (index > -1) this.towers.splice(index, 1);
                
                this.updateResourceDisplay();
                this.deselectTower();
            }
        };

        // Target Toggle
        document.getElementById('btn-target').onclick = () => {
            if (this.selectedTower) {
                this.selectedTower.cycleTargetMode();
                this.updateInspectUI();
            }
        };

        // Deselect / Back
        document.getElementById('btn-deselect').onclick = () => this.deselectTower();
    }
}