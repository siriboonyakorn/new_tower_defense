/**
 * InventoryUI.js
 * Manages the Player's Inventory interface.
 */
import { StoreService } from '../modules/StoreService.js';
import { SkinsData } from '../data/SkinsData.js';
import { PlayerService } from '../modules/PlayerService.js';
import { SkinPreviewRenderer } from '../render/SkinPreviewRenderer.js';

export const InventoryUI = {
    elements: {},
    activeFilter: 'all',
    selectedSkin: null,
    ctx: null,
    animFrame: null,

    init() {
        console.log('[InventoryUI] Initializing...');
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            modal: document.getElementById('inventory-modal'),
            closeBtn: document.getElementById('close-inventory'),
            openBtn: document.getElementById('btn-inventory'),

            tabs: document.querySelectorAll('.inv-tab'),
            grid: document.getElementById('inventory-grid'),

            // Preview
            renderBox: document.getElementById('inv-preview-render'),
            name: document.getElementById('inv-preview-name'),
            desc: document.getElementById('inv-preview-desc'),
            stats: document.getElementById('inv-stats-container')
        };

        if (this.elements.renderBox && !this.elements.canvas) {
            this.elements.renderBox.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.width = 260;
            canvas.height = 260;
            this.elements.renderBox.appendChild(canvas);
            this.elements.canvas = canvas;
            this.ctx = canvas.getContext('2d');
        }
    },

    bindEvents() {
        if (this.elements.openBtn) {
            this.elements.openBtn.addEventListener('click', () => this.open());
        }
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }

        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.elements.tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.switchFilter(e.target.dataset.type);
            });
        });
    },

    open() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
            this.refreshGrid();
            this.startAnimation();
        }
    },

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
            this.stopAnimation();
        }
    },

    switchFilter(type) {
        this.activeFilter = type;
        this.refreshGrid();
    },

    refreshGrid() {
        const grid = this.elements.grid;
        grid.innerHTML = '';

        let allSkins = [];

        // Aggregate skins based on filter
        if (this.activeFilter === 'all') {
            for (const key in SkinsData) {
                allSkins.push(...SkinsData[key]);
            }
        } else {
            if (SkinsData[this.activeFilter]) {
                allSkins = SkinsData[this.activeFilter];
            }
        }

        if (allSkins.length === 0) {
            grid.innerHTML = '<div style="color:#666;">NO ITEMS FOUND</div>';
            return;
        }

        allSkins.forEach(skin => {
            // Check ownership
            const isOwned = StoreService.isOwned(skin.id);

            const card = document.createElement('div');
            // If owned, show rarity, otherwise just basic "locked" style
            card.className = `skin-card ${isOwned ? skin.rarity : 'locked-item'}`;

            if (this.selectedSkin && this.selectedSkin.id === skin.id) card.classList.add('selected');

            // Thumb
            const thumb = document.createElement('div');
            thumb.className = 'skin-preview-thumb';
            // Only color if owned
            thumb.style.backgroundColor = isOwned ? skin.colors.base : '#111';
            thumb.style.borderColor = isOwned ? skin.colors.highlight : '#333';
            if (isOwned) thumb.style.boxShadow = `0 0 10px ${skin.colors.glow}`;

            // Name
            const name = document.createElement('div');
            name.className = 'skin-name';
            name.textContent = isOwned ? skin.name : '???';
            name.style.color = isOwned ? '#ccc' : '#555';

            if (!isOwned) {
                const lock = document.createElement('div');
                lock.className = 'lock-overlay';
                lock.innerHTML = '🔒';
                card.appendChild(lock);
            }

            card.appendChild(thumb);
            card.appendChild(name);

            // Pass 'isOwned' to selectSkin so we know how to render preview
            card.addEventListener('click', () => this.selectSkin(skin, card, isOwned));
            grid.appendChild(card);
        });
    },

    selectSkin(skin, cardEl, isOwned) {
        this.selectedSkin = skin;
        this.selectedSkinIsOwned = isOwned;

        const allCards = this.elements.grid.querySelectorAll('.skin-card');
        allCards.forEach(c => c.classList.remove('selected'));
        cardEl.classList.add('selected');

        this.updatePreview(skin, isOwned);
    },

    updatePreview(skin, isOwned) {
        if (isOwned) {
            this.elements.name.textContent = skin.name;
            this.elements.desc.textContent = skin.description;
            // Show stats?
            this.elements.stats.innerHTML = `
                <div style="color: ${skin.colors.highlight}; margin-top:10px;">
                    RARITY: ${skin.rarity.toUpperCase()}
                </div>
            `;
        } else {
            this.elements.name.textContent = "LOCKED PATTERN";
            this.elements.desc.textContent = "This blueprint is encrypted. Acquire it in the Store.";
            this.elements.stats.innerHTML = '';
        }
    },

    startAnimation() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        const loop = () => {
            if (this.elements.modal.classList.contains('hidden')) return;

            if (this.ctx && this.selectedSkin) {
                const time = Date.now() / 1000;
                // Determine type from ID prefix or search
                let type = 'generic';
                // Simple heuristic: id starts with...
                if (this.selectedSkin.id.includes('machine')) type = 'machine';
                else if (this.selectedSkin.id.includes('laser')) type = 'laser';
                else if (this.selectedSkin.id.includes('eco')) type = 'eco';
                else if (this.selectedSkin.id.includes('rail')) type = 'rail';
                else if (this.selectedSkin.id.includes('spawner')) type = 'spawner';

                SkinPreviewRenderer.draw(
                    this.ctx,
                    this.selectedSkin,
                    type,
                    time,
                    !this.selectedSkinIsOwned // isLocked
                );
            } else if (this.ctx) {
                this.ctx.clearRect(0, 0, 260, 260);
            }
            this.animFrame = requestAnimationFrame(loop);
        };
        loop();
    },

    stopAnimation() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
    }
};
