// js/ui/Navigation.js
import { levels } from '../data/levels.js';

export class Navigation {
    constructor() {
        this.selectedLevelId = null;
        this.setupEventListeners();
        this.setupKeyboardListeners();
    }

    // --- NEW FUNCTION: Populate the map list ---
    p// js/ui/Navigation.js

populateMapList() {
    const mapListContainer = document.getElementById('map-list');
    mapListContainer.innerHTML = ''; 

    levels.forEach(level => {
        const mapCard = document.createElement('div');
        mapCard.className = 'map-card';
        mapCard.dataset.id = level.id;

        // CHANGED: We use a div instead of an img to prevent 404 errors
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
    // --- NEW FUNCTION: Handle level selection ---
    selectLevel(id) {
        this.selectedLevelId = id;
        const levelData = levels.find(l => l.id === id);

        // Update UI styling for selection
        document.querySelectorAll('.map-card').forEach(card => card.classList.remove('selected'));
        const selectedCard = document.querySelector(`.map-card[data-id="${id}"]`);
        if (selectedCard) selectedCard.classList.add('selected');

        // Show briefing details
        document.getElementById('no-selection-placeholder').classList.add('hidden');
        document.getElementById('selected-map-details').classList.remove('hidden');

        // Populate briefing data
        document.getElementById('briefing-title').textContent = levelData.name;
        document.getElementById('briefing-difficulty').textContent = levelData.difficulty;
        document.getElementById('briefing-multiplier').textContent = `x${levelData.multiplier.toFixed(2)} REWARD`;
        document.getElementById('briefing-text').textContent = levelData.briefing;

        // Enable Deploy Button
        document.getElementById('btn-deploy').disabled = false;

        // Play select sound
        if (window.audioManager) window.audioManager.playUI('click');
    }

    closeMenu(overlay) {
        if (!overlay || overlay.classList.contains('hidden')) return;
        // Reset selection when closing deployment menu
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
        // --- Existing buttons ---
        const startBtn = document.getElementById('btn-start');
        const logsBtn = document.getElementById('btn-logs');
        const settingsBtn = document.getElementById('btn-settings');
        
        // --- New Deployment elements ---
        const deploymentOverlay = document.getElementById('deployment-overlay');
        const closeDeployment = document.getElementById('close-deployment');
        const deployBtn = document.getElementById('btn-deploy');

        const logsOverlay = document.getElementById('logs-overlay');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeLogs = document.getElementById('close-logs');
        const closeSettings = document.getElementById('close-settings');
        
        // --- LOGIC UPDATE: START OPERATION ---
        if (startBtn) {
            startBtn.onclick = () => {
                // 1. Close any other open overlays first to prevent overlap
                this.closeMenu(logsOverlay);
                this.closeMenu(settingsOverlay);

                // 2. Populate and SHOW
                this.populateMapList(); 
                
                // 3. Force visibility and high z-index
                deploymentOverlay.classList.remove('hidden');
                deploymentOverlay.style.zIndex = "20000"; 
                
                console.log("Deployment Menu Triggered");
            };
        }

        // --- NEW LOGIC: DEPLOY BUTTON ---
        if (deployBtn) {
            deployBtn.onclick = () => {
                if (this.selectedLevelId) {
                    console.log(`Initiating deployment to: ${this.selectedLevelId}`);
                    console.log("System: Deployment location verified. Waiting for engine clearance...");
                    // window.game = new Game(this.selectedLevelId); // Future code
                }
            };
        }

        if (closeDeployment) closeDeployment.onclick = () => this.closeMenu(deploymentOverlay);

        // ... (Keep existing logic for logs, settings, and fullscreen) ...
        if(logsBtn) logsBtn.onclick = () => logsOverlay.classList.remove('hidden');
        if(settingsBtn) settingsBtn.onclick = () => settingsOverlay.classList.remove('hidden');
        if(closeLogs) closeLogs.onclick = () => this.closeMenu(logsOverlay);
        if(closeSettings) closeSettings.onclick = () => this.closeMenu(settingsOverlay);

        // Logic: Click Background to Close
        [logsOverlay, settingsOverlay, deploymentOverlay].forEach(overlay => {
            if(overlay) {
                overlay.onclick = (e) => {
                    if (e.target === overlay) this.closeMenu(overlay);
                };
            }
        });

        // Logic: Hover Sounds
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