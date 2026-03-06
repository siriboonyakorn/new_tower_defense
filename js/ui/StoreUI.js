/**
 * StoreUI.js
 * Manages the Store/Armory interface.
 */
import { StoreService } from '../modules/StoreService.js';
import { SkinsData } from '../data/SkinsData.js';
import { PlayerService } from '../modules/PlayerService.js';
import { SkinPreviewRenderer } from '../render/SkinPreviewRenderer.js';

export const StoreUI = {
    elements: {},
    activeTab: 'machine', // Default category
    selectedSkin: null,
    ctx: null, // Canvas Context
    animFrame: null,

    init() {
        console.log('[StoreUI] Initializing...');
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            modal: document.getElementById('store-modal'),
            closeBtn: document.getElementById('close-store'),
            openBtn: document.getElementById('btn-shop'),

            tabs: document.querySelectorAll('.store-tab'),
            grid: document.getElementById('skin-grid'),

            // Preview
            // Preview
            renderBox: document.getElementById('preview-render'),
            name: document.getElementById('preview-name'),
            desc: document.getElementById('preview-desc'),
            cost: document.getElementById('preview-cost'),
            actionBtn: document.getElementById('btn-store-action'),

            // Timer (We'll assume we inject this into header or create it)
            timerDisplay: null
        };

        // Create Timer Element if missing
        if (!document.getElementById('store-timer')) {
            const header = this.elements.modal.querySelector('.window-header');
            const timer = document.createElement('span');
            timer.id = 'store-timer';
            timer.style.marginLeft = 'auto';
            timer.style.marginRight = '20px';
            timer.style.fontFamily = 'monospace';
            timer.style.color = '#ffcc00';
            header.insertBefore(timer, this.elements.closeBtn);
            this.elements.timerDisplay = timer;
        } else {
            this.elements.timerDisplay = document.getElementById('store-timer');
        }

        // Initialize Canvas if needed
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

        // Tabs
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.type);
                // Update active state visuals
                this.elements.tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Action Button (Buy/Equip)
        if (this.elements.actionBtn) {
            this.elements.actionBtn.addEventListener('click', () => this.handleAction());
        }
    },

    open() {
        const profile = PlayerService.getCurrentProfile();
        if (!profile || profile.is_anonymous) {
            alert("Please login to access the store.");
            return;
        }

        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
            this.refreshGrid();
            this.startTimer();
            this.startAnimation();
        }
    },

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
            this.stopTimer();
            this.stopAnimation();
        }
    },

    startTimer() {
        this.updateTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    },

    startAnimation() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);

        const loop = () => {
            if (this.elements.modal.classList.contains('hidden')) return;

            // Render Preview
            if (this.selectedSkin && this.ctx) {
                const time = Date.now() / 1000;
                SkinPreviewRenderer.draw(this.ctx, this.selectedSkin, this.activeTab, time);
            } else if (this.ctx) {
                // Clear if nothing selected
                this.ctx.clearRect(0, 0, 260, 260);
            }

            this.animFrame = requestAnimationFrame(loop);
        };
        loop();
    },

    stopAnimation() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
    },

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    },

    updateTimer() {
        const next = StoreService.getNextRefreshTime();
        const now = Date.now();
        const diff = next - now;

        if (diff <= 0) {
            // Logic to refresh if passed
            this.refreshGrid();
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = `REFRESH: ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    },

    switchTab(type) {
        this.activeTab = type;
        this.selectedSkin = null;
        this.resetPreview();
        this.refreshGrid();
    },

    refreshGrid() {
        const grid = this.elements.grid;
        grid.innerHTML = ''; // Clear

        // Use SERVICE to get available filter
        const skins = StoreService.getAvailableSkins(this.activeTab);
        /* const skins = SkinsData[this.activeTab]; -- OLD */

        if (!skins || skins.length === 0) {
            grid.innerHTML = '<div style="color:#666; padding:20px;">NO STOCK AVAILABLE</div>';
            return;
        }

        const profile = PlayerService.getCurrentProfile();
        if (!profile) return;
        const equippedId = profile.equipped_skins ? profile.equipped_skins[this.activeTab] : `default_${this.activeTab}`;

        skins.forEach(skin => {
            const card = document.createElement('div');
            card.className = `skin-card ${skin.rarity}`;
            if (this.selectedSkin && this.selectedSkin.id === skin.id) card.classList.add('selected');
            if (equippedId === skin.id) card.classList.add('equipped');

            const isOwned = StoreService.isOwned(skin.id);

            // Preview square in grid
            const thumb = document.createElement('div');
            thumb.className = 'skin-preview-thumb';
            thumb.style.backgroundColor = skin.colors.base;
            thumb.style.borderColor = skin.colors.highlight;
            thumb.style.boxShadow = `0 0 10px ${skin.colors.glow}`;

            // Name
            const name = document.createElement('div');
            name.className = 'skin-name';
            name.textContent = skin.name;

            // Lock icon if not owned
            if (!isOwned) {
                const lock = document.createElement('div');
                lock.className = 'lock-overlay';
                lock.innerHTML = '🔒';
                card.appendChild(lock);
            }

            card.appendChild(thumb);
            card.appendChild(name);

            card.addEventListener('click', () => this.selectSkin(skin, card));
            grid.appendChild(card);
        });
    },

    selectSkin(skin, cardEl) {
        this.selectedSkin = skin;

        // Highlight in grid
        const allCards = this.elements.grid.querySelectorAll('.skin-card');
        allCards.forEach(c => c.classList.remove('selected'));
        cardEl.classList.add('selected');

        // Update Preview Panel
        this.updatePreview(skin);
    },

    updatePreview(skin) {
        this.elements.name.textContent = skin.name;
        this.elements.desc.textContent = skin.description;
        this.elements.cost.textContent = skin.cost;

        // Render visual
        // const r = this.elements.render;
        // r.style.backgroundColor = skin.colors.base;
        // r.style.border = `2px solid ${skin.colors.highlight}`;
        // r.style.boxShadow = `0 0 20px ${skin.colors.glow}`;
        // RENDERER HANDLES CANVAS NOW

        // Button State
        const btn = this.elements.actionBtn;
        const profile = PlayerService.getCurrentProfile();
        if (!profile) return;
        const isOwned = StoreService.isOwned(skin.id);
        const equippedId = profile.equipped_skins ? profile.equipped_skins[this.activeTab] : null;
        const isEquipped = equippedId === skin.id;

        btn.disabled = false;
        btn.classList.remove('buy', 'equip');

        if (isEquipped) {
            btn.textContent = "EQUIPPED";
            btn.disabled = true;
        } else if (isOwned) {
            btn.textContent = "EQUIP";
            btn.classList.add('equip');
        } else {
            btn.textContent = `BUY FOR ${skin.cost}`;
            btn.classList.add('buy');

            if (profile.neon_tokens < skin.cost) {
                btn.disabled = true;
                btn.textContent = "INSUFFICIENT TOKENS";
            }
        }
    },

    resetPreview() {
        this.elements.name.textContent = "SELECT SKIN";
        this.elements.desc.textContent = "Choose a skin from the grid.";
        this.elements.cost.textContent = "0";
        this.elements.cost.textContent = "0";
        // this.elements.render.style = "";
        this.elements.actionBtn.textContent = "SELECT ITEM";
        this.elements.actionBtn.disabled = true;
    },

    async handleAction() {
        if (!this.selectedSkin) return;

        const isOwned = StoreService.isOwned(this.selectedSkin.id);

        try {
            if (isOwned) {
                // Equip
                await StoreService.equipSkin(this.activeTab, this.selectedSkin.id);
                this.refreshGrid();
                this.updatePreview(this.selectedSkin); // Update button text
                alert(`Equipped ${this.selectedSkin.name}!`);
            } else {
                // Buy
                if (confirm(`Purchase ${this.selectedSkin.name} for ${this.selectedSkin.cost} Tokens?`)) {
                    await StoreService.purchaseSkin(this.selectedSkin.id, this.selectedSkin.cost);
                    this.refreshGrid();
                    this.updatePreview(this.selectedSkin);
                    // Update header tokens via event or reload
                    alert("Purchase successful!");
                }
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
            console.error(err);
        }
    }
};
