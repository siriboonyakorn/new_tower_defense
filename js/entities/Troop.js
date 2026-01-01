// js/entities/Troop.js

export class Troop {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        
        // Movement: Starts at the end of the path
        this.pathIndex = 0; // Will be set by Tower.js
        this.speed = 4;     // Fast!
        
        // Combat
        this.damage = 500;  // High damage (Instant kill for weak enemies)
        this.radius = 15;   // Hitbox size
        this.color = '#ff0000'; // Red = Danger
        
        this.markedForDeletion = false;
    }

    update() {
        // --- 1. MOVEMENT (Reverse Pathing) ---
        // We want to go to pathIndex - 1 (Backwards towards start)
        const targetNode = this.game.path[this.pathIndex - 1];

        if (!targetNode) {
            // Reached the very start of the map (Enemy Spawn)
            this.markedForDeletion = true; // Despawn
            return;
        }

        const tx = targetNode.x * this.game.tileSize + this.game.tileSize/2;
        const ty = targetNode.y * this.game.tileSize + this.game.tileSize/2;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < this.speed) {
            // Reached the waypoint, target the next one backwards
            this.x = tx;
            this.y = ty;
            this.pathIndex--; 
        } else {
            // Move smoothly
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        // --- 2. KAMIKAZE COLLISION CHECK ---
        // Check if we touched ANY enemy
        for (const enemy of this.game.enemies) {
            const ex = enemy.x - this.x;
            const ey = enemy.y - this.y;
            const collisionDist = Math.sqrt(ex*ex + ey*ey);

            // If we touch an enemy...
            if (collisionDist < (this.radius + enemy.type.radius)) {
                this.explode(enemy);
                break; // Stop checking after hitting one
            }
        }
    }

    explode(enemy) {
        // 1. Deal massive damage
        enemy.hp -= this.damage;

        // 2. Visual Effect (Screen Shake or Flash)
        // (Optional: Draw an explosion in Renderer later)
        
        // 3. Suicide (Remove this troop)
        this.markedForDeletion = true;
    }
}