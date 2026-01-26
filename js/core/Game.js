// js/core/Game.js

import { TOWER_TYPES } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { LEVEL_WAVES } from '../data/waves.js'; // Import the new object
import { Renderer } from './Renderer.js';
import { Tower } from '../entities/Tower.js';
import { Enemy } from '../entities/Enemy.js';
import { levels } from '../data/levels.js';
import * as Loop from './Loop.js';
import { RoomService } from '../modules/RoomService.js';

export class Game {
    constructor(canvasId, levelId) {
        console.log(`[Game] Initializing... Canvas: ${canvasId}, Level: ${levelId}`);
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
        this.lives = 100; // Changed from 20 to 100 for percentage-based HP
        this.maxLives = 100;

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
        this.hoveredEnemy = null;

        this.path = [];
        this.setupPath();

        // Multiplayer State
        this.room = RoomService.getCurrentRoom();
        this.setupMultiplayer();

        // DYNAMIC TILE SIZE: Calculate based on path dimensions to fit screen
        this.calculateDynamicTileSize();

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
        if (this.nextWaveTimerId) {
            clearTimeout(this.nextWaveTimerId);
            this.nextWaveTimerId = null;
        }
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
        Loop.updateWaveLogic(this);
        Loop.updateEntities(this);
    }

    handleEnemyDeathEffects(enemy) {
        Loop.handleEnemyDeathEffects(this, enemy);
    }

    spawnEnemy() {
        Loop.spawnEnemy(this);
    }

    handleVictory() {
        Loop.handleVictory(this);
    }

    // js/core/Game.js

    startNextWave() {
        const nextIdx = this.waveIndex;
        if (nextIdx >= this.waves.length) {
            console.log("[Game] VICTORY! ALL WAVES CLEARED.");
            return;
        }

        console.log(`[Game] Starting wave ${nextIdx + 1}`);
        this.currentWaveConfig = this.waves[this.waveIndex];

        // --- MIXED WAVE LOGIC ---
        // Prepend the new wave's composition to the current queue so they start spawning immediately
        const nextEnemies = [...this.currentWaveConfig.composition];
        this.spawnQueue.unshift(...nextEnemies);

        this.spawnTimer = 0;
        this.isWaveActive = true;
        this.waveTimer = 0;
        this.skipUsedThisWave = false; // Reset skip button flag for new wave

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
        if (skipBtn) skipBtn.classList.add('hidden'); // Hide skip button at wave start
    }

    setupMultiplayer() {
        if (!this.room) return;
        console.log('[Game] Multiplayer room detected:', this.room.id);

        // Hook into RoomService Broadcast channel
        if (RoomService.currentChannel) {
            RoomService.currentChannel.on('broadcast', { event: 'game_event' }, (payload) => {
                const data = payload.payload;
                console.log('[Game] Received Broadcast Event:', data);

                if (data.type === 'tower_placed' && data.senderId !== PlayerService.getCurrentProfile().id) {
                    const towerType = TOWER_TYPES[data.towerData.typeKey];
                    const remoteTower = new Tower(this, data.towerData.x, data.towerData.y, towerType);
                    this.towers.push(remoteTower);
                }

                if (data.type === 'wave_started') {
                    if (!this.isWaveActive || this.waveIndex <= data.waveIndex) {
                        if (this.waveIndex < data.waveIndex) this.waveIndex = data.waveIndex - 1;
                        this.startNextWave();
                    }
                }
            });
        }
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

    calculateDynamicTileSize() {
        if (this.path.length === 0) {
            this.tileSize = 60; // Default fallback
            return;
        }

        // Find the bounds of the path
        let maxX = 0;
        let maxY = 0;
        this.path.forEach(point => {
            if (point.x > maxX) maxX = point.x;
            if (point.y > maxY) maxY = point.y;
        });

        // Add padding for the base (1.5 tiles) and some margin
        maxX += 2; // Extra space for base
        maxY += 2;

        // Calculate tile size to fit screen (with some margin for UI)
        const availableWidth = this.width - 100; // Margin for UI
        const availableHeight = this.height - 300; // Margin for HUD and controls

        const tileSizeByWidth = Math.floor(availableWidth / maxX);
        const tileSizeByHeight = Math.floor(availableHeight / maxY);

        // Use the smaller of the two to ensure both dimensions fit
        this.tileSize = Math.min(tileSizeByWidth, tileSizeByHeight, 80); // Max 80px for visibility
        this.tileSize = Math.max(this.tileSize, 30); // Min 30px so towers are still visible

        console.log(`Dynamic tile size: ${this.tileSize}px (Map: ${maxX}x${maxY} tiles, Screen: ${this.width}x${this.height}px)`);
    }

    setupUI() {
        // --- LISTENERS REMOVED ---
        // Duplicate/Insecure upgrade listeners were located here.
        // All upgrade logic is now centralized in setupInspectListeners() and handleUpgrade().

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

                // --- MULTIPLAYER BROADCAST ---
                if (this.room) {
                    RoomService.broadcastEvent('wave_started', {
                        waveIndex: this.waveIndex
                    });
                }
            };
        }

