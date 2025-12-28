export class Game {
    constructor(levelId) {
        this.levelId = levelId;
        this.isRunning = false;
        console.log(`System: Game Engine Initialized for ${levelId}`);
        
        this.start();
    }

    start() {
        this.isRunning = true;
        // This is where we will eventually put the spawning logic
        console.log("System: Combat Loop Started.");
    }

    stop() {
        this.isRunning = false;
    }
}