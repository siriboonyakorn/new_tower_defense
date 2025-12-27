// js/ui/Navigation.js

export class Navigation {
    constructor() {
        this.setupEventListeners();
        this.setupKeyboardListeners();
    }

    closeMenu(overlay) {
        if (!overlay || overlay.classList.contains('hidden')) return;
        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('closing');
        }, 300);
    }

    setupEventListeners() {
        // Elements
        const logsBtn = document.getElementById('btn-logs');
        const settingsBtn = document.getElementById('btn-settings');
        
        const logsOverlay = document.getElementById('logs-overlay');
        const settingsOverlay = document.getElementById('settings-overlay');
        
        const closeLogs = document.getElementById('close-logs');
        const closeSettings = document.getElementById('close-settings');
        const fullscreenBtn = document.getElementById('btn-fullscreen');
        // Inside setupEventListeners() in js/ui/Navigation.js

        const volumeSlider = document.getElementById('volume-slider');

        if (volumeSlider) {
            volumeSlider.oninput = (e) => {
                const volume = e.target.value;
                // Access the global audioManager we created in main.js
                if (window.audioManager) {
                    window.audioManager.setVolume(volume);
                }
            };
        }
        // Logic: Open Logs
        if(logsBtn) logsBtn.onclick = () => logsOverlay.classList.remove('hidden');
        
        // Logic: Open Settings
        if(settingsBtn) settingsBtn.onclick = () => settingsOverlay.classList.remove('hidden');

        // Logic: Close Buttons
        if(closeLogs) closeLogs.onclick = () => this.closeMenu(logsOverlay);
        if(closeSettings) closeSettings.onclick = () => this.closeMenu(settingsOverlay);

        // Logic: Fullscreen
        if(fullscreenBtn) {
            fullscreenBtn.onclick = () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                }
            };
        }

        // Logic: Click Background to Close
        [logsOverlay, settingsOverlay].forEach(overlay => {
            if(overlay) {
                overlay.onclick = (e) => {
                    if (e.target === overlay) this.closeMenu(overlay);
                };
            }
        });
        const menuItems = document.querySelectorAll('.menu-item');

        menuItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                if (window.audioManager) {
                    window.audioManager.playUI('hover');
                }
            });
        });
    }
    
    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === "Escape" || e.key === "x" || e.key === "X") {
                this.closeMenu(document.getElementById('logs-overlay'));
                this.closeMenu(document.getElementById('settings-overlay'));
            }
        });
    }
}