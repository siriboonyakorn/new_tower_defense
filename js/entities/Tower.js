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
        this.rotation = -Math.PI / 2; // Default facing UP

        // Branching Paths (for Laser)
        this.pathA = 0; // Level in Path A
        this.pathB = 0; // Level in Path B
        this.pathLocked = null; // 'A' or 'B'

        // Special Ability Timers
        this.specialTimer = 0;
    }

    // --- UPGRADE SYSTEM ---
    canUpgrade(path) {
        if (this.type.id !== 'laser') return this.level < 5;

        // Laser Logic
        if (!path) return false;
        const currentPathLevel = path === 'A' ? this.pathA : this.pathB;
        if (currentPathLevel >= 4) return false; // Max level 5 (init + 4 upgrades)

        // Path Lock at Level 3
        if (this.pathLocked && path !== this.pathLocked) return false;

        return true;
    }

    getUpgradeCost(path) {
        if (this.type.id !== 'laser') {
            return Math.floor(this.type.cost * Math.pow(1.5, this.level));
        }

        // Laser Path Cost
        const p = this.type.paths[path];
        const nextLevel = (path === 'A' ? this.pathA : this.pathB);
        return p.levels[nextLevel].cost;
    }

    upgrade(path) {
        if (this.type.id !== 'laser') {
            if (this.level >= 5) return;
            this.level++;
            this.range *= 1.15;
            this.damage *= 1.25;
            this.cooldown *= 0.95;
            this.totalInvested += this.getUpgradeCost();
            return;
        }

        // Laser Upgrade
        if (!this.canUpgrade(path)) return;

        const nextLevelData = this.type.paths[path].levels[path === 'A' ? this.pathA : this.pathB];
        this.totalInvested += nextLevelData.cost;

        if (path === 'A') this.pathA++;
        else this.pathB++;

        // Locking Logic
        if ((this.pathA === 2 || this.pathB === 2) && !this.pathLocked) {
            // Level 3 Lock: Whichever path hits 2 (level 3) first locks the other
            this.pathLocked = path;
        }

        // Apply Stats
        if (nextLevelData.damageMult) this.damage *= nextLevelData.damageMult;
        if (nextLevelData.rangeMult) this.range *= nextLevelData.rangeMult;

        this.level = Math.max(1, this.pathA + 1, this.pathB + 1);
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
        if (this.type.id === 'spawner') {
            this.updateBarracks();
            return;
        }

        const now = Date.now();
        if (now - this.lastShot < this.cooldown) return;

        // 1. Find enemies in range
        const enemiesInRange = this.game.enemies.filter(e => {
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            return Math.sqrt(dx * dx + dy * dy) <= this.range;
        });

        if (enemiesInRange.length === 0) return;

        // 2. Select Primary Target
        let target = this.selectTarget(enemiesInRange);

        // 3. Special Abilities (Path B Lvl 5: Pulse Blast)
        if (this.pathB === 4) {
            this.specialTimer++;
            if (this.specialTimer >= 180) { // Every 3 seconds
                this.firePulseBlast(enemiesInRange);
                this.specialTimer = 0;
            }
        }

        // 4. Fire!
        if (target) {
            this.rotation = Math.atan2(target.y - this.y, target.x - this.x);
            this.shoot(target);
            this.lastShot = now;
        }
    }

    selectTarget(enemies) {
        if (this.targetMode === 'FIRST') return enemies.sort((a, b) => b.pathIndex - a.pathIndex)[0];
        if (this.targetMode === 'LAST') return enemies.sort((a, b) => a.pathIndex - b.pathIndex)[0];
        if (this.targetMode === 'STRONG') return enemies.sort((a, b) => b.hp - a.hp)[0];
        if (this.targetMode === 'WEAK') return enemies.sort((a, b) => a.hp - b.hp)[0];
        return enemies[0];
    }

    shoot(target) {
        if (this.type.id === 'laser') {
            this.fireLaser(target);
            return;
        }

        // Standard Projectile for others
        this.game.projectiles.push({
            x: this.x, y: this.y, target: target, speed: 12, damage: this.damage, color: this.type.color || '#ffff00',
            update: function () {
                if (!this.target || this.target.hp <= 0) { this.markedForDeletion = true; return; }
                const dx = this.target.x - this.x, dy = this.target.y - this.y, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.speed) { this.target.hp -= this.damage; this.markedForDeletion = true; }
                else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
            },
            markedForDeletion: false
        });
    }

    fireLaser(target) {
        // Laser hits instantly
        target.hp -= this.damage;

        // Apply Status Effects
        // Path A: Burn
        if (this.pathA >= 2) target.applyBurn(this.pathA === 4 ? 3 : 1);

        // Path B: Utility
        if (this.pathB >= 2) {
            target.applySlow(0.3);
            if (this.pathB >= 3) target.applyDistortion();
        }

        // Level 2B: Split Shot
        if (this.pathB === 1 || this.pathB >= 3) {
            const others = this.game.enemies.filter(e => e !== target && Math.sqrt(Math.pow(e.x - this.x, 2) + Math.pow(e.y - this.y, 2)) < this.range);
            if (others.length > 0) {
                others[0].hp -= this.damage * 0.5;
                // Visual for split handled in renderer or by a temporary beam object
                this.game.projectiles.push({
                    isBeam: true,
                    from: { x: this.x, y: this.y },
                    to: { x: others[0].x, y: others[0].y },
                    color: '#00ffff',
                    duration: 100,
                    startTime: Date.now(),
                    markedForDeletion: false,
                    update: function () {
                        if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true;
                    }
                });
            }
        }

        // Path B Lvl 4: Chain
        if (this.pathB >= 3) {
            this.fireChain(target, 3); // Chain to 3 more enemies
        }

        // Stellar Lance (5A): Periodic massive shot
        if (this.pathA === 4 && Math.random() < 0.1) {
            target.hp -= this.damage * 5;
            this.game.projectiles.push({
                isBeam: true,
                from: { x: this.x, y: this.y },
                to: { x: target.x, y: target.y },
                color: '#ffaa00',
                width: 6,
                duration: 200,
                startTime: Date.now(),
                markedForDeletion: false,
                update: function () {
                    if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true;
                }
            });
        } else {
            // Standard Beam Visual
            this.game.projectiles.push({
                isBeam: true,
                from: { x: this.x, y: this.y },
                to: { x: target.x, y: target.y },
                color: this.type.color,
                duration: 100,
                startTime: Date.now(),
                markedForDeletion: false,
                update: function () {
                    if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true;
                }
            });
        }
    }

    updateBarracks() {
        const myTroops = this.game.troops.filter(t => t.owner === this);
        if (myTroops.length < 3) {
            const now = Date.now();
            if (now - this.lastShot > 3000) { this.spawnTroop(); this.lastShot = now; }
        }
    }

    spawnTroop() {
        const pathEndIndex = this.game.path.length - 1;
        const startNode = this.game.path[pathEndIndex];
        const startX = startNode.x * this.game.tileSize + this.game.tileSize / 2;
        const startY = startNode.y * this.game.tileSize + this.game.tileSize / 2;
        const troop = new Troop(this.game, startX, startY);
        troop.pathIndex = pathEndIndex;
        troop.owner = this;
        this.game.troops.push(troop);
    }

    fireChain(startEnemy, count) {
        let current = startEnemy;
        let visited = [startEnemy];

        for (let i = 0; i < count; i++) {
            const next = this.game.enemies.find(e =>
                !visited.includes(e) &&
                Math.sqrt(Math.pow(e.x - current.x, 2) + Math.pow(e.y - current.y, 2)) < 80
            );

            if (next) {
                next.hp -= this.damage * 0.4;
                next.applySlow(0.2);
                this.game.projectiles.push({
                    isBeam: true,
                    from: { x: current.x, y: current.y },
                    to: { x: next.x, y: next.y },
                    color: '#00ffff',
                    width: 1,
                    duration: 80,
                    startTime: Date.now(),
                    markedForDeletion: false,
                    update: function () {
                        if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true;
                    }
                });
                visited.push(next);
                current = next;
            } else break;
        }
    }

    firePulseBlast(enemies) {
        enemies.forEach(e => {
            e.hp -= this.damage * 2;
            e.applySlow(0.5, 2000);
            e.applyDistortion(2000);
            e.applyBurn(1, 2000);
        });
        // Pulse Visual (Temporary)
        this.game.projectiles.push({
            isPulse: true,
            x: this.x,
            y: this.y,
            color: '#00ffff',
            radius: this.range,
            duration: 300,
            startTime: Date.now(),
            markedForDeletion: false,
            update: function () {
                if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true;
            }
        });
    }
}

//let goon = new Troop(game, x, y);
//goon.pathIndex = game.path.length - 1; // Start at the end of the path