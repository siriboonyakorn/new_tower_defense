// js/managers/SynergyManager.js

/**
 * Manages tower synergy combos - bonus effects when targets have certain status effects
 */
export const SynergyManager = {
    /**
     * Synergy definitions
     * Each synergy checks if target has a condition, then applies a bonus
     */
    synergies: {
        // Burning targets take extra crit damage from Railgun
        BURN_CRIT: {
            condition: (target) => target.effects?.burn?.stacks > 0,
            towerType: 'rail',
            effect: (damage) => ({ damage: damage * 1.5, isCrit: true }),
            description: 'Railgun deals +50% crit damage to burning targets'
        },

        // Slowed targets are guaranteed crits from Railgun
        SLOW_CRIT: {
            condition: (target) => target.effects?.slow?.intensity > 0,
            towerType: 'rail',
            effect: (damage) => ({ damage: damage * 1.25, isCrit: true }),
            description: 'Railgun guaranteed crit on slowed targets'
        },

        // Burning + Slowed = Shatter (extra damage burst)
        SHATTER: {
            condition: (target) => target.effects?.burn?.stacks > 0 && target.effects?.slow?.intensity > 0,
            towerType: null, // Any tower
            effect: (damage) => ({ damage: damage * 1.75, isShatter: true }),
            description: 'Frozen + Burning targets take 75% more damage (Shatter)'
        },

        // High burn stacks = explosion on kill (handled elsewhere but tracked here)
        IGNITE_CHAIN: {
            condition: (target) => target.effects?.burn?.stacks >= 5,
            towerType: 'laser',
            effect: (damage) => ({ damage: damage * 1.2, willExplode: true }),
            description: 'Enemies with 5+ burn stacks explode on death'
        }
    },

    /**
     * Calculate synergy bonus for a tower attacking a target
     * @param {string} towerTypeId - The attacking tower's type id
     * @param {Enemy} target - The enemy being attacked
     * @param {number} baseDamage - The base damage before synergy
     * @returns {{ damage: number, effects: string[] }} Modified damage and applied effects
     */
    calculateBonus(towerTypeId, target, baseDamage) {
        let finalDamage = baseDamage;
        const appliedEffects = [];

        for (const [key, synergy] of Object.entries(this.synergies)) {
            // Check if synergy applies to this tower type (null = any tower)
            if (synergy.towerType !== null && synergy.towerType !== towerTypeId) {
                continue;
            }

            // Check if target meets condition
            if (synergy.condition(target)) {
                const result = synergy.effect(finalDamage);
                finalDamage = result.damage;
                appliedEffects.push(key);

                // Log synergy activation (debug)
                // console.log(`[Synergy] ${key} activated! Damage: ${baseDamage} -> ${finalDamage}`);
            }
        }

        return { damage: finalDamage, effects: appliedEffects };
    },

    /**
     * Get all synergy descriptions for UI display
     */
    getSynergyDescriptions() {
        return Object.entries(this.synergies).map(([key, s]) => ({
            id: key,
            description: s.description
        }));
    }
};
