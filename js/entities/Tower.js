import { Troop } from './Troop.js';
import { SynergyManager } from '../managers/SynergyManager.js';
import { notifier } from '../managers/NotificationManager.js';
import { AdaptationManager } from '../managers/AdaptationManager.js';
import { DailyModifier } from '../managers/DailyModifier.js';

export class Tower {
    constructor(game, x, y, type) {
        this.game = game;
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.type = type;

        // DEBUG: Check for Pollution
        if (type.pathA || type.pathB || type.level) {
            console.error(`CRITICAL: TOWER TYPE POLLUTED! Type ${type.id} has rogue properties:`,
                type.pathA, type.pathB, type.level);
        }

        // Fix: Define cd from type.cooldown
        let cd = type.cooldown;

        // Cooldown safety check
        if (cd < 10) cd *= 1000;

        // Apply Daily Modifiers
        const towerMods = DailyModifier.getTowerModifiers();

        // Ensure stats are instance-based
        this.level = 1;
        this.range = type.range * towerMods.range;
        this.damage = type.damage * towerMods.damage;
        this.cooldown = cd;
        this.lastShot = 0;
        this.shotsFired = 0; // For Machine Gun proc
        this.income = type.income || 0; // For Eco

        this.cost = type.cost;
        this.totalInvested = type.cost;
        this.targetMode = 'FIRST';
        this.targetModes = ['FIRST', 'LAST', 'STRONG', 'WEAK'];
        this.rotation = -Math.PI / 2;

        // Upgrade Paths - FORCE RESET
        this.pathA = 0;
        this.pathB = 0;
        this.pathLocked = null;

        // Buff System (for Eco Tower B)
        this.buffs = { speed: 1, damage: 1, range: 1 };

        // Overclock System
        this.isOverclocked = false;
        this.overclockEndTime = 0;
        this.isDisabled = false;
        this.disabledEndTime = 0;
        this.markedForDeletion = false; // For sacrifice

        // Target filtering (Air/Ground)
        this.targetsAir = type.targets?.includes('air') ?? true;
        this.targetsGround = type.targets?.includes('ground') ?? true;
    }

