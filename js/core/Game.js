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
                this.exitToMenu();
            };
        }
        // Wire up Wave Buttons
        if (startBtn) startBtn.onclick = () => this.startNextWave();
        if (skipBtn) skipBtn.onclick = () => this.startNextWave();

        // --- NEW: BOTTOM HOTBAR GENERATION ---
        const slotsContainer = document.querySelector('.hotbar-slots');
        slotsContainer.innerHTML = '';

        const hotkeys = ['1', '2', '3', '4', '5'];
        let idx = 0;

        Object.values(TOWER_TYPES).forEach(tower => {
            if (idx >= 5) return; // Limit to 5 for now

            const slot = document.createElement('div');
            slot.className = 'slot-btn';

            // Add Hotkey Indicator
            const key = hotkeys[idx];

            slot.innerHTML = `
                <span class="slot-key">${key}</span>
                <div class="slot-icon" style="background:${tower.color}"></div>
                <div class="slot-cost">${tower.cost}</div>
            `;

            slot.onclick = (e) => {
                e.stopPropagation();
                this.handleSlotClick(tower, slot);
            };

            // Bind Keyboard Shortcut
            window.addEventListener('keydown', (e) => {
                if (e.key === key && !this.selectedTower) { // Only if not inspecting
                    this.handleSlotClick(tower, slot);
                }
            });

            slotsContainer.appendChild(slot);
            idx++;
        });
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

        // UI Swap: Hide Build, Show Inspect
        document.getElementById('build-menu').classList.add('hidden');
        document.getElementById('inspect-menu').classList.remove('hidden');

        this.updateInspectUI();
    }

    deselectTower() {
        this.selectedTower = null;

        // 1. Show Build Menu
        const buildMenu = document.getElementById('build-menu');
        const inspectMenu = document.getElementById('inspect-menu');

        // Swap back
        if (buildMenu) buildMenu.classList.remove('hidden');
        if (inspectMenu) inspectMenu.classList.add('hidden');
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
        // Upgrade (Standard)
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

        // Upgrade Path A (Laser)
        document.getElementById('btn-upgrade-a').onclick = () => {
            if (this.selectedTower && this.selectedTower.canUpgrade('A')) {
                const cost = this.selectedTower.getUpgradeCost('A');
                if (this.credits >= cost) {
                    this.credits -= cost;
                    this.selectedTower.upgrade('A');
                    this.updateResourceDisplay();
                    this.updateInspectUI();
                }
            }
        };

        // Upgrade Path B (Laser)
        document.getElementById('btn-upgrade-b').onclick = () => {
            if (this.selectedTower && this.selectedTower.canUpgrade('B')) {
                const cost = this.selectedTower.getUpgradeCost('B');
                if (this.credits >= cost) {
                    this.credits -= cost;
                    this.selectedTower.upgrade('B');
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
