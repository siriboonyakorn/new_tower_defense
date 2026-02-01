import { CONFIG } from '../config.js';

export const RedisManager = {
    /**
     * Send a command to Upstash Redis REST API
     * @param {string} command 
     * @param {...any} args 
     */
    async command(command, ...args) {
        try {
            const response = await fetch(CONFIG.UPSTASH_REDIS_REST_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${CONFIG.UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([command, ...args])
            });
            const data = await response.json();
            if (data.error) {
                console.error('[RedisManager] Error:', data.error, 'Cmd:', command, args);
                return null;
            }
            return data.result;
        } catch (err) {
            console.error('[RedisManager] Network Error:', err);
            return null;
        }
    },

    async get(key) {
        return await this.command('get', key);
    },

    async set(key, value) {
        return await this.command('set', key, value);
    },

    async incr(key) {
        return await this.command('incr', key);
    },

    // Leaderboard logic
    async zadd(key, score, member) {
        return await this.command('zadd', key, score, member);
    },

    /**
     * Increment score in a sorted set
     */
    async zincrby(key, increment, member) {
        return await this.command('zincrby', key, increment, member);
    },

    async zrange(key, start, end, withScores = false) {
        if (withScores) {
            return await this.command('zrange', key, start, end, 'WITHSCORES', 'REV'); // REV for high-to-low
        }
        return await this.command('zrange', key, start, end, 'REV');
    },

    async zrevrange(key, start, end, withScores = false) {
        // Upstash might check 'REV' argument in zrange or use zrevrange command directly
        if (withScores) {
            return await this.command('zrevrange', key, start, end, 'WITHSCORES');
        }
        return await this.command('zrevrange', key, start, end);
    },

    /**
     * High-level helper to get leaderboard with parsed scores
     */
    async getLeaderboard(metric, limit = 10) {
        const key = `leaderboard:${metric}`; // e.g., leaderboard:damage
        // ZREVRANGE to get highest first
        const raw = await this.zrevrange(key, 0, limit - 1, true);

        if (!raw) return [];

        // Raw comes back as [ "member1", "score1", "member2", "score2" ]
        const result = [];
        for (let i = 0; i < raw.length; i += 2) {
            result.push({
                rank: (i / 2) + 1,
                username: raw[i],
                score: parseInt(raw[i + 1])
            });
        }
        return result;
    }
};

window.RedisManager = RedisManager;
