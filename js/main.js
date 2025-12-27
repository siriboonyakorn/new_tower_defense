import { Navigation } from './ui/Navigation.js';
import { SpaceScene } from './scenes/SpaceScene.js';
import { AudioManager } from './core/AudioManager.js';
import { Game } from './core/Game.js'; // <--- 1. Import the Game Class

window.onload = () => {
    window.audioManager = new AudioManager();
    const nav = new Navigation();
    
    // Elements
    const bootScreen = document.getElementById('boot-screen');
    const initBtn = document.getElementById('btn-initialize');
    const startBtn = document.getElementById('btn-start'); // <--- 2. Get the Start Button

    // --- BOOT SEQUENCE (Existing Code) ---
    initBtn.onclick = () => {
        if (window.audioManager) window.audioManager.playMusic();
        
        bootScreen.classList.add('fade-out');
        const mainMenu = document.getElementById('main-menu');
        mainMenu.classList.add('active');
        
        // Start the starfield background
        window.menuBackground = new SpaceScene('game-canvas');
        window.menuBackground.start();
    };

    // --- START GAME SEQUENCE (New Code) ---
    startBtn.onclick = () => {
        // 1. Hide the Main Menu
        const mainMenu = document.getElementById('main-menu');
        mainMenu.classList.remove('active');
        mainMenu.classList.add('hidden');

        // 2. Stop the Menu Background (saves performance)
        if (window.menuBackground) {
            window.menuBackground.stop();
        }

        // 3. Initialize and Start the Game
        console.log("Starting Game...");
        const game = new Game();
        game.start();
    };
};