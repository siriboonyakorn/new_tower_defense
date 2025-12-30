// js/entities/Troop.js

export class Troop {
    constructor(game, x, y, pathIndex) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.pathIndex = pathIndex; 
        
        // Stats
        this.hp = 10;   // Low HP (it's a bomb)
        this.maxHp = 10;
        
        this.damage = 50; // MASSIVE damage (Suicide attack)
        this.range = 20;  // Range to detonate
        this.speed = 3;   // Fast movement
        
        this.color = '#ff0000'; // Red for danger/suicide
        this.radius = 10;
        this.markedForDeletion = false;
    }

    update() {
        if (this.hp <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // 1. Check for collision with ANY enemy
        const enemy = this.findEnemy();
        
        if (enemy) {
            this.explode(enemy);
        } else {
            this.move();
        }
    }

    findEnemy() {
        for (const enemy of this.game.enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // If we are close enough, BOOM
            if (dist < this.range) {
                return enemy;
            }
        }
        return null;
    }

    explode(enemy) {
        // 1. Deal massive damage to the enemy
        enemy.hp -= this.damage;
        
        // 2. Kill the troop instantly (Suicide)
        this.hp = 0; 
        this.markedForDeletion = true;

        console.log("BOOM! Suicide troop detonated.");
    }

    move() {
        // Walk towards the START of the path (Index 0)
        const target = this.game.path[this.pathIndex - 1];
        
        // If we reach the enemy spawn and hit nothing, disappear
        if (!target) {
            this.hp = 0; 
            return;
        }

        const tx = target.x * this.game.tileSize + this.game.tileSize/2;
        const ty = target.y * this.game.tileSize + this.game.tileSize/2;
        
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < this.speed) {
            this.x = tx; 
            this.y = ty;
            this.pathIndex--; 
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }
}