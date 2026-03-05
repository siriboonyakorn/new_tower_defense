import { Enemy } from '../entities/Enemy.js';
import { ENEMIES } from '../data/enemies.js';
import { EventManager } from '../managers/EventManager.js';
import { MapModifier } from '../managers/MapModifier.js';

/**
 * Handles the logic for waves, spawning, and UI visibility for the skip button.
 */
export function updateWaveLogic(game) {
    if (!game.isWaveActive) return;

    // 1. Spawning Logic
    if (game.spawnQueue.length > 0) {
        game.spawnTimer++;
        const framesToWait = game.currentWaveConfig.interval / 16;
        if (game.spawnTimer >= framesToWait) {
            spawnEnemy(game);
            game.spawnTimer = 0;
        }
    }

    // 2. Wave Completion Check
    if (game.enemies.length === 0 && game.spawnQueue.length === 0) {
        game.isWaveActive = false;
        console.log("Wave Cleared! Auto-starting next wave...");

        if (game.waveIndex < game.waves.length) {
            game.startNextWave();
        } else {
            handleVictory(game);
        }
    }

    // 3. Skip Button Visibility Logic
    updateSkipButtonState(game);

    // 4. Mid-Wave Events (EMP, Shields, etc.)
    // In multiplayer, only the host rolls for events to keep both clients in sync
    const isMultiplayerClient = game.room && !game.isMultiplayerHost;
    const eventResult = isMultiplayerClient ? null : EventManager.update(game);
    if (eventResult) {
        game.notifier.notify(eventResult.message, eventResult.type || 'warning');
        // Broadcast the event to partner so they experience the same effect
        if (game.broadcastGameEvent) game.broadcastGameEvent(eventResult);
    }
    EventManager.cleanup(game);

    // 5. Dynamic Map Zones
    MapModifier.update(game);

    game.waveTimer++;
}

function updateSkipButtonState(game) {
    if (!game.isWaveActive || !game.currentWaveConfig) return;

    const totalEnemies = game.currentWaveConfig.composition.length;
    const remainingToSpawn = game.spawnQueue.length;
    const spawned = totalEnemies - remainingToSpawn;
    const spawnProgress = totalEnemies > 0 ? (spawned / totalEnemies) : 0;

    const skipBtn = document.getElementById('btn-skip-wave');
    if (skipBtn) {
        const canSkip = spawnProgress >= 0.5 &&
            game.waveIndex < game.waves.length &&
            !game.skipUsedThisWave &&
            skipBtn.classList.contains('hidden');

        if (canSkip) {
            skipBtn.classList.remove('hidden');
            skipBtn.innerText = ">> RUSH NEXT WAVE <<";
        }
    }
}

/**
 * Updates all entities: towers, troops, projectiles, and enemies.
 */
export function updateEntities(game) {
    // 1. Troops
    game.troops = game.troops.filter(troop => {
        troop.update();
        return !troop.markedForDeletion;
    });

    // 2. Towers
    game.towers.forEach(tower => tower.update());

    // 3. Projectiles
    game.projectiles = game.projectiles.filter(proj => {
        proj.update();
        return !proj.markedForDeletion;
    });

    // 4. Enemies
    game.enemies = game.enemies.filter(enemy => {
        if (enemy.hp <= 0) {
            const killReward = Math.floor((enemy.reward || enemy.type.reward) * game.getCreditMultiplier());
            game.credits += killReward;
            game.broadcastCredits();
            handleEnemyDeathEffects(game, enemy);
            game.updateResourceDisplay();
            return false;
        }

        const active = enemy.update();
        if (!active) {
            handleBaseHit(game, enemy);
            return false;
        }
        return true;
    });
}

export function spawnEnemy(game) {
    if (game.spawnQueue.length === 0) return;
    const typeKey = game.spawnQueue.shift();
    const typeConfig = ENEMIES[typeKey];

    if (!typeConfig) {
        console.error(`CRITICAL: Enemy type '${typeKey}' not defined!`);
        return;
    }

    const enemy = new Enemy(
        game,
        typeKey,
        typeConfig,
        game.path[0].x * game.tileSize + game.tileSize / 2,
        game.path[0].y * game.tileSize + game.tileSize / 2
    );

    game.enemies.push(enemy);

    // Scale HP for co-op balance: more players = tougher enemies
    const hpScale = game.getEnemyHpScale();
    if (hpScale !== 1) {
        enemy.hp = Math.ceil(enemy.hp * hpScale);
        enemy.maxHp = enemy.hp;
    }
}

export function handleEnemyDeathEffects(game, enemy) {
    if (enemy.effects.burn.stacks >= 5) {
        game.enemies.forEach(other => {
            if (other === enemy) return;
            const dist = Math.sqrt(Math.pow(other.x - enemy.x, 2) + Math.pow(other.y - enemy.y, 2));
            if (dist < 60) {
                other.applyBurn(2);
            }
        });
    }
}

export function handleBaseHit(game, enemy) {
    // FIX: Damage equals remaining HP (prevents 13 HP enemy dealing 1 dmg)
    const damage = Math.ceil(enemy.hp);
    game.lives -= damage;
    console.log(`Base taken ${damage} damage! Lives: ${game.lives}`);
    game.updateResourceDisplay();

    if (game.lives <= 0) {
        game.lives = 0;
        gameOver(game);
    }
}

export function handleVictory(game) {
    console.log("Victory!");
    if (typeof game.victory === 'function') {
        game.victory();
    }
}

export function gameOver(game) {
    console.log("Game Over!");
    if (typeof game.gameOver === 'function') {
        game.gameOver();
    }
}


