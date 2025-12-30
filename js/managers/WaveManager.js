import { WAVES } from '../data/waves.js';
import { ENEMIES } from '../data/enemies.js';

export class WaveManager {
    constructor(game) {
        this.game = game; // Reference to main game
        this.waveIndex = 0;
        this.isWaveActive = false;
        this.waveTimer = 0;
        this.enemiesRemainingToSpawn = 0;
        this.spawnTimer = 0;
        this.currentWaveConfig = null;

        // Grab Buttons
        this.startBtn = document.getElementById('btn-start-wave');
        this.skipBtn = document.getElementById('btn-skip-wave');
        
        // Listeners
        if(this.startBtn) this.startBtn.onclick = () => this.startNextWave();
        if(this.skipBtn) this.skipBtn.onclick = () => this.startNextWave();
    }

    startNextWave() {
        if (this.waveIndex >= WAVES.length) {
            console.log("ALL WAVES COMPLETE");
            return;
        }

        this.currentWaveConfig = WAVES[this.waveIndex];
        this.enemiesRemainingToSpawn = this.currentWaveConfig.count;
        this.spawnTimer = 0;
        this.isWaveActive = true;
        this.waveTimer = 0;

        // Reward
        this.game.credits += this.currentWaveConfig.reward;
        this.game.ui.updateResourceDisplay(); // Use UI Manager

        // Update UI
        this.waveIndex++;
        document.getElementById('res-wave').innerText = this.waveIndex;
        
        this.startBtn.classList.add('hidden');
        this.skipBtn.classList.add('hidden');
    }

    update() {
        if (!this.isWaveActive) return;

        // 1. Spawning
        if (this.enemiesRemainingToSpawn > 0) {
            this.spawnTimer++;
            const framesToWait = this.currentWaveConfig.interval / 16;
            if (this.spawnTimer >= framesToWait) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
        } else if (this.game.enemies.length === 0) {
            // Wave Complete
            this.isWaveActive = false;
            this.startBtn.classList.remove('hidden');
            this.startBtn.innerText = `START WAVE ${this.waveIndex + 1}`;
            this.skipBtn.classList.add('hidden');
        }

        // 2. Skip Button Logic
        this.waveTimer++;
        if (this.waveTimer > 600 && this.game.enemies.length > 0) {
            this.skipBtn.classList.remove('hidden');
        }
    }

    spawnEnemy() {
        const typeConfig = ENEMIES[this.currentWaveConfig.type];
        const enemy = {
            id: Math.random(),
            type: typeConfig,
            // Use Game Path
            x: this.game.path[0].x * this.game.tileSize + this.game.tileSize/2,
            y: this.game.path[0].y * this.game.tileSize + this.game.tileSize/2,
            pathIndex: 0,
            hp: typeConfig.hp,
            maxHp: typeConfig.hp,
            speed: typeConfig.speed,
            frozen: false
        };
        this.game.enemies.push(enemy);
        this.enemiesRemainingToSpawn--;
    }
}