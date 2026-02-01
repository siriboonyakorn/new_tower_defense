import { PlayerService } from '../modules/PlayerService.js';
import { RedisManager } from './RedisManager.js';

export const HistoryManager = {
    /**
     * Save match results to Supabase and update Redis Leaderboard
     * @param {Object} matchData 
     * @param {string} matchData.result - 'win' or 'loss'
     * @param {number} matchData.wavesCleared
     * @param {number} matchData.durationSeconds
     * @param {number} matchData.damageDealt
     * @param {number} matchData.kills
     * @param {number} matchData.xpGained
     * @param {number} matchData.tokensGained
     * @param {string} matchData.levelId
     */
    async saveMatch(matchData) {
        const profile = PlayerService.getCurrentProfile();
        if (!profile || profile.is_anonymous) {
            console.log('[HistoryManager] Guest user, skipping history save.');
            return;
        }

        console.log('[HistoryManager] Saving match history...', matchData);

        // --- SECURITY: INTEGRITY SIGNATURE ---
        // Simple client-side hash to deter direct script injection
        const signature = btoa(`${profile.id}:${matchData.wavesCleared || 0}:${matchData.levelId}:${matchData.result}:CHRONO_SIG`);

        // 1. Save to Supabase
        const supabase = PlayerService.getClient();
        const { error } = await supabase
            .from('match_history')
            .insert({
                profile_id: profile.id,
                result: matchData.result,
                waves_cleared: Math.floor(matchData.wavesCleared || 0),
                duration_seconds: Math.floor(matchData.durationSeconds || 0),
                total_damage: Math.floor(matchData.damageDealt || 0),
                total_kills: Math.floor(matchData.kills || 0),
                xp_gained: Math.floor(matchData.xpGained || 0),
                tokens_gained: Math.floor(matchData.tokensGained || 0),
                level_id: matchData.levelId,
                played_at: new Date().toISOString(),
                signature: signature
            });

        if (error) {
            console.error('[HistoryManager] Failed to save match history:', error);
        } else {
            console.log('[HistoryManager] Match history saved successfully for profile:', profile.id);
        }

        // 3. Update Redis Leaderboard (Lifetime Stats)
        // Increment Damage
        const damageScore = await RedisManager.zincrby('leaderboard:damage', matchData.damageDealt, profile.username);
        // Increment Kills
        const killsScore = await RedisManager.zincrby('leaderboard:kills', matchData.kills, profile.username);

        console.log(`[HistoryManager] Leaderboard updated. New Damage: ${damageScore}, New Kills: ${killsScore}`);

        // 3. Update Profile Totals (Optional, if we want to store in Supabase profile too)
        // For now, we rely on Redis for the realtime global stats

        return { error };
    }
};
