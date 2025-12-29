// js/main.js
import { Navigation } from './ui/Navigation.js';
import { SpaceScene } from './scenes/SpaceScene.js';
import { AudioManager } from './core/AudioManager.js';
import { Game } from './core/Game.js'; 

// CHANGE THIS: Attach to window so we can control it from other files
window.menuBackground = null; 

window.onload = () => {
    window.audioManager = new AudioManager();
    const nav = new Navigation();
    const initBtn = document.getElementById('btn-initialize');
    const bootScreen = document.getElementById('boot-screen');
    const mainMenu = document.getElementById('main-menu');

    if (initBtn) {
        initBtn.onclick = async () => {
            // ... (keep your audio logic here) ...
            
            // Visuals
            const originalText = initBtn.innerText;
            initBtn.innerText = "SYNCING DATA...";
            
            try {
                await window.audioManager.musicReady;
                await window.audioManager.resumeContext(); 
                window.audioManager.playMusic();
            } catch (err) { console.error(err); }

            initBtn.innerText = originalText;
            if (bootScreen) bootScreen.classList.add('fade-out');
            if (mainMenu) mainMenu.classList.add('active');
            
            // CHANGE THIS: Use the global window variable
            if (window.menuBackground === null) {
                window.menuBackground = new SpaceScene('game-canvas');
                window.menuBackground.start();
            }
        };
    }
};