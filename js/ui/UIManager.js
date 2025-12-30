import { TOWER_TYPES } from '../data/towers.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.sidePanel = document.querySelector('.side-panel');
        this.buildBtn = document.getElementById('btn-toggle-build');
        this.gridContainer = document.querySelector('.tower-grid');
        
        this.init();
    }

    init() {
        // 1. Show HUD
        document.getElementById('game-hud').classList.remove('hidden');
        if(this.buildBtn) this.buildBtn.classList.remove('hidden');

        // 2. Build Toggle
        if (this.buildBtn) {
            this.buildBtn.onclick = (e) => {
                e.stopPropagation();
                this.sidePanel.classList.toggle('open');
            };
        }

        // 3. Close panel on click outside
        window.addEventListener('click', (e) => {
            if (this.sidePanel.classList.contains('open') && 
                !this.sidePanel.contains(e.target) && 
                e.target !== this.buildBtn) {
                this.sidePanel.classList.remove('open');
            }
        });

        this.generateTowerButtons();
        this.updateResourceDisplay();
    }

    generateTowerButtons() {
        this.gridContainer.innerHTML = '';
        Object.values(TOWER_TYPES).forEach(tower => {
            const btn = document.createElement('div');
            btn.className = 'build-btn';
            btn.innerHTML = `
                <div class="tower-icon" style="background:${tower.color}"></div>
                <span>${tower.name.split(' ')[0]}</span>
                <span class="tower-cost">${tower.cost}</span>
            `;
            
            btn.onclick = (e) => {
                e.stopPropagation();
                if (this.game.selectedTowerType === tower) {
                    this.deselect();
                } else {
                    this.selectTower(tower, btn);
                }
            };
            this.gridContainer.appendChild(btn);
        });
    }

    selectTower(tower, btnElement) {
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
        this.game.selectedTowerType = tower;
        btnElement.classList.add('active');
        this.sidePanel.classList.remove('open'); // Auto close
    }

    deselect() {
        this.game.selectedTowerType = null;
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
    }

    updateResourceDisplay() {
        document.getElementById('res-credits').innerText = this.game.credits;
        document.getElementById('res-lives').innerText = this.game.lives;
    }
}