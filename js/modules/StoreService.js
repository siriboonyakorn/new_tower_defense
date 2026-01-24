/**
 * StoreService.js
 * Handles purchasing and equipping items.
 */
import { PlayerService } from './PlayerService.js';
import { SkinsData } from '../data/SkinsData.js';

export const StoreService = {

    /**
     * Get the skin config for a specific tower type based on what is equipped
     */
    getSkinConfig(towerType) {
        const profile = PlayerService.getCurrentProfile();

        // Default fallbacks
        let skinId = `default_${towerType}`;

        if (profile && profile.equipped_skins && profile.equipped_skins[towerType]) {
            skinId = profile.equipped_skins[towerType];
        }

        const skins = SkinsData[towerType];
        if (!skins) return null;

        return skins.find(s => s.id === skinId) || skins[0];
    },

    /**
     * Get skins available for purchase in the current rotation + owned skins
     */
    getAvailableSkins(towerType) {
        const skins = SkinsData[towerType];
        if (!skins) return [];

        const profile = PlayerService.getCurrentProfile();
        // Check local seeded random for rotation
        const seed = this._getRotationSeed();
        const rand = this._seededRandom(seed); // Function that returns 0-1 based on seed

        // Always show default and owned skins
        const available = skins.filter(s => this.isOwned(s.id));

        // Find unowned skins
        const unowned = skins.filter(s => !this.isOwned(s.id));

        // Pick up to 3 unowned skins
        if (unowned.length > 0) {
            // Shuffle unowned array using seed
            const shuffled = [...unowned].sort((a, b) => {
                // Deterministic shuffle value based on IDs
                const valA = (a.id.length + seed) % 100;
                const valB = (b.id.length + seed) % 100;
                return valA - valB;
            });

            // Take top 3
            available.push(...shuffled.slice(0, 3));
        }

        // Return combined list, sorted by cost
        return available.sort((a, b) => a.cost - b.cost);
    },

    /**
     * Rotation changes every 3 hours
     */
    _getRotationSeed() {
        const now = Date.now();
        const duration = 3 * 60 * 60 * 1000; // 3 hours
        return Math.floor(now / duration);
    },

    /**
     * Get timestamp for next refresh
     */
    getNextRefreshTime() {
        const now = Date.now();
        const duration = 3 * 60 * 60 * 1000;
        const currentBlock = Math.floor(now / duration);
        return (currentBlock + 1) * duration;
    },

    /**
     * Simple seeded random (Linear Congruential Generator)
     */
    _seededRandom(seed) {
        const m = 0x80000000; // 2^31
        const a = 1103515245;
        const c = 12345;
        let state = seed ? seed : Math.floor(Math.random() * (m - 1));
        state = (a * state + c) % m;
        return state / (m - 1);
    },

    /**
     * Check if user owns a skin
     */
    isOwned(skinId) {
        const profile = PlayerService.getCurrentProfile();
        if (!profile || !profile.unlocked_skins) {
            // Default skins are always owned implicitly if check fails, 
            // but normally profile should have them in the array.
            return skinId.startsWith('default_');
        }
        return profile.unlocked_skins.includes(skinId);
    },

    /**
     * Purchase a skin using Neon Tokens
     */
    async purchaseSkin(skinId, cost) {
        const profile = PlayerService.getCurrentProfile();
        if (!profile) throw new Error("Not logged in.");

        if (profile.neon_tokens < cost) {
            throw new Error("Insufficient Neon Tokens.");
        }

        const supabase = PlayerService.getClient();

        // Use the secure RPC function
        const { data, error } = await supabase.rpc('purchase_skin', {
            p_id: profile.id,
            skin_id: skinId,
            cost: cost
        });

        if (error) throw error;
        if (!data) throw new Error("Purchase failed (Validation error).");

        // Refresh profile to see changes
        await PlayerService._loadProfile(profile.auth_id);
        return true;
    },

    /**
     * Equip a skin for a tower type
     */
    async equipSkin(towerType, skinId) {
        const profile = PlayerService.getCurrentProfile();
        if (!profile) throw new Error("Not logged in.");

        const supabase = PlayerService.getClient();

        const { data, error } = await supabase.rpc('equip_skin', {
            p_id: profile.id,
            tower_type: towerType,
            skin_id: skinId
        });

        if (error) throw error;
        if (!data) throw new Error("Equip failed (Not owned?).");

        // Refresh profile
        await PlayerService._loadProfile(profile.auth_id);
        return true;
    }
};