        const btnSkipWave = document.getElementById('btn-skip-wave');
        if (btnSkipWave) {
            btnSkipWave.onclick = (e) => {
                e.stopPropagation();
                console.log("[SKIP BUTTON] Clicked! Starting next wave immediately.");

                // standard TD behavior: button just triggers the next wave logic immediately
                this.startNextWave();

                // Hide button after use to prevent accidental double-clicks, 
                // the update loop will show it again when conditions are met for the newly started wave
                btnSkipWave.classList.add('hidden');
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
            towerType.key = key; // Ensure key is available on the type object
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

            // ENEMY HOVER CHECK
            this.hoveredEnemy = null;
            // Check in reverse to prioritize enemies drawn on top (if overlapping)
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const dx = enemy.x - this.mouse.x;
                const dy = enemy.y - this.mouse.y;
                // Enemy radius is ~10-15px, let's use 20px for easy hovering
                if (Math.sqrt(dx * dx + dy * dy) < 20) {
                    this.hoveredEnemy = enemy;
                    break;
                }
            }
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
        const hpBar = document.getElementById('hp-bar');
        const hpText = document.getElementById('hp-bar-text');

        if (creditEl) creditEl.innerText = this.credits;

        // Update HP Bar
        if (hpBar && hpText) {
            const percentage = (this.lives / this.maxLives) * 100;
            hpBar.style.width = `${percentage}%`;
            hpText.innerText = `${this.lives}/${this.maxLives}`;

            // Update color class based on HP percentage
            hpBar.className = 'hp-bar-fill';
            if (percentage > 60) {
                hpBar.classList.add('hp-high');
            } else if (percentage > 30) {
                hpBar.classList.add('hp-medium');
            } else {
                hpBar.classList.add('hp-low');
            }
        }
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
        if (!this.selectedTowerType) return; // Added from instruction, assuming it's a new guard

        const tx = this.hoveredTile.x + this.tileSize / 2;
        const ty = this.hoveredTile.y + this.tileSize / 2;

        // Check placement validity
        if (!this.checkPlacement(tx, ty)) { // Using existing checkPlacement
            // console.warn("Invalid placement");
            console.log("Invalid Placement!"); // Kept original log
            return;
        }

        const cost = Number(this.selectedTowerType.cost);
        if (this.credits < cost) {
            console.warn("Insufficient funds for placement");
            // Flash red
            const t = document.getElementById('res-credits');
            if (t) {
                t.style.color = 'red';
                setTimeout(() => t.style.color = '', 500);
            }
            return;
        }

        const newTower = new Tower(
            this,
            tx, ty,
            this.selectedTowerType
        );

        this.towers.push(newTower);
        // Deduct credits
        this.credits -= cost;
        this.updateResourceDisplay(); // FIX: Removed 'this.ui.'

        // --- MULTIPLAYER BROADCAST ---
        if (this.room) {
            RoomService.broadcastEvent('tower_placed', {
                senderId: PlayerService.getCurrentProfile().id,
                towerData: {
                    x: tx,
                    y: ty,
                    typeKey: this.selectedTowerType.id.toUpperCase()
                }
            });
        }

        // Manual Deselect Logic
        this.selectedTowerType = null;
        document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('active'));
    }

    // --- NEW HELPER FUNCTIONS ---

    handleBaseHit(enemyIndex) {
        Loop.handleBaseHit(this, enemyIndex);
    }

    handleBaseHitWithoutSplice(enemy) {
        Loop.handleBaseHit(this, enemy);
    }

    victory() {
        this.isRunning = false;

        const screen = document.getElementById('end-screen');
        const card = document.querySelector('.end-card');
        const title = document.getElementById('end-title');
        const reason = document.getElementById('end-reason');
        const waves = document.getElementById('end-waves');

        title.innerText = "SECTOR SECURED";
        reason.innerText = "MISSION ACCOMPLISHED";
        waves.innerText = `${this.waveIndex} / ${this.waves.length}`;

        // Set Style (Green)
        card.className = 'end-card victory';
        screen.classList.remove('hidden');
    }

    exitToMenu() {
        this.stop(); // Stops loop and hides HUD/Pause via hideUI()

        // Ensure End Screen is gone
        document.getElementById('end-screen').classList.add('hidden');

        // Show Main Menu
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.classList.add('active');

        // Restart Menu Background if needed
        if (window.menuBackground && typeof window.menuBackground.start === 'function') {
            window.menuBackground.start();
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

    handleUpgrade(path) {
        if (!this.selectedTower) return;
        const tower = this.selectedTower;

        if (!tower.canUpgrade(path)) {
            console.warn("Upgrade refused: Max level or locked path.");
            return;
        }

        const rawCost = tower.getUpgradeCost(path);
        const cost = Number(rawCost);

        console.log(`[Game] Attempting Upgrade: Tower=${tower.id}, Path=${path}, Cost=${cost}, Credits=${this.credits}`);

        if (isNaN(cost) || cost <= 0) {
            console.error(`[Game] Upgrade Error: Invalid cost calculated (${rawCost}).`);
            return;
        }

        if (this.credits < cost) {
            console.warn(`[Game] Upgrade Refused: Credits (${this.credits}) < Cost (${cost})`);
            // Optional: Play error sound or flash credits red
            const creditsEl = document.getElementById('res-credits');
            if (creditsEl) {
                creditsEl.style.color = 'red';
                setTimeout(() => creditsEl.style.color = '', 500);
            }
            return;
        }

        console.log(`Processing upgrade for Tower ${tower.id}: Path ${path}, Cost ${cost}`);

        // Transaction
        this.credits -= cost;
        this.updateResourceDisplay(); // Sync Top Bar

        // Execute Upgrade
        tower.upgrade(path);

        // Refresh Inspector
        this.updateInspectMenu();
    }

    sellTower(tower) {
        if (!tower) return;

        // 1. Calculate Refund (50% of base + upgrades)
        // Simple formula: base cost + logic for upgrades if tracked
        // For now, let's refund 50% of base cost + some heuristic for upgrades
        // Or if we want to be precise, we need to track total investment.
        // Let's go simple: 50% of current value

        // Approximate total value
        let totalValue = tower.type.cost;
        // Add upgrade values if needed, but for now base is fine or strict
        // Better:
        const refund = Math.floor(tower.type.cost * 0.5);

        // 2. Add Credits
        this.credits += refund;
        this.updateResourceDisplay();

        // 3. Remove from Array
        const index = this.towers.indexOf(tower);
        if (index > -1) {
            this.towers.splice(index, 1);
        }

        console.log(`Sold tower for ${refund} credits.`);

        // 4. UI Feedback (Floating Text?) - Optional
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

        this.updateInspectMenu();
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

    updateInspectMenu() {
        if (!this.selectedTower) return;
        const t = this.selectedTower;

        // 1. Name & Stats
        document.getElementById('inspect-name').innerText = `${t.type.name} (Lvl ${t.level})`;
        document.getElementById('inspect-level').innerText = `LVL ${t.level}`;

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

        if (t.type.paths) {
            // --- LASER BRANCHING LOGIC ---
            upgBtn.classList.add('hidden'); // Hide standard
            dualContainer.classList.remove('hidden'); // Show dual
            dualContainer.style.display = 'flex';

            // Path A
            if (t.pathA >= 4) {
                btnA.disabled = true;
                btnA.innerHTML = "MAX";
                btnA.classList.add('locked');
            } else if (!t.canUpgrade('A')) {
                btnA.disabled = true;
                btnA.innerHTML = "LOCKED";
                btnA.classList.add('locked');
            } else {
                btnA.disabled = false;
                btnA.classList.remove('locked');
                const costA = t.getUpgradeCost('A');
                const nextNameA = t.type.paths.A.levels[t.pathA]?.name || "Upgrade";
                btnA.innerHTML = `${nextNameA}<br><span style="color:var(--neon-blue)">${costA}</span>`;
                btnA.style.opacity = this.credits >= costA ? '1' : '0.5';
            }

            // Path B
            if (t.pathB >= 4) {
                btnB.disabled = true;
                btnB.innerHTML = "MAX";
                btnB.classList.add('locked');
            } else if (!t.canUpgrade('B')) {
                btnB.disabled = true;
                btnB.innerHTML = "LOCKED";
                btnB.classList.add('locked');
            } else {
                btnB.disabled = false;
                btnB.classList.remove('locked');
                const costB = t.getUpgradeCost('B');
                const nextNameB = t.type.paths.B.levels[t.pathB]?.name || "Upgrade";
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

        // --- STANDARD UPGRADE ---
        const btnUpgrade = document.getElementById('btn-upgrade');
        if (btnUpgrade) {
            btnUpgrade.onclick = (e) => {
                if (e) e.stopPropagation();
                this.handleUpgrade(); // No path for standard
            };
        }

        // --- UPGRADE PATH A ---
        const btnUpgradeA = document.getElementById('btn-upgrade-a');
        if (btnUpgradeA) {
            btnUpgradeA.onclick = (e) => {
                if (e) e.stopPropagation();
                this.handleUpgrade('A');
            };
        } else {
            console.warn("UI Missing: btn-upgrade-a");
        }

        // --- UPGRADE PATH B ---
        const btnUpgradeB = document.getElementById('btn-upgrade-b');
        if (btnUpgradeB) {
            btnUpgradeB.onclick = (e) => {
                if (e) e.stopPropagation();
                this.handleUpgrade('B');
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