    update() {
        // Reset Buffs every frame (they get reapplied by Eco towers)
        this.buffs = { speed: 1, damage: 1, range: 1 };

        // Check overclock/disable timers
        const now = Date.now();
        if (this.isOverclocked && now > this.overclockEndTime) {
            this.isOverclocked = false;
            this.isDisabled = true;
            this.disabledEndTime = now + 10000; // 10 second cooldown
            notifier.notify(`${this.type.name} OFFLINE (OVERHEATED)`, 'danger');
            console.log(`[Tower] ${this.type.name} overclock ended, now disabled`);
        }
        if (this.isDisabled && now > this.disabledEndTime) {
            this.isDisabled = false;
            notifier.notify(`${this.type.name} REBOOTED`, 'success');
            console.log(`[Tower] ${this.type.name} re-enabled`);
        }

        // Skip all logic if disabled
        if (this.isDisabled) return;

        // MANUAL TOWERS (COMMANDER) do not auto-shoot
        if (this.type.id === 'commander') {
            return;
        }

        if (this.type.id === 'spawner') {
            this.updateBarracks();
            return;
        }

        // Eco Logic
        if (this.type.id === 'eco') {
            if (this.pathB > 0) this.applyBuffs();
            return;
        }

        // Apply Cooldown (affected by buffs)
        const actualCooldown = this.cooldown / this.buffs.speed;

        // RETARGETING FIX: Always look for the best target every frame
        // This ensures towers switch to "First" or "Strong" targets immediately
        this.findTarget();

        if (Date.now() - this.lastShot >= actualCooldown) {
            if (this.target) {
                this.shoot();
                this.lastShot = Date.now();
            }
        }

        // Rotation
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
        }
    }

    // --- ECO TOWER LOGIC (Path B: Command Beacon) ---
    applyBuffs() {
        // Find towers in range
        this.game.towers.forEach(t => {
            if (t !== this && this.distanceTo(t) <= this.range && t.type.id !== this.type.id) {
                // Apply buffs based on Path B Level
                if (this.pathB >= 2) t.buffs.range = Math.max(t.buffs.range, 1.2); // +20% Range
                if (this.pathB >= 3) t.buffs.speed = Math.max(t.buffs.speed, 1.2); // +20% Speed
                if (this.pathB >= 4) t.buffs.damage = Math.max(t.buffs.damage, 1.25); // +25% Damage
                if (this.pathB >= 5) { // Ultimate Buff
                    t.buffs.speed = Math.max(t.buffs.speed, 1.5);
                    t.buffs.damage = Math.max(t.buffs.damage, 1.5);
                }
            }
        });
    }

    findTarget() {
        const enemies = this.game.enemies;
        let bestCandidate = null;
        let bestValue = (this.targetMode === 'LAST' || this.targetMode === 'WEAK') ? Infinity : -Infinity;
        const actualRange = this.range * this.buffs.range;

        for (const enemy of enemies) {
            // Target Filtering: Skip if tower cannot hit this type
            if (enemy.isAir && !this.targetsAir) continue;
            if (!enemy.isAir && !this.targetsGround) continue;

            if (this.distanceTo(enemy) <= actualRange) {
                let val;
                switch (this.targetMode) {
                    case 'FIRST': val = enemy.pathIndex; break;
                    case 'LAST': val = enemy.pathIndex; break;
                    case 'STRONG': val = enemy.hp; break;
                    case 'WEAK': val = enemy.hp; break;
                    default: val = enemy.pathIndex;
                }
                if (this.targetMode === 'LAST' || this.targetMode === 'WEAK') {
                    if (val < bestValue) { bestValue = val; bestCandidate = enemy; }
                } else {
                    if (val > bestValue) { bestValue = val; bestCandidate = enemy; }
                }
            }
        }
        this.target = bestCandidate;
    }

    shoot() {
        if (!this.target) return;

        // Apply Damage Buffs & Adaptation Penalty
        const adaptationMult = AdaptationManager.getDamageMultiplier(this.type.id);
        const actualDamage = this.damage * this.buffs.damage * adaptationMult;

        // Track damage in AdaptationManager
        AdaptationManager.trackDamage(this.type.id, actualDamage);

        // --- LASER ---
        if (this.type.id === 'laser') {
            // SHIELDED adaptation enemies have laserResist (0–1 = % damage reduction)
            const laserDmg = actualDamage * (1 - (this.target.type.laserResist || 0));
            this.target.takeDamage(laserDmg);
            if (this.pathA >= 2) this.target.applyBurn(this.pathA === 4 ? 3 : 1);
            if (this.pathB >= 2) this.target.applySlow(0.3);

            // Visual
            this.createBeam(this.target, this.type.color);

            // Laser Chain (Path B Lvl 5)
            if (this.pathB >= 5) this.fireChain(this.target, 3, actualDamage);
            return;
        }

        // --- MACHINE GUN ---
        if (this.type.id === 'machine') {
            this.shotsFired++;

            // Standard Bullet
            this.createProjectile(this.target, 15, actualDamage, '#ffcc00');

            // Path B: Missile Pods
            if (this.pathB >= 3) {
                const triggerCount = (this.pathB >= 5) ? 5 : 10; // Fire missile every 5 or 10 shots
                if (this.shotsFired % triggerCount === 0) {
                    this.fireMissile(this.target, actualDamage * 2);
                }
            }
            return;
        }

        // --- RAILGUN ---
        if (this.type.id === 'rail') {
            let finalDamage = actualDamage;

            // Path A: Assassin (Crit & Execute)
            if (this.pathA >= 3 && Math.random() < 0.25) finalDamage *= 2; // Crit
            if (this.pathA >= 5 && this.target.hp > this.target.maxHp * 0.5) finalDamage *= 1.5; // Execute bonus

            // SYNERGY BONUS: Check for burn/slow combos
            const synergy = SynergyManager.calculateBonus('rail', this.target, finalDamage);
            finalDamage = synergy.damage;

            // Instant hit visual (Railgun is near instant)
            this.createBeam(this.target, '#00ccff', 4); // Thick beam
            this.target.takeDamage(finalDamage);

            // Path B: Chain Lightning
            if (this.pathB >= 3) {
                const chainCount = (this.pathB >= 5) ? 10 : 3;
                this.fireChain(this.target, chainCount, finalDamage * 0.6);
            }
            return;
        }

        // --- FLAK CANNON (Anti-Air) ---
        if (this.type.id === 'flak') {
            this.createProjectile(this.target, 20, actualDamage, '#ffaa00');
            // NOTE: Flak could have splash damage too if we want to be fancy
            if (this.pathB >= 2) {
                // Fragment/Splash effect logic would go here
            }
            return;
        }
    }

    createProjectile(target, speed, damage, color) {
        this.game.projectiles.push({
            x: this.x, y: this.y,
            target: target, speed: speed, damage: damage, color: color,
            radius: 3,
            update: function () {
                if (!this.target || this.target.hp <= 0) { this.markedForDeletion = true; return; }
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.speed) {
                    this.target.takeDamage(this.damage);
                    this.markedForDeletion = true;
                } else {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
            },
            markedForDeletion: false
        });
    }

    createBeam(target, color, width = 2) {
        this.game.projectiles.push({
            isBeam: true,
            from: { x: this.x, y: this.y },
            to: { x: target.x, y: target.y },
            color: color, width: width, duration: 80,
            startTime: Date.now(), markedForDeletion: false,
            update: function () { if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true; }
        });
    }

    fireMissile(target, dmg) {
        this.game.projectiles.push({
            x: this.x, y: this.y, target: target,
            speed: 8, damage: dmg, color: '#ff4400', radius: 6,
            isMissile: true, // Tag for renderer if you want to draw a rocket
            update: function () {
                if (!this.target || this.target.hp <= 0) { this.markedForDeletion = true; return; }
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.speed) {
                    this.target.takeDamage(this.damage);
                    // Visual explosion (handled in renderer ideally, but logic here)
                    this.markedForDeletion = true;
                } else {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
            },
            markedForDeletion: false
        });
    }

    fireChain(startEnemy, count, dmg) {
        let current = startEnemy;
        let visited = [startEnemy];
        for (let i = 0; i < count; i++) {
            const next = this.game.enemies.find(e =>
                !visited.includes(e) &&
                Math.sqrt(Math.pow(e.x - current.x, 2) + Math.pow(e.y - current.y, 2)) < 150
            );
            if (next) {
                next.takeDamage(dmg);
                // Chain Visual
                this.game.projectiles.push({
                    isBeam: true, from: { x: current.x, y: current.y }, to: { x: next.x, y: next.y },
                    color: '#00ccff', width: 2, duration: 100, startTime: Date.now(),
                    update: function () { if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true; }
                });
                visited.push(next);
                current = next;
            } else break;
        }
    }

    // --- SPAWNER LOGIC ---
    updateBarracks() {
        const myTroops = this.game.troops.filter(t => t.owner === this);
        const maxTroops = (this.pathB >= 5) ? 6 : 3; // Carrier (5B) allows more troops
        const actualCooldown = (this.cooldown / this.buffs.speed);

        if (myTroops.length < maxTroops) {
            if (Date.now() - this.lastShot > actualCooldown) {
                this.spawnTroop();
                // Double spawn for Carrier
                if (this.pathB >= 5) setTimeout(() => this.spawnTroop(), 200);
                this.lastShot = Date.now();
            }
        }
    }

    spawnTroop() {
        if (!this.game.path || this.game.path.length === 0) return;
        const pathEndIndex = this.game.path.length - 1;
        const startNode = this.game.path[pathEndIndex];
        const startX = startNode.x * this.game.tileSize + this.game.tileSize / 2;
        const startY = startNode.y * this.game.tileSize + this.game.tileSize / 2;

        const troop = new Troop(this.game, startX, startY);
        troop.pathIndex = pathEndIndex;
        troop.owner = this;

        // Apply Upgrades
        // Path A: Mech Foundry
        if (this.pathA >= 2) troop.maxHp *= 1.5; // Steel
        if (this.pathA >= 3) troop.damage *= 1.5; // Plasma

        if (this.pathA === 4) {
            troop.modelType = 'mech';
            troop.radius = 12;
            troop.color = '#8899ff';
        }
        if (this.pathA >= 5) {
            troop.modelType = 'titan';
            troop.maxHp *= 2;
            troop.damage *= 2;
            troop.radius = 18;
            troop.color = '#5566ff';
        }

        // Path B: Drone Swarm
        if (this.pathB >= 2) troop.speed *= 1.4; // Rapid Fab

        if (this.pathB >= 3 && this.pathB < 5) {
            troop.modelType = 'drone';
            troop.isAir = true;
            troop.radius = 8;
            troop.color = '#ffcc00';
            troop.speed *= 1.3;
        }

        if (this.pathB >= 5) {
            troop.modelType = 'carrier';
            troop.isAir = true;
            troop.radius = 10;
            troop.color = '#ffff00';
            troop.speed *= 1.5;
        }

        this.game.troops.push(troop);
    }

    // --- UPGRADE CORE ---
    canUpgrade(path) {
        if (!path) return this.level < 5;

        // Get the path data
        const pathData = this.type.paths[path];
        if (!pathData) return false;

        const myTier = path === 'A' ? this.pathA : this.pathB; // Count of upgrades (0 to 4)
        const otherTier = path === 'A' ? this.pathB : this.pathA;

        // BTD6 Rule: Only one path can exceed Tier 2 (Level 3)
        // If you are trying to reach Tier 3 (Level 4), the other path must be Tier 2 or less.
        if (myTier === 2 && otherTier > 2) return false;

        // If you are trying to reach Tier 1 or 2, you can ALWAYS do it (up to Level 3)
        // If you are trying to reach Tier 3, 4, or 5 (Level 4, 5, etc), you can only if other path is <= Tier 2.

        // Max Tier for ANY path is Tier 4 (Level 5)
        return myTier < 4;
    }

    getUpgradeCost(path) {
        // Standard Upgrade (No Path)
        if (!path) {
            // Assuming standard upgrades follow a simple cost formula or fixed array
            // Since TOWER_TYPES structure implies paths, we might need to fallback or assume Path A/B are only for Laser
            // For now, let's assume standard towers use a basic formula if no paths exist
            if (this.type.paths) return 0; // Should use path
            return Math.floor(this.cost * 1.5 * this.level);
        }

        const p = this.type.paths[path];
        if (!p) return 0;

        const nextLevel = (path === 'A' ? this.pathA : this.pathB);
        return p.levels[nextLevel] ? p.levels[nextLevel].cost : 0;
    }

    upgrade(path) {
        if (!this.canUpgrade(path)) return;

        console.log(`Upgrading Tower ${this.id} (${this.type.name}) - Path ${path}`);

        const pathData = this.type.paths[path];
        const levelIndex = path === 'A' ? this.pathA : this.pathB;
        const levelData = pathData.levels[levelIndex];

        this.totalInvested += levelData.cost;

        if (path === 'A') this.pathA++;
        else this.pathB++;
        console.log(`DEBUG: Tower ${this.id} Path ${path} incremented to ${path === 'A' ? this.pathA : this.pathB}`);

        // NO PATH LOCKING - Both paths can be upgraded independently up to their max levels

        // Apply Generic Stat Multipliers defined in data
        if (levelData.damageMult) this.damage *= levelData.damageMult;
        if (levelData.rangeMult) this.range *= levelData.rangeMult;
        if (levelData.cooldownMult) this.cooldown *= levelData.cooldownMult;
        if (levelData.incomeMult) this.income *= levelData.incomeMult;

        this.level = Math.max(1, this.pathA + 1, this.pathB + 1);
    }

    getSellValue() {
        return Math.floor(this.totalInvested * 0.7);
    }

    distanceTo(target) {
        const dx = this.x - target.x;
        const dy = this.y - target.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    cycleTargetMode() {
        const currentIndex = this.targetModes.indexOf(this.targetMode);
        const nextIndex = (currentIndex + 1) % this.targetModes.length;
        this.targetMode = this.targetModes[nextIndex];
        return this.targetMode;
    }

    /**
     * Overclock: +100% fire rate for 5 seconds, then disabled for 10 seconds
     */
    overclock() {
        if (this.isOverclocked || this.isDisabled) {
            console.log('[Tower] Cannot overclock - already active or disabled');
            return false;
        }

        this.isOverclocked = true;
        this.overclockEndTime = Date.now() + 5000; // 5 second boost
        this.buffs.speed = 2; // Double fire rate
        notifier.notify(`${this.type.name} OVERCLOCKED!`, 'warning');
        console.log(`[Tower] ${this.type.name} OVERCLOCKED!`);
        return true;
    }

    /**
     * Sacrifice: Deal massive damage to all enemies in range, then destroy tower
     */
    sacrifice() {
        if (this.isDisabled) return false;

        const sacrificeDamage = this.damage * 10; // 10x damage
        const actualRange = this.range * this.buffs.range;

        // Damage all enemies in range
        let hits = 0;
        for (const enemy of this.game.enemies) {
            if (this.distanceTo(enemy) <= actualRange) {
                enemy.takeDamage(sacrificeDamage);
                hits++;
            }
        }

        console.log(`[Tower] ${this.type.name} SACRIFICED! Hit ${hits} enemies for ${sacrificeDamage} each`);

        // Mark for deletion
        this.markedForDeletion = true;
        return true;
    }

    /**
     * Manual Fire for Skill-Based Towers (COMMANDER)
     * @param {number} x - Target X coordinate
     * @param {number} y - Target Y coordinate
     */
    manualFire(x, y) {
        if (this.isDisabled || Date.now() - this.lastShot < this.cooldown) {
            console.log("Commander tower on cooldown or disabled");
            return false;
        }

        console.log(`[Tower] COMMANDER Firing at ${x}, ${y}`);
        this.lastShot = Date.now();

        // Visual: Beam from sky
        this.game.projectiles.push({
            isBeam: true,
            from: { x: x, y: y - 500 }, // From sky
            to: { x: x, y: y },
            color: '#ff3333', width: 6, duration: 500,
            startTime: Date.now(), markedForDeletion: false,
            update: function () {
                if (Date.now() - this.startTime > this.duration) this.markedForDeletion = true;
            }
        });

        // Effect: Explosion
        const radius = (this.pathB >= 2) ? 120 : 60; // Larger AOE with upgrades
        let hitCount = 0;

        this.game.enemies.forEach(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= radius) {
                const adaptationMult = AdaptationManager.getDamageMultiplier('commander');
                let damage = this.damage * this.buffs.damage * adaptationMult;

                // Path A Bonuses
                if (this.pathA >= 2) damage *= 1.5;
                if (this.pathA >= 4) damage *= 2.0;

                enemy.takeDamage(damage);
                AdaptationManager.trackDamage('commander', damage);
                hitCount++;

                // Path B Effects
                if (this.pathB >= 3) enemy.applyBurn(3); // Napalm
                if (this.pathB >= 4) enemy.applySlow(0.8, 2000); // Suppression (Stun-like slow)

                // Nuke (Level 5)
                if (this.pathB >= 5 && enemy.hp < enemy.maxHp) enemy.takeDamage(1000);
            }
        });

        return true;
    }
}