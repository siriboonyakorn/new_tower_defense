export class Navigation {
    constructor() {
        this.coverScreen = document.getElementById('cover-screen');
        this.menuScreen = document.getElementById('menu-screen');
        this.launchBtn = document.getElementById('launch-btn');

        this.init();
    }

    init() {
        this.launchBtn.addEventListener('click', () => {
            this.goToMenu();
        });
    }

    goToMenu() {
        this.coverScreen.classList.remove('active-screen');
        this.coverScreen.classList.add('hidden-screen');
        
        this.menuScreen.style.display = 'flex';
        
        setTimeout(() => {
            this.menuScreen.classList.remove('hidden-screen');
            this.menuScreen.classList.add('active-screen');
        }, 50);
    }
}