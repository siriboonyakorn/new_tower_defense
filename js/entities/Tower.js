// js/entities/Tower.js
import { Troop } from './Troop.js';

export class Tower {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        let cd = type.cooldown || 1000; 
        if (cd < 10) cd *= 1000;
        // Stats
        this.level = 1;
        this.range = type.range;
        this.damage = type.damage;
        this.cooldown = type.cooldown;
        this.lastShot = 0;
        
        // Economy & Targeting
        this.cost = type.cost;
        this.totalInvested = type.cost; // Tracks total money spent for selling
        this.targetMode = 'FIRST'; // Default mode
        this.targetModes = ['FIRST', 'LAST', 'STRONG', 'WEAK'];
    }

    // --- UPGRADE SYSTEM ---
    canUpgrade() {
        return this.level < 5;
    }

    getUpgradeCost() {
        // Cost increases by 50% per level
        return Math.floor(this.type.cost * Math.pow(1.5, this.level));
    }

    upgrade() {
        if (this.level >= 5) return;

        this.level++;
        this.range *= 1.15;  // +15% Range
        this.damage *= 1.25; // +25% Damage
        this.cooldown *= 0.95; // -5% Cooldown (Faster)
        
        // Update Value
        this.totalInvested += this.getUpgradeCost();
    }

    getSellValue() {
        return Math.floor(this.totalInvested * 0.7); // 70% Refund
    }

    // --- TARGETING SYSTEM ---
    cycleTargetMode() {
        const currentIndex = this.targetModes.indexOf(this.targetMode);
        const nextIndex = (currentIndex + 1) % this.targetModes.length;
        this.targetMode = this.targetModes[nextIndex];
        return this.targetMode;
    }

    update() {

        if (this.type.name.toUpperCase().includes('BARRACKS')) {
            this.updateBarracks();
            return; 
        }

        if (Math.random() < 0.01) console.log("Tower Debug:", this.type.name, this.cooldown); 
        const now = Date.now();
        // Cooldown Check
        if (now - this.lastShot < this.cooldown) return;

        // 1. Find enemies in range
        const enemiesInRange = this.game.enemies.filter(e => {
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            return Math.sqrt(dx*dx + dy*dy) <= this.range;
        });

        if (enemiesInRange.length === 0) return;

        // 2. Sort enemies based on Target Mode
        let target = null;
        
        if (this.targetMode === 'FIRST') {
            // Highest pathIndex = furthest along path
            target = enemiesInRange.sort((a, b) => b.pathIndex - a.pathIndex)[0];
        } else if (this.targetMode === 'LAST') {
            target = enemiesInRange.sort((a, b) => a.pathIndex - b.pathIndex)[0];
        } else if (this.targetMode === 'STRONG') {
            // Highest HP
            target = enemiesInRange.sort((a, b) => b.hp - a.hp)[0];
        } else if (this.targetMode === 'WEAK') {
            // Lowest HP
            target = enemiesInRange.sort((a, b) => a.hp - b.hp)[0];
        }

        // 3. Fire!
        if (target) {
            this.shoot(target);
            this.lastShot = now;
        }
    }
    

    shoot(target) {
        // Create the projectile
        this.game.projectiles.push({
            x: this.x, 
            y: this.y,
            target: target,
            speed: 12, // How fast the bullet flies
            damage: this.damage,
            color: this.type.color || '#ffff00', // Default to yellow if missing
            
            // --- THE MISSING LOGIC ---
            update: function() {
                // 1. Check if target is dead or gone (prevent crash)
                if (!this.target || this.target.hp <= 0) {
                    this.markedForDeletion = true;
                    return;
                }

                // 2. Calculate distance to target
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                // 3. Hit Detection
                if (dist < this.speed) {
                    // We hit them!
                    this.target.hp -= this.damage;
                    this.markedForDeletion = true;
                } else {
                    // 4. Move Bullet
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
            },
            
            markedForDeletion: false
        });
    }
    updateBarracks() {
        // 1. Check if we need to spawn
        // Let's say a Barracks keeps 3 troops alive.
        
        // Filter troops that belong to THIS tower
        // (We attach an 'owner' tag to the troop to track this)
        const myTroops = this.game.troops.filter(t => t.owner === this);

        if (myTroops.length < 3) {
            const now = Date.now();
            // Spawn one every 3 seconds
            if (now - this.lastShot > 3000) {
                this.spawnTroop();
                this.lastShot = now;
            }
        }
    }

    spawnTroop() {
        // 1. Get the very last point of the path (The Base)
        const pathEndIndex = this.game.path.length - 1;
        const startNode = this.game.path[pathEndIndex];

        // 2. Calculate pixel coordinates (assuming grid size 60 or tileSize)
        // We use the same math as the game engine uses for enemies
        const startX = startNode.x * this.game.tileSize + this.game.tileSize/2;
        const startY = startNode.y * this.game.tileSize + this.game.tileSize/2;

        // 3. Create the Kamikaze Troop at the BASE
        const troop = new Troop(this.game, startX, startY);
        
        // 4. Tell the troop where to start in the path array (The End)
        troop.pathIndex = pathEndIndex; 
        troop.owner = this;

        this.game.troops.push(troop);
    }
}