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
                });
                setTimeout(() => {
                    bootScreen.style.display = 'none';
                }, 1500);
            }
            
            if (mainMenu) mainMenu.classList.add('active');

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

// 1. Settings Tab Logic
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from everything
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding content
        const targetId = `tab-${tab.dataset.tab}`;
        document.getElementById(targetId).classList.add('active');
    });
});

// 2. Slider Number Updates
document.querySelectorAll('input[type="range"]').forEach(range => {
    range.addEventListener('input', (e) => {
        // Find the span next to this slider and update text
        const display = e.target.parentElement.querySelector('.value-display');
        if(display) display.innerText = `${e.target.value}%`;
    });
});    
};
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
settingsBtn.onclick = () => openWindow('settings-window');
logsBtn.onclick = () => openWindow('logs-window'); // Make sure this ID matches your HTML too!