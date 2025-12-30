export class InputHandler {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.init();
    }

    init() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.game.mouse.x = e.clientX - rect.left;
            this.game.mouse.y = e.clientY - rect.top;
            
            // Snap to grid
            this.game.hoveredTile.x = Math.floor(this.game.mouse.x / this.game.tileSize) * this.game.tileSize;
            this.game.hoveredTile.y = Math.floor(this.game.mouse.y / this.game.tileSize) * this.game.tileSize;
        });

        this.canvas.addEventListener('click', () => {
            if (this.game.selectedTowerType) {
                this.game.placeTower();
            }
        });
    }
}