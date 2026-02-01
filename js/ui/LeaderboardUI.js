/**
 * LeaderboardUI.js
 * Manages the Combat Records window (Match History & Global Leaderboard)
 */
import { RedisManager } from '../managers/RedisManager.js';
import { PlayerService } from '../modules/PlayerService.js';

export const LeaderboardUI = {
    elements: {},

    init() {
        console.log('[LeaderboardUI] Initializing...');
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            modal: document.getElementById('leaderboard-modal'),
            openBtn: document.getElementById('btn-leaderboard'),
            closeBtn: document.getElementById('close-leaderboard'),

            // Tabs
            tabHistory: document.getElementById('tab-history'),
            tabGlobal: document.getElementById('tab-global'),

            // Headers
            historyHeader: document.getElementById('history-header'),
            globalHeader: document.getElementById('global-header'),

            // Content Containers
            historyList: document.getElementById('history-list'),
            globalList: document.getElementById('global-list'),
            loadingSpinner: document.getElementById('history-loading')
        };
    },

    bindEvents() {
        if (this.elements.openBtn) {
            this.elements.openBtn.addEventListener('click', () => this.open());
        }

        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }

        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) this.close();
            });
        }

        if (this.elements.tabHistory) {
            this.elements.tabHistory.addEventListener('click', () => this.switchTab('history'));
        }

        if (this.elements.tabGlobal) {
            this.elements.tabGlobal.addEventListener('click', () => this.switchTab('global'));
        }
    },

    open() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
            this.switchTab('history'); // Default to Personal History
        }
    },

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
    },

    async switchTab(tab) {
        // 1. UI Toggles
        if (this.elements.tabHistory) this.elements.tabHistory.classList.toggle('active', tab === 'history');
        if (this.elements.tabGlobal) this.elements.tabGlobal.classList.toggle('active', tab === 'global');

        if (this.elements.historyHeader) this.elements.historyHeader.classList.toggle('hidden', tab !== 'history');
        if (this.elements.globalHeader) this.elements.globalHeader.classList.toggle('hidden', tab !== 'global');

        if (this.elements.historyList) this.elements.historyList.classList.toggle('hidden', tab !== 'history');
        if (this.elements.globalList) this.elements.globalList.classList.toggle('hidden', tab !== 'global');

        // 2. Load Data
        if (tab === 'history') {
            await this.loadMatchHistory();
        } else {
            await this.loadGlobalLeaderboard();
        }
    },

    async loadMatchHistory() {
        if (!this.elements.historyList) return;

        // Show loading state
        this.elements.historyList.innerHTML = '<div class="lb-loading">Retrieving encryption logs...</div>';

        const profile = PlayerService.getCurrentProfile();
        if (!profile) {
            this.elements.historyList.innerHTML = '<div class="lb-error">ACCESS DENIED: Login required.</div>';
            return;
        }

        try {
            const supabase = PlayerService.getClient();
            const { data, error } = await supabase
                .from('match_history')
                .select('*')
                .eq('profile_id', profile.id)
                .order('played_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            this.renderHistoryList(data);

        } catch (err) {
            console.error('[LeaderboardUI] History fetch error:', err);
            this.elements.historyList.innerHTML = '<div class="lb-error">CONNECTION INTERRUPTED</div>';
        }
    },

    async loadGlobalLeaderboard() {
        if (!this.elements.globalList) return;

        this.elements.globalList.innerHTML = '<div class="lb-loading">Scanning orbital network...</div>';

        try {
            // Default to 'kills' or 'damage' - let's do kills for now or combined if possible
            const data = await RedisManager.getLeaderboard('kills', 50);

            // Just for UI clarity, maybe add a sub-tab later. For now assume it's "Top Killers"
            this.renderGlobalList(data);

        } catch (err) {
            console.error('[LeaderboardUI] Global fetch error:', err);
            this.elements.globalList.innerHTML = '<div class="lb-error">SIGNAL LOST</div>';
        }
    },

    renderHistoryList(data) {
        if (!data || data.length === 0) {
            this.elements.historyList.innerHTML = '<div class="lb-empty">NO MISSION RECORDS FOUND</div>';
            return;
        }

        const html = data.map(entry => {
            const date = new Date(entry.played_at).toLocaleDateString();
            const resultClass = entry.result === 'win' ? 'win' : 'loss';
            const resultText = entry.result.toUpperCase();

            return `
                <div class="lb-row">
                    <div class="lb-date">${date}</div>
                    <div class="lb-mission">${entry.level_id || 'UNKNOWN'}</div>
                    <div class="lb-result ${resultClass}">${resultText}</div>
                    <div class="lb-stats-summary">
                        <span class="hl-xp">+${entry.xp_gained} XP</span>
                        <span class="hl-token">+${entry.tokens_gained} $</span>
                        <span class="hl-dmg">DMG: ${entry.total_damage}</span>
                        <span class="hl-kills">K: ${entry.total_kills}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.historyList.innerHTML = html;
    },

    renderGlobalList(data) {
        if (!data || data.length === 0) {
            this.elements.globalList.innerHTML = '<div class="lb-empty">NO GLOBAL DATA</div>';
            return;
        }

        const html = data.map(entry => {
            const isTop3 = entry.rank <= 3;
            const rankClass = isTop3 ? `rank-${entry.rank}` : '';

            // Highlight self
            const profile = PlayerService.getCurrentProfile();
            const isSelf = profile && (entry.username === profile.username);
            const selfClass = isSelf ? 'self-highlight' : '';

            return `
                <div class="lb-row ${rankClass} ${selfClass}">
                    <div class="lb-rank">#${entry.rank}</div>
                    <div class="lb-name">${entry.username} ${isSelf ? '(YOU)' : ''}</div>
                    <div class="lb-score">${entry.score.toLocaleString()} KILLS</div>
                </div>
            `;
        }).join('');

        this.elements.globalList.innerHTML = html;
    }
};
