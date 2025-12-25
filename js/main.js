import { Game } from './core/Game.js';
import { Navigation } from './ui/Navigation.js';

window.addEventListener('load', () => {
    const nav = new Navigation();
    
    // Game runs in background for now, or you can pause it
    const game = new Game();
    game.start();
});