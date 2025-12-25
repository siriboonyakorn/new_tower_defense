export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.rect = canvas.getBoundingClientRect();
        this.x = 0;
        this.y = 0;
        this.clicked = false;

        window.addEventListener('resize', () => {
            this.rect = canvas.getBoundingClientRect();
        });

        canvas.addEventListener('mousemove', (e) => {
            this.x = e.clientX - this.rect.left;
            this.y = e.clientY - this.rect.top;
        });

        canvas.addEventListener('mousedown', () => {
            this.clicked = true;
        });

        canvas.addEventListener('mouseup', () => {
            this.clicked = false;
        });
    }

    getMousePos() {
        return { x: this.x, y: this.y };
    }

    hasClicked() {
        if (this.clicked) {
            this.clicked = false;
            return true;
        }
        return false;
    }
}