import { Enemy } from '../entities/Enemy.js';
import { levels } from '../data/levels.js';

export class WaveManager {
    constructor() {
        this.currentLevel = levels[0];
        this.waveIndex = 0;
        this.enemiesSpawned = 0;
        this.timeSinceLastSpawn = 0;
        this.isWaveActive = true;
    }

    update(deltaTime, entities) {
        if (!this.isWaveActive) return;

        const currentWaveData = this.currentLevel.waves[this.waveIndex];

        if (this.enemiesSpawned < currentWaveData.count) {
            this.timeSinceLastSpawn += deltaTime;

            if (this.timeSinceLastSpawn >= currentWaveData.interval) {
                this.spawnEnemy(entities, currentWaveData);
                this.timeSinceLastSpawn = 0;
            }
        } else {
            const enemiesAlive = entities.some(e => e instanceof Enemy && e.active);
            if (!enemiesAlive) {
                this.waveIndex++;
                this.enemiesSpawned = 0;
                if (this.waveIndex >= this.currentLevel.waves.length) {
                    this.isWaveActive = false;
                    console.log('Level Complete');
                }
            }
        }
    }

    spawnEnemy(entities, stats) {
        const enemy = new Enemy(this.currentLevel.path, stats);
        entities.push(enemy);
        this.enemiesSpawned++;
    }
}