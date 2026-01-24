import { Navigation } from './ui/Navigation.js';
import { SpaceScene } from './scenes/SpaceScene.js';
import { AudioManager } from './core/AudioManager.js';
import { Game } from './core/Game.js';
import { CONFIG } from './config.js';
import { PlayerService } from './modules/PlayerService.js';
import { AuthUI } from './ui/AuthUI.js';
import { LobbyUI } from './ui/LobbyUI.js';
import { StoreUI } from './ui/StoreUI.js';
import { InventoryUI } from './ui/InventoryUI.js';

window.menuBackground = null;

window.onload = async () => {
    // Init Services
    try {
        PlayerService.init({
            url: CONFIG.SUPABASE_URL,
            anonKey: CONFIG.SUPABASE_ANON_KEY
        });
        AuthUI.init();
        LobbyUI.init();
        StoreUI.init();
        InventoryUI.init();
    } catch (e) {
        console.warn("Supabase init failed (check config.js):", e);
    }

    window.audioManager = new AudioManager();
    const nav = new Navigation();

    const initBtn = document.getElementById('btn-initialize');
    const bootScreen = document.getElementById('boot-screen');
    const mainMenu = document.getElementById('main-menu');
    const volumeSlider = document.getElementById('volume-slider');

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            if (window.audioManager) window.audioManager.setVolume(e.target.value);
        });
    }

    if (initBtn) {
        initBtn.onclick = async () => {
            // 1. Lock Button visually immediately
            initBtn.style.pointerEvents = 'none';
            initBtn.style.opacity = "0.5";
            initBtn.innerText = "LOADING...";

            try {
                // 2. Resume Audio Context
                await window.audioManager.resumeContext();

                // 3. CRITICAL FIX: Wait for the download to finish!
                // Even if you click fast, this forces the code to wait until the file is ready.
                await window.audioManager.musicReady;

                // 4. Now it is safe to play
                window.audioManager.playMusic();
            } catch (err) {
                console.error("Audio initialization failed:", err);
            }

            // 5. Visual Transition
            if (bootScreen) {
                requestAnimationFrame(() => {
                    bootScreen.classList.add('fade-out');
                    // Activate Menu IMMEDIATELY when fade starts
                    if (mainMenu) mainMenu.classList.add('active');
                });
                setTimeout(() => {
                    bootScreen.style.display = 'none';
                }, 1500);
            }

            if (window.menuBackground === null) {
                window.menuBackground = new SpaceScene('game-canvas');
                window.menuBackground.start();
            }
        };
    }
    // js/main.js - Inside window.onload

    // 1. Block Ctrl + Mouse Wheel Zoom
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // 2. Block Ctrl + Plus, Minus, and Zero keys
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '0')) {
            e.preventDefault();
        }
    });

    // Inside setupUI() ...

    // --- INSTANT SETTINGS LOGIC ---

    // 1. Volume Sliders
    const masterVol = document.getElementById('vol-master');
    const sfxVol = document.getElementById('vol-sfx');

    const updateSliderFill = (slider) => {
        const val = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        slider.style.background = `linear-gradient(to right, var(--neon-blue) 0%, var(--neon-blue) ${val}%, rgba(255,255,255,0.1) ${val}%, rgba(255,255,255,0.1) 100%)`;
    };

    if (masterVol) {
        masterVol.addEventListener('input', (e) => {
            const val = e.target.value;
            if (window.audioManager) window.audioManager.setVolume(val);
            updateSliderFill(e.target);
            // Update display text
            const display = e.target.parentElement.querySelector('.value-display');
            if (display) display.innerText = `${val}%`;
        });
        updateSliderFill(masterVol); // Initial fill
    }

    if (sfxVol) {
        sfxVol.addEventListener('input', (e) => {
            const val = e.target.value;
            // if (window.audioManager) window.audioManager.setSFXVolume(val); // Add if available
            updateSliderFill(e.target);
            const display = e.target.parentElement.querySelector('.value-display');
            if (display) display.innerText = `${val}%`;
        });
        updateSliderFill(sfxVol);
    }

    // 2. Toggles (Bloom, Particles, etc.)
    const bloomToggle = document.getElementById('opt-bloom');
    const particleToggle = document.getElementById('opt-particles');
    const dmgToggle = document.getElementById('opt-dmg-nums');

    if (bloomToggle) {
        bloomToggle.addEventListener('change', (e) => {
            console.log("Bloom toggled:", e.target.checked);
            // Apply to game engine here
        });
    }

    if (particleToggle) {
        particleToggle.addEventListener('change', (e) => {
            console.log("Particles toggled:", e.target.checked);
        });
    }

    // --- RETURN TO MENU BUTTON (from game over screen) ---
    const btnReturnMenu = document.getElementById('btn-return-menu');
    if (btnReturnMenu) {
        btnReturnMenu.onclick = (e) => {
            e.stopPropagation();
            // Hide end screen
            const endScreen = document.getElementById('end-screen');
            if (endScreen) endScreen.classList.add('hidden');

            // Call exit to menu if game exists
            if (window.game && typeof window.game.exitToMenu === 'function') {
                window.game.exitToMenu();
            } else {
                // Fallback: Just show menu if game doesn't exist
                const mainMenu = document.getElementById('main-menu');
                const gameHud = document.getElementById('game-hud');
                if (mainMenu) mainMenu.classList.add('active');
                if (gameHud) gameHud.classList.add('hidden');
                if (window.menuBackground && typeof window.menuBackground.start === 'function') {
                    window.menuBackground.start();
                }
            }
        };
    }
}
// A safer way to open windows
function openWindow(id) {
    const win = document.getElementById(id);
    if (win) {
        win.classList.remove('hidden');
    } else {
        console.error(`UI Error: Window with ID "${id}" not found!`);
    }
}

// Update your listeners
