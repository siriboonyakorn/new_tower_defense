import { levels } from '../data/levels.js';
import { Game } from '../core/Game.js';

export class Navigation {
    constructor() {
        console.log("[Navigation] Initialized");
        this.selectedLevelId = null;
        this.setupEventListeners();
        this.setupKeyboardListeners();
    }

    // js/ui/Navigation.js

    populateMapList() {
        const mapListContainer = document.getElementById('map-list');
        if (!mapListContainer) return;

        mapListContainer.innerHTML = '';

        levels.forEach(level => {
            const mapCard = document.createElement('div');
            mapCard.className = 'map-card';
            mapCard.dataset.id = level.id; // CRITICAL: Added for selection logic
            if (this.selectedLevelId === level.id) mapCard.classList.add('selected');

            mapCard.innerHTML = `
            <span class="map-name">${level.name}</span>
            <span class="map-diff" style="color: ${this.getDifficultyColor(level.difficulty)};">
                ${level.difficulty}
            </span>
        `;

            mapCard.onclick = () => this.selectLevel(level.id);
            mapListContainer.appendChild(mapCard);
        });
    }

    // Add this helper to give each difficulty a unique color
    getDifficultyColor(diff) {
        switch (diff) {
            case 'EASY': return '#00f3ff';   // Cyan
            case 'NORMAL': return '#00ff00'; // Green
            case 'HARD': return '#ff9f00';   // Orange
            case 'INSANE': return '#ff00ff'; // Magenta
            case 'OMEGA': return '#ff0000';  // Red
            default: return '#ffffff';
        }
    }

    selectLevel(id) {
        this.selectedLevelId = id;
        const levelData = levels.find(l => l.id === id);

        document.querySelectorAll('.map-card').forEach(card => card.classList.remove('selected'));
        const selectedCard = document.querySelector(`.map-card[data-id="${id}"]`);
        if (selectedCard) selectedCard.classList.add('selected');

        document.getElementById('no-selection-placeholder').classList.add('hidden');
        document.getElementById('selected-map-details').classList.remove('hidden');

        document.getElementById('briefing-title').textContent = levelData.name;
        document.getElementById('briefing-difficulty').textContent = levelData.difficulty;
        document.getElementById('briefing-multiplier').textContent = `x${levelData.multiplier.toFixed(2)} REWARD`;
        document.getElementById('briefing-text').textContent = levelData.briefing;

        document.getElementById('btn-deploy').disabled = false;

        if (window.audioManager) window.audioManager.playUI('click');
    }

    closeMenu(overlay) {
        if (!overlay || overlay.classList.contains('hidden')) return;

        if (overlay.id === 'deployment-overlay') {
            this.selectedLevelId = null;
            document.querySelectorAll('.map-card').forEach(card => card.classList.remove('selected'));
            document.getElementById('btn-deploy').disabled = true;
            document.getElementById('selected-map-details').classList.add('hidden');
            document.getElementById('no-selection-placeholder').classList.remove('hidden');
        }

        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('closing');
        }, 300);
    }

    setupEventListeners() {
        const startBtn = document.getElementById('btn-start');
        console.log("[Navigation] Binding startBtn:", !!startBtn);
        const logsBtn = document.getElementById('btn-logs');
        const settingsBtn = document.getElementById('btn-settings');

        const deploymentOverlay = document.getElementById('deployment-overlay');
        const closeDeployment = document.getElementById('close-deployment');
        const deployBtn = document.getElementById('btn-deploy');

        const logsOverlay = document.getElementById('logs-overlay');
        const settingsOverlay = document.getElementById('settings-modal'); // FIXED: Matches HTML ID
        const closeLogs = document.getElementById('close-logs');
        const closeSettings = document.getElementById('close-settings');

        if (startBtn) {
            startBtn.onclick = () => {
                console.log("Start button clicked!"); // Debug log
                this.closeMenu(logsOverlay);
                this.closeMenu(settingsOverlay);
                this.populateMapList();
                console.log("[Navigation] Showing deployment overlay...");
                deploymentOverlay.classList.remove('hidden');
                console.log("[Navigation] Deployment overlay hidden state:", deploymentOverlay.classList.contains('hidden'));
            };
        }

        // js/ui/Navigation.js

        if (deployBtn) {
            deployBtn.onclick = () => {
                // 1. Capture the ID RIGHT NOW before any timers start
                const targetLevelId = this.selectedLevelId;

                if (targetLevelId) {
                    console.log("Deploying to:", targetLevelId);

                    const transitionLayer = document.getElementById('transition-layer');
                    if (transitionLayer) {
                        transitionLayer.classList.remove('active'); // Ensure start state is clean
                        transitionLayer.style.display = 'flex'; // Ensure it's not display: none
                    }
                    const mainMenu = document.getElementById('main-menu');

                    transitionLayer.classList.add('active');

                    // Give the animations time to play (Scanner & Progress Bar)
                    setTimeout(() => {
                        this.closeMenu(deploymentOverlay);
                        if (mainMenu) mainMenu.classList.remove('active');
                        document.querySelectorAll('.sub-menu').forEach(m => m.classList.add('hidden'));

                        // HIDE STATS WIDGET TOO
                        const statsWidget = document.getElementById('player-stats-widget');
                        if (statsWidget) statsWidget.classList.add('player-stats-hidden');

                        if (window.menuBackground) window.menuBackground.stop();
                        if (window.game && typeof window.game.stop === 'function') {
                            window.game.stop();
                        }

                        console.log("[Navigation] Transition starting...");
                        // USE THE CAPTURED ID HERE
                        window.game = new Game('game-canvas', targetLevelId);

                        setTimeout(() => {
                            transitionLayer.classList.remove('active');
                            console.log("[Navigation] Transition complete. HUD should be visible.");
                        }, 800);

                    }, 1400);
                } else {
                    console.error("[Navigation] Cannot deploy: No level selected!");
                }
            };
        }

        const multiBtn = document.getElementById('btn-multiplayer');
        if (multiBtn) {
            multiBtn.onclick = () => {
                // Open Lobby without map validation
                this.closeMenu(deploymentOverlay);

                if (window.LobbyUI) {
                    window.LobbyUI.open();
                } else {
                    console.error("LobbyUI not found on window");
                }
            };
        }

        if (closeDeployment) closeDeployment.onclick = () => this.closeMenu(deploymentOverlay);

        if (logsBtn) logsBtn.onclick = () => logsOverlay.classList.remove('hidden');
        if (settingsBtn) settingsBtn.onclick = () => settingsOverlay.classList.remove('hidden');
        if (closeLogs) closeLogs.onclick = () => this.closeMenu(logsOverlay);
        if (closeSettings) closeSettings.onclick = () => this.closeMenu(settingsOverlay);

        [logsOverlay, settingsOverlay, deploymentOverlay].forEach(overlay => {
            if (overlay) {
                overlay.onclick = (e) => {
                    if (e.target === overlay) this.closeMenu(overlay);
                };
            }
        });

        const menuItems = document.querySelectorAll('.menu-item, .close-btn, .deploy-btn');
        menuItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                if (window.audioManager) window.audioManager.playUI('hover');
            });
        });
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === "Escape" || e.key === "x" || e.key === "X") {
                this.closeMenu(document.getElementById('logs-overlay'));
                this.closeMenu(document.getElementById('settings-modal'));
                this.closeMenu(document.getElementById('deployment-overlay'));
                this.closeMenu(document.getElementById('auth-modal'));
                this.closeMenu(document.getElementById('lobby-modal'));
            }
        });
    }
}