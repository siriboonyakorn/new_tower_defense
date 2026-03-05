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
import { ProgressionManager } from '../modules/ProgressionManager.js';
import { PlayerService } from '../modules/PlayerService.js';
import { HistoryManager } from '../managers/HistoryManager.js';
import { ChallengeManager } from '../managers/ChallengeManager.js';
import { EventManager } from '../managers/EventManager.js';
import { AdaptationManager } from '../managers/AdaptationManager.js';
import { DailyModifier } from '../managers/DailyModifier.js';
import { MapModifier } from '../managers/MapModifier.js';
import { notifier } from '../managers/NotificationManager.js';
import { SecurityManager } from '../managers/SecurityManager.js';
import { TaskManager } from '../managers/TaskManager.js';

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
        this.isPaused = false;
        this.matchRecorded = false; // Prevents duplicate saves
        this.notifier = notifier;
        window.notifier = notifier; // For global access

        // Entities
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.troops = [];

        // Input
        this.mouse = { x: 0, y: 0 };
        // Initialize hoveredTile to screen center to prevent corner placement before mouse moves
        this.hoveredTile = { x: this.width / 2, y: this.height / 2 };
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.hoveredEnemy = null;

        // UI Elements for Tab Overlay
        this.tabOverlay = document.getElementById('tab-overlay');
        this.tabDamageEl = document.getElementById('tab-damage');
        this.tabKillsEl = document.getElementById('tab-kills');
        this.tabHpEl = document.getElementById('tab-hp');
        this.tabMissionEl = document.getElementById('tab-mission-name');

        this.path = [];
        this.setupPath();

        // Multiplayer State
        this.room = RoomService.getCurrentRoom();
        this.isMultiplayerHost = !this.room || this.room.host_profile_id === PlayerService.getCurrentProfile()?.id;
        this.setupMultiplayer();

        // Stats Tracking
        this.startTime = Date.now();
        this.sessionDamage = 0;
        this.sessionKills = 0;

        // Co-op partner stats { profileId: { username, damage, kills } }
        this.partnerStats = {};

        // Initialize Challenge Tracking
        ChallengeManager.init();

        // Initialize Event System
        EventManager.init();

        // Initialize Adaptation System
        AdaptationManager.init();

        // Initialize Daily Modifier
        DailyModifier.init();
        DailyModifier.applyToGame(this);

        // DYNAMIC TILE SIZE: Calculate based on path dimensions to fit screen
        this.calculateDynamicTileSize();

        // Initialize Dynamic Map Zones
        MapModifier.init(this);

        // Time Rewind / Checkpoint System
        this.lastWaveState = null;

        this.setupInputs();
        this.setupUI();

        // Renderer
        this.renderer = new Renderer(this);

        // Show UI
        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('main-menu').classList.remove('active'); // HIDE MENU

        // HIDE PLAYER STATS WIDGET DURING GAMEPLAY
        const statsWidget = document.getElementById('player-stats-widget');
        if (statsWidget) statsWidget.classList.add('player-stats-hidden');

        // Aiming Mode for Manual Towers
        this.isAiming = false;

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

        // Initialize Security
        SecurityManager.init(this);

        this.loop();
    }

    // --- GAME CONTROL ---
    stop() {
        this.isRunning = false;
        if (this.nextWaveTimerId) {
            clearTimeout(this.nextWaveTimerId);
            this.nextWaveTimerId = null;
        }
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
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

        // Security Tick Validation
        if (!SecurityManager.validateTick()) return;

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
        this.sessionKills++;
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
        // Reset security buffers to prevent false positives from wave load spikes
        SecurityManager.reset();

        const nextIdx = this.waveIndex;
        if (nextIdx >= this.waves.length) {
            console.log("[Game] VICTORY! ALL WAVES CLEARED.");
            return;
        }

        console.log(`[Game] Starting wave ${nextIdx + 1}`);

        // SAVE CHECKPOINT ONLY IF NOT RETRYING
        if (!this.lastWaveState || this.lastWaveState.waveIndex !== this.waveIndex) {
            this.saveCheckpoint();
        }

        this.currentWaveConfig = this.waves[this.waveIndex];

        // --- MIXED WAVE LOGIC & ADAPTATION ---
        // Prepend the new wave's composition to the current queue so they start spawning immediately
        let nextEnemies = [...this.currentWaveConfig.composition];

        // APPLY ADAPTATION
        nextEnemies = AdaptationManager.adaptSpawnQueue(nextEnemies, this.waveIndex);

        // APPLY DAILY MODIFIER (COUNT MULTIPLIER)
        const dailyMods = DailyModifier.getEnemyModifiers();
        if (dailyMods.count > 1.0) {
            const extraCount = Math.floor(nextEnemies.length * (dailyMods.count - 1.0));
            for (let i = 0; i < extraCount; i++) {
                const randIdx = Math.floor(Math.random() * nextEnemies.length);
                nextEnemies.push(nextEnemies[randIdx]);
            }
            // Shuffle to mix the new enemies in
            nextEnemies.sort(() => Math.random() - 0.5);
            console.log(`[DailyModifier] Swarm active: Added ${extraCount} extra enemies.`);
        }

        this.spawnQueue.unshift(...nextEnemies);

        this.spawnTimer = 0;
        this.isWaveActive = true;
        this.waveTimer = 0;
        this.skipUsedThisWave = false; // Reset skip button flag for new wave

        // --- NEW: ECONOMY CALCULATION ---
        let waveReward = Math.floor((this.currentWaveConfig.reward) * this.getCreditMultiplier());
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
        this.broadcastCredits();
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
        console.log('[Game] Multiplayer active. Listening for sector signals...');
        this.statsInterval = null; // Will be set after event listener

        window.addEventListener('game-event-received', (e) => {
            const data = e.detail;
            const profile = PlayerService.getCurrentProfile();
            if (data.senderId === profile?.id) return; // Skip own events

            console.log('[Game] Syncing remote event:', data.type);

            switch (data.type) {
                case 'tower_placed':
                    this.syncRemotePlacement(data.towerData);
                    break;
                case 'wave_started':
                    this.syncRemoteWave(data.waveIndex);
                    break;
                case 'tower_upgraded':
                    this.syncRemoteUpgrade(data.upgradeData);
                    break;
                case 'tower_sold':
                    this.syncRemoteSell(data.sellData);
                    break;
                case 'pause_state':
                    this.applyRemotePause(data.paused);
                    break;
                case 'game_event_triggered':
                    this.applyRemoteEvent(data.eventId);
                    break;
                case 'credits_sync':
                    this.credits = data.credits;
                    this.updateResourceDisplay();
                    break;
                case 'stats_update':
                    this.partnerStats[data.senderId] = data.stats;
                    // Refresh tab overlay if currently open
                    if (this.tabOverlay && !this.tabOverlay.classList.contains('hidden')) {
                        this.updateTabStats();
                    }
                    break;
                case 'final_stats': {
                    const minuteKey = new Date(data.stats.playedAt).toISOString().slice(0, 16);
                    localStorage.setItem(`coop_partner_${minuteKey}`, JSON.stringify(data.stats));
                    break;
                }
            }
        });

        // Broadcast own stats to partner every 15 s so the TAB overlay stays fresh
        this.statsInterval = setInterval(() => this.broadcastStats(), 15000);
    }

    // ─── CO-OP SCALING HELPERS ──────────────────────────────────────────────

    /** Returns the number of players in the current session (min 1). */
    getPlayerCount() {
        return (this.room?.members?.length) || 1;
    }

    /**
     * Credits earned per event are divided among players so the pool doesn't
     * inflate with more people.  Formula gives:
     *   1 player → 100%,  2 players → 67%,  3 players → 50%
     */
    getCreditMultiplier() {
        const n = this.getPlayerCount();
        return 1 / (1 + (n - 1) * 0.5);
    }

    /**
     * Enemy HP scales up so more firepower is needed.
     *   1 player → 100%,  2 players → 150%,  3 players → 200%
     */
    getEnemyHpScale() {
        const n = this.getPlayerCount();
        return 1 + (n - 1) * 0.5;
    }

    /**
     * Broadcast the current credit total so all clients stay in sync.
     * Only sent when credits are earned (kills / wave rewards / sell refunds).
     */
    broadcastCredits() {
        if (!this.room) return;
        RoomService.broadcastEvent('credits_sync', {
            senderId: PlayerService.getCurrentProfile()?.id,
            credits: this.credits
        });
    }

    /** Broadcast this player's live stats so the partner's TAB overlay is current. */
    broadcastStats() {
        if (!this.room) return;
        const profile = PlayerService.getCurrentProfile();
        RoomService.broadcastEvent('stats_update', {
            senderId: profile?.id,
            stats: {
                username: profile?.username || 'OPERATOR',
                damage: Math.floor(this.sessionDamage),
                kills: Math.floor(this.sessionKills)
            }
        });
    }

    /**
     * Broadcast final match stats so the partner can store them in Match History.
     * Also writes a localStorage marker so this client's history shows the CO-OP badge.
     */
    broadcastFinalStats(result) {
        if (!this.room) return;
        const profile = PlayerService.getCurrentProfile();
        const playedAt = new Date().toISOString();
        const minuteKey = playedAt.slice(0, 16);
        localStorage.setItem(`coop_self_${minuteKey}`, 'true');
        RoomService.broadcastEvent('final_stats', {
            senderId: profile?.id,
            stats: {
                username: profile?.username || 'OPERATOR',
                damage: Math.floor(this.sessionDamage),
                kills: Math.floor(this.sessionKills),
                result,
                levelId: this.levelId,
                playedAt
            }
        });
    }

    syncRemotePlacement(towerData) {
        const type = TOWER_TYPES[towerData.typeKey];
        if (!type) return;
        // Convert tile grid coords to pixel coords using THIS client's tileSize
        const x = towerData.tileCol * this.tileSize + this.tileSize / 2;
        const y = towerData.tileRow * this.tileSize + this.tileSize / 2;
        const remoteTower = new Tower(this, x, y, type);
        remoteTower.remoteId = towerData.remoteId;
        this.towers.push(remoteTower);
        console.log('[Game] Remote tower deployed at tile', towerData.tileCol, towerData.tileRow);
    }

    syncRemoteWave(waveIndex) {
        if (!this.isWaveActive || this.waveIndex < waveIndex) {
            if (this.waveIndex < waveIndex - 1) this.waveIndex = waveIndex - 1;
            this.startNextWave();
        }
    }

    syncRemoteUpgrade(data) {
        const tower = this.towers.find(t => t.remoteId === data.remoteId);
        if (tower) {
            tower.level = data.newLevel;
            tower.pathA = data.pathA;
            tower.pathB = data.pathB;
            console.log('[Game] Remote tower upgraded.');
        }
    }

    syncRemoteSell(data) {
        const towerIdx = this.towers.findIndex(t => t.remoteId === data.remoteId);
        if (towerIdx !== -1) {
            this.towers.splice(towerIdx, 1);
            console.log('[Game] Remote tower decommissioned.');
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

        // Overclock Button
        const btnOverclock = document.getElementById('btn-overclock');
        if (btnOverclock) {
            btnOverclock.onclick = () => {
                if (this.selectedTower) {
                    const success = this.selectedTower.overclock();
                    if (success) {
                        this.updateInspectPanel(this.selectedTower);
                    }
                }
            };
        }

        // Sacrifice Button
        const btnSacrifice = document.getElementById('btn-sacrifice');
        if (btnSacrifice) {
            btnSacrifice.onclick = () => {
                if (this.selectedTower) {
                    const success = this.selectedTower.sacrifice();
                    if (success) {
                        // Remove tower from game
                        const idx = this.towers.indexOf(this.selectedTower);
                        if (idx > -1) {
                            this.towers.splice(idx, 1);
                            ChallengeManager.onTowerLost();
                        }
                        this.deselectTower();
                    }
                }
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
                        senderId: PlayerService.getCurrentProfile().id,
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

                // --- MULTIPLAYER BROADCAST ---
                if (this.room) {
                    RoomService.broadcastEvent('wave_started', {
                        senderId: PlayerService.getCurrentProfile().id,
                        waveIndex: this.waveIndex
                    });
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
            // 0. Manual Aim Mode?
            if (this.isAiming && this.selectedTower && this.selectedTower.type.id === 'commander') {
                const fired = this.selectedTower.manualFire(this.mouse.x, this.mouse.y);
                if (fired) {
                    this.isAiming = false;
                    document.body.style.cursor = 'default';
                    this.updateInspectPanel(this.selectedTower); // Update CD UI
                }
                return;
            }

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

        if (this.tabMissionEl) this.tabMissionEl.textContent = this.levelId.toUpperCase();

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.showTabOverlay();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.hideTabOverlay();
            }
        });
    }

    showTabOverlay() {
        if (!this.tabOverlay) return;
        this.tabOverlay.classList.remove('hidden');
        this.broadcastStats(); // push fresh stats to partner on TAB press
        this.updateTabStats();
    }

    hideTabOverlay() {
        if (!this.tabOverlay) return;
        this.tabOverlay.classList.add('hidden');
    }

    /**
     * Toggles aim mode for the currently selected manual tower
     */
    toggleAimMode() {
        if (!this.selectedTower || this.selectedTower.type.type !== 'manual') return;

        this.isAiming = !this.isAiming;
        if (this.isAiming) {
            document.body.style.cursor = 'crosshair';
            console.log('[Game] Entered AIM MODE');
        } else {
            document.body.style.cursor = 'default';
            console.log('[Game] Exited AIM MODE');
        }
    }

    updateTabStats() {
        if (this.tabDamageEl) this.tabDamageEl.textContent = Math.floor(this.sessionDamage).toLocaleString();
        if (this.tabKillsEl) this.tabKillsEl.textContent = this.sessionKills.toLocaleString();
        // Use this.lives since it's the current HP
        if (this.tabHpEl) this.tabHpEl.textContent = `${Math.ceil(this.lives)}/${this.maxLives}`;

        // Co-op player breakdown in tab overlay
        const playersList = document.getElementById('tab-players-list');
        if (!playersList || !this.room) return;
        const profile = PlayerService.getCurrentProfile();
        const myRow = `<div class="tab-player-row self">
            <span class="name">&#9658; ${profile?.username || 'YOU'}</span>
            <span class="score">DMG&nbsp;${Math.floor(this.sessionDamage).toLocaleString()}&nbsp;&nbsp;K&nbsp;${this.sessionKills}</span>
        </div>`;
        const partnerRows = Object.values(this.partnerStats).map(p => `
            <div class="tab-player-row partner">
                <span class="name">${p.username || 'PARTNER'}</span>
                <span class="score">DMG&nbsp;${(p.damage || 0).toLocaleString()}&nbsp;&nbsp;K&nbsp;${p.kills || 0}</span>
            </div>
        `).join('');
        playersList.innerHTML = myRow + partnerRows;
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
        // Assign unique remote ID for cross-client tracking
        const remoteId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        newTower.remoteId = remoteId;
        // Deduct credits
        this.credits -= cost;
        this.updateResourceDisplay(); // FIX: Removed 'this.ui.'

        // Track for challenges
        ChallengeManager.onTowerPlaced(this.selectedTowerType);

        // --- MULTIPLAYER BROADCAST ---
        if (this.room) {
            RoomService.broadcastEvent('tower_placed', {
                senderId: PlayerService.getCurrentProfile().id,
                towerData: {
                    // Send tile grid indices so both screens resolve the same position
                    tileCol: Math.floor(tx / this.tileSize),
                    tileRow: Math.floor(ty / this.tileSize),
                    remoteId,
                    typeKey: this.selectedTowerType.key || this.selectedTowerType.id.toLowerCase()
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

    async victory() {
        this.isRunning = false;

        // Calculate rewards
        const levelData = levels.find(l => l.id === this.levelId) || { multiplier: 1.0 };
        let rewards = ProgressionManager.calculateMatchRewards('win', this.waveIndex, levelData.multiplier);

        // Evaluate challenges for bonus multipliers
        const challengeResult = ChallengeManager.evaluate(this);
        if (challengeResult.completed.length > 0) {
            rewards.xp = Math.floor(rewards.xp * challengeResult.totalXpMult);
            rewards.tokens = Math.floor(rewards.tokens * challengeResult.totalTokenMult);
            console.log(`[Game] Challenges completed: ${challengeResult.completed.map(c => c.name).join(', ')}`);

            // Sync with Daily Tasks
            TaskManager.checkCompletion(challengeResult.completed.map(c => c.id));
        }

        // Award rewards to player (Server-Side)
        await this.awardRewards('win', this.waveIndex);

        this.matchRecorded = true;
        this.broadcastFinalStats('win');

        // Save Results & Update Leaderboard
        await HistoryManager.saveMatch({
            result: 'win',
            wavesCleared: this.waveIndex,
            durationSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            damageDealt: Math.floor(this.sessionDamage),
            kills: Math.floor(this.sessionKills),
            xpGained: rewards.xp,
            tokensGained: rewards.tokens,
            levelId: this.levelId
        });

        const screen = document.getElementById('end-screen');
        const card = document.querySelector('.end-card');
        const title = document.getElementById('end-title');
        const reason = document.getElementById('end-reason');
        const waves = document.getElementById('end-waves');

        title.innerText = "SECTOR SECURED";
        reason.innerText = "MISSION ACCOMPLISHED";
        waves.innerText = `${this.waveIndex} / ${this.waves.length}`;

        // Display rewards on screen
        this.displayRewards(rewards);

        // Set Style (Green)
        card.className = 'end-card victory';
        screen.classList.remove('hidden');
    }



    async gameOver() {
        this.isRunning = false; // Stop game loop

        // Calculate rewards (partial for loss)
        const levelData = levels.find(l => l.id === this.levelId) || { multiplier: 1.0 };
        const rewards = ProgressionManager.calculateMatchRewards('loss', this.waveIndex, levelData.multiplier);

        // Award rewards (Server-Side)
        await this.awardRewards('loss', this.waveIndex);

        // Evaluate challenges even on loss (some might still be possible?)
        const challengeResult = ChallengeManager.evaluate(this);
        if (challengeResult.completed.length > 0) {
            TaskManager.checkCompletion(challengeResult.completed.map(c => c.id));
        }

        this.matchRecorded = true;
        this.broadcastFinalStats('loss');

        // Save Results & Update Leaderboard
        await HistoryManager.saveMatch({
            result: 'loss',
            wavesCleared: this.waveIndex,
            durationSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            damageDealt: Math.floor(this.sessionDamage),
            kills: Math.floor(this.sessionKills),
            xpGained: rewards.xp,
            tokensGained: rewards.tokens,
            levelId: this.levelId
        });

        const screen = document.getElementById('end-screen');
        const card = document.querySelector('.end-card');
        const title = document.getElementById('end-title');
        const reason = document.getElementById('end-reason');
        const waves = document.getElementById('end-waves');

        // 1. Set Content
        title.innerText = "SYSTEM FAILURE";
        reason.innerText = "BASE DESTROYED";
        waves.innerText = `${this.waveIndex} / ${this.waves.length}`;

        // Display rewards on screen
        this.displayRewards(rewards);

        // 2. Set Style (Red)
        card.className = 'end-card defeat';

        // 3. Show Retry Button if checkpoint exists
        const retryBtn = document.getElementById('btn-retry-wave');
        if (retryBtn) {
            if (this.lastWaveState) retryBtn.classList.remove('hidden');
            else retryBtn.classList.add('hidden');
        }

        // 3. Show Screen
        screen.classList.remove('hidden');
    }

    /**
     * Save current game state before a wave starts
     */
    saveCheckpoint() {
        this.lastWaveState = {
            credits: this.credits,
            lives: this.lives,
            towers: this.towers.map(t => ({
                x: t.x, y: t.y, typeId: t.type.id,
                level: t.level, pathA: t.pathA, pathB: t.pathB,
                rotation: t.rotation
            })),
            waveIndex: this.waveIndex,
            sessionDamage: this.sessionDamage,
            sessionKills: this.sessionKills
        };
        console.log('[Game] Checkpoint Saved.');
    }

    /**
     * Restore game to the start of the current (failed) wave
     */
    retryWave() {
        if (!this.lastWaveState) {
            console.error('[Game] No checkpoint found!');
            return;
        }

        const state = this.lastWaveState;

        // Restore Stats
        this.credits = state.credits;
        this.lives = state.lives;
        this.waveIndex = state.waveIndex;
        this.sessionDamage = state.sessionDamage;
        this.sessionKills = state.sessionKills;

        // Restore Towers
        this.towers = [];
        this.deselectTower();

        state.towers.forEach(tData => {
            const type = TOWER_TYPES[tData.typeId.toUpperCase()];
            if (type) {
                const tower = new Tower(this, tData.x, tData.y, type);
                tower.level = tData.level;
                tower.pathA = tData.pathA;
                tower.pathB = tData.pathB;
                tower.rotation = tData.rotation;
                this.towers.push(tower);
            }
        });

        // Clear Enemies/Projectiles
        this.enemies = [];
        this.projectiles = [];
        this.spawnQueue = [];
        this.isWaveActive = false;
        if (this.nextWaveTimerId) clearTimeout(this.nextWaveTimerId);

        // Hide End Screen
        document.getElementById('end-screen').classList.add('hidden');
        this.isRunning = true;

        // Restart game loop
        this.loop();

        // Update UI
        this.updateResourceDisplay();
        document.getElementById('res-wave').innerText = this.waveIndex;

        // Show Start Button for the retry
        const startBtn = document.getElementById('btn-start-wave');
        startBtn.classList.remove('hidden');
        startBtn.innerText = `RETRY WAVE ${this.waveIndex + 1}`;

        console.log('[Game] State Restored from Checkpoint.');
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

        // --- MULTIPLAYER BROADCAST ---
        if (this.room) {
            RoomService.broadcastEvent('tower_upgraded', {
                senderId: PlayerService.getCurrentProfile().id,
                upgradeData: {
                    remoteId: tower.remoteId,
                    newLevel: tower.level,
                    pathA: tower.pathA,
                    pathB: tower.pathB
                }
            });
        }

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
        this.broadcastCredits();
        this.updateResourceDisplay();

        // 3. Remove from Array
        const index = this.towers.indexOf(tower);
        if (index > -1) {
            // --- MULTIPLAYER BROADCAST ---
            if (this.room) {
                RoomService.broadcastEvent('tower_sold', {
                    senderId: PlayerService.getCurrentProfile().id,
                    sellData: { remoteId: tower.remoteId }
                });
            }
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
        const targetBtn = document.getElementById('btn-target');
        if (t.type.type === 'manual') {
            targetBtn.innerText = this.isAiming ? "CANCEL AIM" : "LAUNCH AIRSTRIKE";
            targetBtn.classList.add('overclock'); // Reuse cool style
            targetBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleAimMode();
                this.updateInspectPanel(t); // update text
            };
        } else {
            targetBtn.innerText = `TARGET: ${t.targetMode}`;
            targetBtn.classList.remove('overclock');
            targetBtn.onclick = (e) => {
                // Revert to standard behavior if listener was overwritten
                if (this.selectedTower) {
                    const newMode = this.selectedTower.cycleTargetMode();
                    targetBtn.innerText = `TARGET: ${newMode}`;
                }
            };
        }

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

        // --- OVERCLOCK BUTTON ---
        const btnOverclock = document.getElementById('btn-overclock');
        if (btnOverclock) {
            btnOverclock.onclick = (e) => {
                if (e) e.stopPropagation();
                if (this.selectedTower) {
                    const success = this.selectedTower.overclock();
                    if (success) {
                        btnOverclock.innerText = 'OVERCLOCKING...';
                        btnOverclock.disabled = true;
                    }
                }
            };
        }

        // --- SACRIFICE BUTTON ---
        const btnSacrifice = document.getElementById('btn-sacrifice');
        if (btnSacrifice) {
            btnSacrifice.onclick = (e) => {
                if (e) e.stopPropagation();
                if (this.selectedTower) {
                    const success = this.selectedTower.sacrifice();
                    if (success) {
                        this.deselectTower();
                    }
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

        // 3. Retry Button (End Screen)
        const retryBtn = document.getElementById('btn-retry-wave');
        if (retryBtn) {
            retryBtn.onclick = () => {
                this.retryWave();
            };
        }

        // 3. Exit Button
        document.getElementById('btn-exit').onclick = () => {
            this.exitToMenu();
        };
    }

    togglePause(isRemote = false) {
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

        // Sync pause state to partner (only for local actions)
        if (!isRemote && this.room) {
            RoomService.broadcastEvent('pause_state', {
                senderId: PlayerService.getCurrentProfile()?.id,
                paused: this.isPaused
            });
        }
    }

    applyRemotePause(paused) {
        if (paused !== this.isPaused) {
            this.togglePause(true); // true = remote, skip re-broadcast
        }
    }

    applyRemoteEvent(eventId) {
        const event = EventManager.events[eventId];
        if (!event) return;
        const result = event.apply(this);
        if (result) {
            this.notifier.notify(result.message, result.type || 'warning');
        }
        console.log('[Game] Remote event applied:', eventId);
    }

    broadcastGameEvent(eventResult) {
        if (!this.room || !this.isMultiplayerHost) return;
        RoomService.broadcastEvent('game_event_triggered', {
            senderId: PlayerService.getCurrentProfile()?.id,
            eventId: eventResult.id
        });
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

    async exitToMenu() {
        this.stop(); // Stops game and hides UI
        this.stopTrollMessages(); // Ensure interval is cleared

        // Reset Audio to Game/Menu Theme
        if (window.audioManager) window.audioManager.playTrack('game');

        // Save current progress before exiting (ONLY IF NOT RECORDED)
        if (!this.matchRecorded && (this.waveIndex > 0 || this.sessionDamage > 0)) {
            console.log('[Game] Saving mid-game quit record...');
            await HistoryManager.saveMatch({
                result: 'quit',
                wavesCleared: this.waveIndex,
                durationSeconds: Math.floor((Date.now() - this.startTime) / 1000),
                damageDealt: Math.floor(this.sessionDamage),
                kills: Math.floor(this.sessionKills),
                xpGained: 0,
                tokensGained: 0,
                levelId: this.levelId
            });
            console.log('[Game] Quit record saved.');
        }

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

            // Refresh Profile to update UI stats
            PlayerService.loadProfile();

            // Show Player Stats Widget again (if logged in)
            const statsWidget = document.getElementById('player-stats-widget');
            const profile = PlayerService.getCurrentProfile();
            if (statsWidget && profile && !profile.is_anonymous) {
                statsWidget.classList.remove('player-stats-hidden');
            }

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

    // --- REWARD SYSTEM ---

    /**
     * Award XP and tokens to the player profile via Secure RPC
     */
    async awardRewards(result, wavesCleared) {
        const profile = PlayerService.getCurrentProfile();
        const supabase = PlayerService.getClient();

        if (profile && !profile.is_anonymous) {
            console.log(`[Security] Requesting secure reward validation for ${result}...`);

            try {
                const { data, error } = await supabase.rpc('award_match_rewards', {
                    p_result: result,
                    p_waves_cleared: wavesCleared,
                    p_level_id: this.levelId
                });

                if (error) throw error;

                console.log('[Rewards] Secure award confirmed:', data);

                // Update local profile state to match server (via event)
                await PlayerService.loadProfile();

                // For UI display, we still use the client-side calculated reward object
                const levelData = levels.find(l => l.id === this.levelId) || { multiplier: 1.0 };
                const rewards = ProgressionManager.calculateMatchRewards(result, wavesCleared, levelData.multiplier);
                this.displayRewards(rewards);

            } catch (err) {
                console.error('[Security] Reward validation failed:', err.message);
                notifier.show({
                    title: 'UPLINK ERROR',
                    message: 'Could not sync rewards with orbital command.',
                    type: 'WARNING'
                });
            }
        } else {
            console.log('[Rewards] Guest mode - rewards not saved to profile');
            // Still show visual feedback
            const levelData = levels.find(l => l.id === this.levelId) || { multiplier: 1.0 };
            const rewards = ProgressionManager.calculateMatchRewards(result, wavesCleared, levelData.multiplier);
            this.displayRewards(rewards);
        }
    }

    /**
     * Display rewards on the end screen
     */
    displayRewards(rewards) {
        const statsDiv = document.querySelector('.end-stats');
        if (statsDiv) {
            // Remove any existing rewards display
            const existing = statsDiv.querySelector('.end-rewards');
            if (existing) existing.remove();

            // Add new reward display
            const rewardsHTML = `
                <p class="end-rewards">
                    <span class="reward-item">+${rewards.xp} XP</span>
                    <span class="reward-separator">•</span>
                    <span class="reward-item">+${rewards.tokens} ◈</span>
                </p>
            `;
            statsDiv.insertAdjacentHTML('beforeend', rewardsHTML);
        }
    }
}
