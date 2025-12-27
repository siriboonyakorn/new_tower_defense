import { Navigation } from './ui/Navigation.js';
import { SpaceScene } from './scenes/SpaceScene.js';
import { AudioManager } from './core/AudioManager.js'; // Import it

window.onload = () => {
    window.audioManager = new AudioManager();
    const nav = new Navigation();
    const bootScreen = document.getElementById('boot-screen');
    const initBtn = document.getElementById('btn-initialize');

   initBtn.onclick = () => {
    // 1. Audio
    if (window.audioManager) window.audioManager.playMusic();
    
    // 2. Hide Boot Screen
    const bootScreen = document.getElementById('boot-screen');
    bootScreen.classList.add('fade-out');

    // 3. Trigger Menu Animation
    const mainMenu = document.getElementById('main-menu');
    // We add 'active' to kick off the CSS transitions we just wrote
    mainMenu.classList.add('active');

    // 4. Background
    const menuBackground = new SpaceScene('game-canvas');
    menuBackground.start();
  };
};