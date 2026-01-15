// js/core/Game.js

import { TOWER_TYPES } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { LEVEL_WAVES } from '../data/waves.js'; // Import the new object
import { Renderer } from './Renderer.js';
import { Tower } from '../entities/Tower.js';
import { Enemy } from '../entities/Enemy.js';
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

        // FIXED: Handle Resize to keep coordinate system accurate
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        });

        // Game State
        this.isRunning = true;
        this.credits = 600;
        this.lives = 20;

        // Wave System
        this.waveIndex = 0;
        this.isWaveActive = false;
        this.waveTimer = 0;
        this.enemiesRemainingToSpawn = 0;
        this.currentWaveConfig = null;
        this.spawnQueue = [];
        this.isPaused = false; // Pause Flag// New mixed wave queue

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
        document.getElementById('main-menu').classList.remove('active'); // HIDE MENU
        // document.getElementById('btn-toggle-build').classList.remove('hidden'); // REMOVED
        
        // Ensure build menu is visible and inspect menu is hidden
        const buildMenu = document.getElementById('build-menu');
        const inspectMenu = document.getElementById('inspect-menu');
        if (buildMenu) buildMenu.classList.remove('hidden');
        if (inspectMenu) inspectMenu.classList.add('hidden');
        
        // Ensure start wave button is visible and set correctly
        const startWaveBtn = document.getElementById('btn-start-wave');
        if (startWaveBtn) {
            startWaveBtn.classList.remove('hidden');
            startWaveBtn.innerText = 'INITIALIZE WAVE 1';
        }
        const skipWaveBtn = document.getElementById('btn-skip-wave');
        if (skipWaveBtn) {
            skipWaveBtn.classList.add('hidden');
        }
        
        this.updateResourceDisplay();

        this.loop();
    }

    // --- GAME CONTROL ---
    stop() {
        this.isRunning = false;
        this.hideUI();
    }

    hideUI() {
        document.getElementById('game-hud').classList.add('hidden');
        // document.getElementById('btn-toggle-build').classList.add('hidden'); // REMOVED
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('end-screen').classList.add('hidden');
        // document.querySelector('.side-panel').classList.remove('open'); // REMOVED
    }

    // --- GAME LOOP ---
    loop = () => {
        if (!this.isRunning) return;

        if (!this.isPaused) {
            this.update();
        }

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

            // 3. Skip Button Logic (Show if wave is almost done)
            const skipBtn = document.getElementById('btn-skip-wave');
            if (skipBtn) {
                if (this.spawnQueue.length === 0 && this.enemies.length < 5 && this.enemies.length > 0) {
                    skipBtn.classList.remove('hidden');
                } else {
                    skipBtn.classList.add('hidden');
                }
            }

            this.waveTimer++;
        }

        this.troops = this.troops.filter(troop => {
            troop.update();
            return !troop.markedForDeletion;
        });

        // --- 2. UPDATE ENTITIES ---
        this.towers.forEach(tower => tower.update());

        this.projectiles = this.projectiles.filter(proj => {
            proj.update();
            return !proj.markedForDeletion;
        });

        this.enemies = this.enemies.filter(enemy => {
            // Check Death
            if (enemy.hp <= 0) {
                this.credits += enemy.type.reward;
                this.handleEnemyDeathEffects(enemy);
                this.updateResourceDisplay();
                return false;
            }

            // Update Enemy Logic (returns false if it reached the base)
            const active = enemy.update();

            if (!active) {
                this.handleBaseHitWithoutSplice(enemy);
                return false;
            }
            return true;
        });
    }

    handleEnemyDeathEffects(enemy) {
        // Find towers that might have caused this or handle general area effects
        // For simplicity, if an enemy dies with high burn, it might spread?
        // Actually Level 4A logic says: "Burn spreads slightly after enemy death"
        // We'll check if any Tower Level 4A is nearby or if we mark the enemy as "volatile"
        if (enemy.effects.burn.stacks >= 5) {
            this.enemies.forEach(other => {
                if (other === enemy) return;
                const dist = Math.sqrt(Math.pow(other.x - enemy.x, 2) + Math.pow(other.y - enemy.y, 2));
                if (dist < 60) {
                    other.applyBurn(2);
                }
            });
        }
    }

    spawnEnemy() {
        // 1. Get the next enemy type from the queue
        if (this.spawnQueue.length === 0) return;
        const typeKey = this.spawnQueue.shift();

        // 2. Look it up in the ENEMIES object
        const typeConfig = ENEMIES[typeKey];

        // --- SAFETY CHECK ---
        if (!typeConfig) {
            console.error(`CRITICAL: Enemy type '${typeKey}' not defined in enemies.js!`);
            this.enemiesRemainingToSpawn--; // Skip it so the game doesn't freeze
            return;
        }
        // --------------------

        const enemy = new Enemy(
            this,
            typeConfig,
            this.path[0].x * this.tileSize + this.tileSize / 2,
            this.path[0].y * this.tileSize + this.tileSize / 2
        );

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

        // --- MIXED WAVE LOGIC ---
        // Copy the composition array to our queue
        this.spawnQueue = [...this.currentWaveConfig.composition];
        this.enemiesRemainingToSpawn = this.spawnQueue.length;

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
        
        // Hide wave buttons during wave
        const startBtn = document.getElementById('btn-start-wave');
        const skipBtn = document.getElementById('btn-skip-wave');
        if (startBtn) {
            startBtn.classList.add('hidden');
            // Update button text for next wave
            if (this.waveIndex < this.waves.length) {
                startBtn.innerText = `INITIALIZE WAVE ${this.waveIndex + 1}`;
            }
        }
        if (skipBtn) skipBtn.classList.add('hidden');
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
        // --- UPGRADE PATH A ---
        const btnUpgradeA = document.getElementById('btn-upgrade-a');
        if (btnUpgradeA) {
            btnUpgradeA.onclick = () => {
                if (this.selectedTower) {
                    this.selectedTower.upgrade('A');
                    this.updateInspectMenu(); // Refresh UI to show new stats/costs
                }
            };
        }

        // --- UPGRADE PATH B ---
        const btnUpgradeB = document.getElementById('btn-upgrade-b');
        if (btnUpgradeB) {
            btnUpgradeB.onclick = () => {
                if (this.selectedTower) {
                    this.selectedTower.upgrade('B');
                    this.updateInspectMenu();
                }
            };
        }

        // --- OTHER BUTTONS ---
        const btnSell = document.getElementById('btn-sell');
        if (btnSell) {
            btnSell.onclick = () => {
                if (this.selectedTower) {
                    this.sellTower(this.selectedTower);
                    this.deselectTower();
                }
            };
        }

        const btnTarget = document.getElementById('btn-target');
        if (btnTarget) {
            btnTarget.onclick = () => {
                if (this.selectedTower) {
                    const newMode = this.selectedTower.cycleTargetMode();
                    btnTarget.innerText = `TARGET: ${newMode}`;
                }
            };
        }

        // Close / Deselect Button
        const btnClose = document.getElementById('btn-close');
        // Note: Check if your HTML uses 'btn-close' or 'btn-deselect'
        if (btnClose) {
            btnClose.onclick = () => {
                this.deselectTower();
            };
        }

        // Generate tower slot buttons in build menu
        this.generateTowerSlots();

        // --- WAVE CONTROLS ---
        const btnStartWave = document.getElementById('btn-start-wave');
        if (btnStartWave) {
            btnStartWave.onclick = (e) => {
                e.stopPropagation();
                this.startNextWave();
            };
        }

        const btnSkipWave = document.getElementById('btn-skip-wave');
        if (btnSkipWave) {
            btnSkipWave.onclick = (e) => {
                e.stopPropagation();
                if (!this.isWaveActive) return;
                
                // Give bonus rewards for remaining enemies in spawn queue
                let bonusRewards = 0;
                if (this.spawnQueue && this.spawnQueue.length > 0) {
                    // Calculate rewards for skipped enemies
                    this.spawnQueue.forEach(enemyKey => {
                        const enemyType = ENEMIES[enemyKey];
                        if (enemyType) {
                            // Give half reward for skipped enemies as bonus
                            bonusRewards += Math.floor(enemyType.reward * 0.5);
                        }
                    });
                }
                
                // Give rewards for current enemies on screen
                this.enemies.forEach(enemy => {
                    if (enemy.type && enemy.type.reward) {
                        this.credits += enemy.type.reward;
                    }
                    // Force kill enemy immediately
                    enemy.hp = 0;
                });
                
                // Add bonus rewards
                if (bonusRewards > 0) {
                    this.credits += bonusRewards;
                    console.log(`Skip bonus: +${bonusRewards} credits`);
                }
                
                // Clear spawn queue and stop wave
                this.enemiesRemainingToSpawn = 0;
                this.spawnQueue = [];
                this.isWaveActive = false; // Stop the wave immediately
                
                // Force remove all enemies immediately (before next update cycle)
                this.enemies.length = 0;
                
                // Update resource display
                this.updateResourceDisplay();
                
                // Hide skip button
                btnSkipWave.classList.add('hidden');
                
                // Check if there are more waves and prepare next wave button
                if (this.waveIndex < this.waves.length) {
                    const startBtn = document.getElementById('btn-start-wave');
                    if (startBtn) {
                        startBtn.classList.remove('hidden');
                        startBtn.innerText = `INITIALIZE WAVE ${this.waveIndex + 1}`;
                    }
                }
            };
        }
    }

    generateTowerSlots() {
        const hotbarSlots = document.querySelector('.hotbar-slots');
        if (!hotbarSlots) {
            console.warn('Build menu slots container not found!');
            return;
        }

        // Clear existing slots
        hotbarSlots.innerHTML = '';

        // Generate a slot button for each tower type
        const towerKeys = Object.keys(TOWER_TYPES);
        towerKeys.forEach((key, index) => {
            const towerType = TOWER_TYPES[key];
            const slotBtn = document.createElement('div');
            slotBtn.className = 'slot-btn';
            slotBtn.setAttribute('data-tower-key', key);
            slotBtn.setAttribute('title', `${towerType.name} - $${towerType.cost}`);
            
            // Create slot key indicator
            const slotKey = document.createElement('span');
            slotKey.className = 'slot-key';
            slotKey.textContent = index + 1;
            
            // Create tower icon
            const slotIcon = document.createElement('div');
            slotIcon.className = 'slot-icon';
            slotIcon.style.background = towerType.color;
            
            // Create tower name (shortened)
            const towerName = document.createElement('span');
            towerName.textContent = towerType.name.split(' ')[0];
            towerName.style.fontSize = '0.55rem';
            towerName.style.marginTop = '2px';
            towerName.style.textAlign = 'center';
            towerName.style.lineHeight = '1';
            
            // Create cost indicator
            const towerCost = document.createElement('span');
            towerCost.textContent = `$${towerType.cost}`;
            towerCost.style.fontSize = '0.5rem';
            towerCost.style.color = '#ffd700';
            towerCost.style.marginTop = '2px';
            towerCost.style.lineHeight = '1';

            slotBtn.appendChild(slotKey);
            slotBtn.appendChild(slotIcon);
            slotBtn.appendChild(towerName);
            slotBtn.appendChild(towerCost);

            slotBtn.onclick = (e) => {
                e.stopPropagation();
                this.handleSlotClick(towerType, slotBtn);
            };

            hotbarSlots.appendChild(slotBtn);
        });

        // Ensure build menu is visible
        const buildMenu = document.getElementById('build-menu');
        if (buildMenu) {
            buildMenu.classList.remove('hidden');
        }
    }

    updateInspectMenu() {
        if (!this.selectedTower) return;
        const tower = this.selectedTower;

        // 1. Update Basic Stats
        document.getElementById('inspect-name').innerText = tower.type.name;
        document.getElementById('inspect-level').innerText = `LVL ${tower.level}`;
        document.getElementById('inspect-dmg').innerText = Math.floor(tower.damage);
        document.getElementById('inspect-range').innerText = Math.floor(tower.range);
        document.getElementById('inspect-speed').innerText = (tower.cooldown / 1000).toFixed(1) + 's';

        // 2. Update Sell Price
        document.getElementById('btn-sell').innerText = `SELL ($${tower.getSellValue()})`;

        // 3. Update Path A Button
        const btnA = document.getElementById('btn-upgrade-a');
        const costA = document.getElementById('cost-a');
        const nameA = document.getElementById('path-a-name');

        // Get Next Upgrade Info
        if (tower.canUpgrade('A')) {
            const nextCost = tower.getUpgradeCost('A');
            // Get name of next level from tower data
            const nextLvlIdx = tower.pathA; // 0 = Level 1 (Initial), so index 0 is Level 2 upgrade
            const nextLvlName = tower.type.paths.A.levels[nextLvlIdx]?.name || 'MAXED';

            costA.innerText = `($${nextCost})`;
            nameA.innerText = nextLvlName;
            btnA.classList.remove('locked', 'maxed');

            // Check Affordability
            if (this.credits < nextCost) {
                btnA.classList.add('locked'); // Too expensive
            }
        } else {
            // Maxed or Locked
            if (tower.pathLocked && tower.pathLocked !== 'A') {
                btnA.innerText = "LOCKED";
                nameA.innerText = "PATH CLOSED";
                btnA.classList.add('locked');
            } else {
                btnA.innerText = "MAX LEVEL";
                nameA.innerText = "COMPLETED";
                btnA.classList.add('maxed');
            }
            costA.innerText = "";
        }

        // 4. Update Path B Button (Same Logic)
        const btnB = document.getElementById('btn-upgrade-b');
        const costB = document.getElementById('cost-b');
        const nameB = document.getElementById('path-b-name');

        if (tower.canUpgrade('B')) {
            const nextCost = tower.getUpgradeCost('B');
            const nextLvlIdx = tower.pathB;
            const nextLvlName = tower.type.paths.B.levels[nextLvlIdx]?.name || 'MAXED';

            costB.innerText = `($${nextCost})`;
            nameB.innerText = nextLvlName;
            btnB.classList.remove('locked', 'maxed');

            if (this.credits < nextCost) btnB.classList.add('locked');
        } else {
            if (tower.pathLocked && tower.pathLocked !== 'B') {
                btnB.innerText = "LOCKED";
                nameB.innerText = "PATH CLOSED";
                btnB.classList.add('locked');
            } else {
                btnB.innerText = "MAX LEVEL";
                nameB.innerText = "COMPLETED";
                btnB.classList.add('maxed');
            }
            costB.innerText = "";
        }
    }

    handleSlotClick(tower, btnElement) {
        if (this.selectedTowerType === tower) {
            this.selectedTowerType = null;
            btnElement.classList.remove('active');
        } else {
            // Deselect others
            document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
            // Select this one
            this.selectedTowerType = tower;
            btnElement.classList.add('active');

            // If inspecting, exit inspect mode
            if (this.selectedTower) this.deselectTower();
        }
    }

    setupInputs() {
        this.canvas.addEventListener('mousemove', (e) => {
            // Robust scaling: Map screen pixels (client) -> Canvas Internal Pixels
            const rect = this.canvas.getBoundingClientRect();

            // This handles cases where canvas is scaled via CSS (e.g. max-width: 100%)
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            // e.clientX is relative to viewport, rect.left is canvas position
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;

            // FREE PLACEMENT: Center tower on mouse
            this.hoveredTile.x = this.mouse.x - this.tileSize / 2;
            this.hoveredTile.y = this.mouse.y - this.tileSize / 2;
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
                return Math.sqrt(dx * dx + dy * dy) < this.tileSize / 2;
            });

            if (clickedTower) {
                this.selectTower(clickedTower);
            } else {
                this.deselectTower();
            }
        });

        this.setupInspectListeners();
        this.setupPauseListeners();
    }

    updateResourceDisplay() {
        const creditEl = document.getElementById('res-credits');
        const livesEl = document.getElementById('res-lives');

        if (creditEl) creditEl.innerText = this.credits;
        if (livesEl) livesEl.innerText = this.lives;
    }

    checkPlacement(x, y) {
        // 1. Check Limits
        if (x < 0 || x > this.width || y < 0 || y > this.height) return false;

        // 2. Check overlap with EXISTING TOWERS
        // We use a simple radius check (tileSize/2)
        const towerOverlap = this.towers.some(t => {
            const dx = t.x - x;
            const dy = t.y - y;
            return Math.sqrt(dx * dx + dy * dy) < this.tileSize; // Overlap if closer than 1 tile
        });
        if (towerOverlap) return false;

        // 3. Check overlap with PATH
        // We need point-to-segment distance 
        const r = this.tileSize / 2; // Radius of tower

        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = { x: this.path[i].x * this.tileSize + r, y: this.path[i].y * this.tileSize + r };
            const p2 = { x: this.path[i + 1].x * this.tileSize + r, y: this.path[i + 1].y * this.tileSize + r };

            if (this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y) < r) {
                return false; // Too close to path
            }
        }

        return true;
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = (px - x1) * C + (py - y1) * D;
        const len_sq = C * C + D * D;
        let param = -1;

        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1; yy = y1;
        } else if (param > 1) {
            xx = x2; yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    placeTower() {
        if (this.credits < this.selectedTowerType.cost) return;

        const tx = this.hoveredTile.x + this.tileSize / 2;
        const ty = this.hoveredTile.y + this.tileSize / 2;

        // Validate Placement
        if (!this.checkPlacement(tx, ty)) {
            console.log("Invalid Placement!");
            // Optional: Play error sound
            return;
        }

        const newTower = new Tower(
            this,
            tx, ty,
            this.selectedTowerType
        );

        this.towers.push(newTower);
        this.credits -= this.selectedTowerType.cost;

        this.updateResourceDisplay(); // FIX: Removed 'this.ui.'

        // Manual Deselect Logic
        this.selectedTowerType = null;
        document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('active'));
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

    handleBaseHitWithoutSplice(enemy) {
        // 1. Lose Life
        this.lives--;

        // 2. Update UI
        this.updateResourceDisplay();

        // 3. Visual Feedback (Screen Flash Red)
        document.body.style.boxShadow = "inset 0 0 50px rgba(255, 0, 0, 0.5)";
        setTimeout(() => {
            document.body.style.boxShadow = "";
        }, 100);

        // 4. Game Over Check
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
        this.selectedTowerType = null; // Prioritize inspect over build
        document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('active'));

        // UI Swap: Hide Build, Show Inspect Side Panel
        const buildMenu = document.getElementById('build-menu');
        const inspectMenu = document.getElementById('inspect-menu');
        
        if (buildMenu) buildMenu.classList.add('hidden');
        if (inspectMenu) inspectMenu.classList.remove('hidden'); // Side panel slides in

        this.updateInspectUI();
    }

    deselectTower() {
        this.selectedTower = null;

        // 1. Show Build Menu, Hide Inspect Side Panel
        const buildMenu = document.getElementById('build-menu');
        const inspectMenu = document.getElementById('inspect-menu');

        // Swap back
        if (buildMenu) buildMenu.classList.remove('hidden');
        if (inspectMenu) inspectMenu.classList.add('hidden'); // Side panel slides out
    }

    updateInspectUI() {
        if (!this.selectedTower) return;
        const t = this.selectedTower;

        // 1. Name & Stats
        document.getElementById('inspect-name').innerText = `${t.type.name} (Lvl ${t.level})`;

        // Use the simplified Horizontal stats for the bar
        document.getElementById('inspect-stats').innerHTML = `
            <span class="stat-group">DMG <span class="stat-val">${Math.floor(t.damage)}</span></span>
            <span class="stat-group">RNG <span class="stat-val">${Math.floor(t.range)}</span></span>
            <span class="stat-group">SPD <span class="stat-val">${(1000 / t.cooldown).toFixed(1)}/s</span></span>
        `;

        // 2. Upgrade Button Logic
        const upgBtn = document.getElementById('btn-upgrade');
        const dualContainer = document.getElementById('dual-upgrade-container');
        const btnA = document.getElementById('btn-upgrade-a');
        const btnB = document.getElementById('btn-upgrade-b');

        if (t.type.id === 'laser') {
            // --- LASER BRANCHING LOGIC ---
            upgBtn.classList.add('hidden'); // Hide standard
            dualContainer.classList.remove('hidden'); // Show dual
            dualContainer.style.display = 'flex';

            // Path A
            if (t.pathA >= 4 || (t.pathLocked && t.pathLocked !== 'A')) {
                btnA.disabled = true;
                btnA.innerHTML = t.pathLocked !== 'A' ? "LOCKED" : "MAX";
                btnA.classList.add('locked');
            } else {
                btnA.disabled = false;
                btnA.classList.remove('locked');
                const costA = t.getUpgradeCost('A');
                // Get name of next upgrade
                const nextNameA = t.type.paths.A.levels[t.pathA].name;
                btnA.innerHTML = `${nextNameA}<br><span style="color:var(--neon-blue)">${costA}</span>`;
                btnA.style.opacity = this.credits >= costA ? '1' : '0.5';
            }

            // Path B
            if (t.pathB >= 4 || (t.pathLocked && t.pathLocked !== 'B')) {
                btnB.disabled = true;
                btnB.innerHTML = t.pathLocked !== 'B' ? "LOCKED" : "MAX";
                btnB.classList.add('locked');
            } else {
                btnB.disabled = false;
                btnB.classList.remove('locked');
                const costB = t.getUpgradeCost('B');
                const nextNameB = t.type.paths.B.levels[t.pathB].name;
                btnB.innerHTML = `${nextNameB}<br><span style="color:var(--neon-blue)">${costB}</span>`;
                btnB.style.opacity = this.credits >= costB ? '1' : '0.5';
            }

        } else {
            // --- STANDARD LOGIC ---
            upgBtn.classList.remove('hidden');
            dualContainer.classList.add('hidden');
            dualContainer.style.display = 'none';

            if (t.level >= 5) {
                upgBtn.classList.add('locked');
                upgBtn.innerHTML = "MAX LEVEL";
                upgBtn.disabled = true;
            } else {
                upgBtn.classList.remove('locked');
                upgBtn.disabled = false;
                const cost = t.getUpgradeCost();
                upgBtn.innerHTML = `UPGRADE <span id="upgrade-cost">(${cost})</span>`;

                if (this.credits < cost) upgBtn.style.opacity = '0.5';
                else upgBtn.style.opacity = '1';
            }
        }

        // 3. Target Button
        document.getElementById('btn-target').innerText = `TARGET: ${t.targetMode}`;
    }

    setupInspectListeners() {
        console.log("Setting up Inspect Menu Listeners...");

        // --- UPGRADE PATH A ---
        const btnUpgradeA = document.getElementById('btn-upgrade-a');
        if (btnUpgradeA) {
            btnUpgradeA.onclick = () => {
                if (this.selectedTower) {
                    this.selectedTower.upgrade('A');
                    this.updateInspectMenu();
                }
            };
        } else {
            console.warn("UI Missing: btn-upgrade-a");
        }

        // --- UPGRADE PATH B ---
        const btnUpgradeB = document.getElementById('btn-upgrade-b');
        if (btnUpgradeB) {
            btnUpgradeB.onclick = () => {
                if (this.selectedTower) {
                    this.selectedTower.upgrade('B');
                    this.updateInspectMenu();
                }
            };
        } else {
            console.warn("UI Missing: btn-upgrade-b");
        }

        // --- SELL BUTTON ---
        const btnSell = document.getElementById('btn-sell');
        if (btnSell) {
            btnSell.onclick = () => {
                if (this.selectedTower) {
                    this.sellTower(this.selectedTower);
                    this.deselectTower();
                }
            };
        }

        // --- TARGET BUTTON ---
        const btnTarget = document.getElementById('btn-target');
        if (btnTarget) {
            btnTarget.onclick = () => {
                if (this.selectedTower) {
                    const newMode = this.selectedTower.cycleTargetMode();
                    btnTarget.innerText = `TARGET: ${newMode}`;
                }
            };
        }

        // --- CLOSE BUTTON ---
        const btnClose = document.getElementById('btn-deselect') || document.getElementById('btn-close');
        if (btnClose) {
            btnClose.onclick = () => {
                this.deselectTower();
            };
        }
    }

    setupPauseListeners() {
        // 1. ESC Key Listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // If we have a tower selected, deselect it first
                if (this.selectedTower || this.selectedTowerType) {
                    // Let the other listeners handle deselect
                    return;
                }
                this.togglePause();
            }
        });

        // 2. Resume Button
        document.getElementById('btn-resume').onclick = () => {
            this.togglePause();
        };

        // 3. Exit Button
        document.getElementById('btn-exit').onclick = () => {
            this.exitToMenu();
        };
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const menu = document.getElementById('pause-menu');
        const container = document.getElementById('game-container');

        if (this.isPaused) {
            menu.classList.remove('hidden');
            if (container) container.classList.add('paused');
            if (window.audioManager) window.audioManager.playTrack('pause');
            this.startTrollMessages();
        } else {
            menu.classList.add('hidden');
            if (container) container.classList.remove('paused');
            if (window.audioManager) window.audioManager.playTrack('game');
            this.stopTrollMessages();
        }
    }

    startTrollMessages() {
        const messages = [
            ">> ALIENS ARE DEFINITELY NOT MOVING <<",
            ">> IMAGINE PAUSING... LOL <<",
            ">> PAUSING WON'T SAVE YOU <<",
            ">> SYSTEM OVERHEATING... JUST KIDDING <<",
            ">> YOUR BASE LOOKS VULNERABLE <<",
            ">> I PROMISE I'M NOT MINING BITCOIN <<"
        ];

        const el = document.getElementById('pause-troll-msg');
        if (!el) return;

        let idx = 0;
        // Function to set message with glitch effect
        const setMsg = () => {
            el.innerText = messages[idx];
            el.style.opacity = '1';

            // Trigger simple reflow animation if needed, or rely on CSS flicker
            idx = Math.floor(Math.random() * messages.length);
        };

        setMsg(); // Initial set

        this.trollInterval = setInterval(() => {
            el.style.opacity = '0'; // Blink out
            setTimeout(() => {
                setMsg();
            }, 200);
        }, 3000);
    }

    stopTrollMessages() {
        if (this.trollInterval) {
            clearInterval(this.trollInterval);
            this.trollInterval = null;
        }
    }

    exitToMenu() {
        this.stop(); // Stops game and hides UI
        this.stopTrollMessages(); // Ensure interval is cleared

        // Reset Audio to Game/Menu Theme
        if (window.audioManager) window.audioManager.playTrack('game');

        // 1. Force hide boot screen to prevent ghosting glitch
        const bootScreen = document.getElementById('boot-screen');
        if (bootScreen) bootScreen.style.display = 'none';

        // 2. Show Main Menu Logic (Reverse Navigation)
        const mainMenu = document.getElementById('main-menu');
        const transitionLayer = document.getElementById('transition-layer');
        const transitionText = transitionLayer.querySelector('.transition-text');
        const transitionSub = transitionLayer.querySelector('.transition-subtext');

        // Apply Retreat Style
        transitionLayer.classList.add('retreat');
        if (transitionText) {
            transitionText.innerText = "SECTOR WITHDRAWAL";
            transitionText.setAttribute('data-text', "SECTOR WITHDRAWAL");
        }
        if (transitionSub) transitionSub.innerText = "CONNECTION TERMINATED...";

        transitionLayer.classList.add('active');

        setTimeout(() => {
            if (mainMenu) mainMenu.classList.add('active'); // SHOW MENU

            // 3. FULL DATA RESET
            this.enemies = []; this.towers = []; this.projectiles = [];
            this.credits = 600; this.lives = 20; this.waveIndex = 0;
            this.spawnQueue = []; this.isWaveActive = false;

            if (window.menuBackground) window.menuBackground.start();

            setTimeout(() => {
                transitionLayer.classList.remove('active');
                transitionLayer.classList.remove('retreat');
                if (transitionText) {
                    transitionText.innerText = "INITIALIZING SECTOR LINK...";
                    transitionText.setAttribute('data-text', "INITIALIZING SECTOR LINK...");
                }
                if (transitionSub) transitionSub.innerText = "ENCRYPTING UPLINK...";
            }, 800);
        }, 1400);
    }
}
