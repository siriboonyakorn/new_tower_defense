// js/main.js
import { Navigation } from './ui/Navigation.js';
import { SpaceScene } from './scenes/SpaceScene.js';
import { AudioManager } from './core/AudioManager.js';
import { Game } from './core/Game.js';

let menuBackground = null; 

window.onload = () => {
    window.audioManager = new AudioManager();
    const nav = new Navigation();
    const initBtn = document.getElementById('btn-initialize');
    const bootScreen = document.getElementById('boot-screen');
    const mainMenu = document.getElementById('main-menu');

    if (initBtn) {
        initBtn.onclick = async () => {
            // 1. Give feedback if you clicked really fast
            const originalText = initBtn.innerText;
            initBtn.innerText = "SYNCING DATA...";
            initBtn.style.opacity = "0.5";

            try {
                // 2. THIS IS THE FIX: Wait for the music download to finish!
                await window.audioManager.musicReady;
                
                // 3. Now it's safe to start
                await window.audioManager.resumeContext(); 
                window.audioManager.playMusic();
            } catch (err) {
                console.error("Audio glitch:", err);
            }

            // 4. Visuals (Reset button just in case)
            initBtn.innerText = originalText;
            
            if (bootScreen) bootScreen.classList.add('fade-out');
            if (mainMenu) mainMenu.classList.add('active');
            
            if (menuBackground === null) {
                menuBackground = new SpaceScene('game-canvas');
                menuBackground.start();
            }
        };
    }
};