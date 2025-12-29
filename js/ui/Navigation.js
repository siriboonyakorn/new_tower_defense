import { levels } from '../data/levels.js';
import { Game } from '../core/Game.js';

export class Navigation {
    constructor() {
        this.selectedLevelId = null;
        this.setupEventListeners();
        this.setupKeyboardListeners();
    }

    populateMapList() {
        const mapListContainer = document.getElementById('map-list');
        mapListContainer.innerHTML = ''; 

        levels.forEach(level => {
            const mapCard = document.createElement('div');
            mapCard.className = 'map-card';
            mapCard.dataset.id = level.id;

            mapCard.innerHTML = `
                <div class="map-card-placeholder">
                    <span>${level.name}</span>
                </div>
                <div class="map-info">
                    <div class="map-name">${level.name}</div>
                    <div class="map-meta">
                        <span>DIFF: ${level.difficulty}</span>
                        <span>MULT: x${level.multiplier.toFixed(2)}</span>
                    </div>
                </div>
            `;

            mapCard.addEventListener('click', () => this.selectLevel(level.id));
            mapListContainer.appendChild(mapCard);
        });
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
        const logsBtn = document.getElementById('btn-logs');
        const settingsBtn = document.getElementById('btn-settings');
        
        const deploymentOverlay = document.getElementById('deployment-overlay');
        const closeDeployment = document.getElementById('close-deployment');
        const deployBtn = document.getElementById('btn-deploy');

        const logsOverlay = document.getElementById('logs-overlay');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeLogs = document.getElementById('close-logs');
        const closeSettings = document.getElementById('close-settings');
        
        if (startBtn) {
            startBtn.onclick = () => {
                this.closeMenu(logsOverlay);
                this.closeMenu(settingsOverlay);
                this.populateMapList(); 
                deploymentOverlay.classList.remove('hidden');
            };
        }

        if (deployBtn) {
            deployBtn.onclick = () => {
                if (this.selectedLevelId) {
                    // 1. Close UI
                    this.closeMenu(deploymentOverlay);
                    document.getElementById('main-menu').classList.remove('active');
                    
                    // 2. IMPORTANT: Stop the Star Background!
                    if (window.menuBackground) {
                        window.menuBackground.stop(); // Stops the render loop
                        // Optional: Clear the variable
                        // window.menuBackground = null; 
                    }

                    // 3. Stop any previous game instance
                    if (window.game) {
                        window.game.stop();
                    }
                    
                    // 4. Start the new Game
                    console.log("System: Grid Initialization...");
                    window.game = new Game('game-canvas', this.selectedLevelId);
                }
            };
}

        if (closeDeployment) closeDeployment.onclick = () => this.closeMenu(deploymentOverlay);

        if(logsBtn) logsBtn.onclick = () => logsOverlay.classList.remove('hidden');
        if(settingsBtn) settingsBtn.onclick = () => settingsOverlay.classList.remove('hidden');
        if(closeLogs) closeLogs.onclick = () => this.closeMenu(logsOverlay);
        if(closeSettings) closeSettings.onclick = () => this.closeMenu(settingsOverlay);

        [logsOverlay, settingsOverlay, deploymentOverlay].forEach(overlay => {
            if(overlay) {
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
                this.closeMenu(document.getElementById('settings-overlay'));
                this.closeMenu(document.getElementById('deployment-overlay'));
            }
        });
    }
}