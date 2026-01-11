// js/main.js
import { Navigation } from './ui/Navigation.js';
import { SpaceScene } from './scenes/SpaceScene.js';
import { AudioManager } from './core/AudioManager.js';
import { Game } from './core/Game.js';

window.menuBackground = null;

window.onload = () => {
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
