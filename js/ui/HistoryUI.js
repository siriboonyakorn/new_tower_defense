import { levels } from '../data/levels.js';
import { PlayerService } from '../modules/PlayerService.js';
import { RedisManager } from '../managers/RedisManager.js';

export const HistoryUI = {
    currentTab: 'history', // 'history' or 'global'
    globalMetric: 'damage',

    elements: {
        modal: null,
        closeBtn: null,
        openBtn: null,
        tabHistory: null,
        tabGlobal: null,
        historyList: null,
        globalList: null,
        historyHeader: null,
        globalHeader: null
    },

    init() {
        console.log('[HistoryUI] Initializing...');
        this.elements.modal = document.getElementById('leaderboard-modal');
        this.elements.historyList = document.getElementById('history-list');
        this.elements.globalList = document.getElementById('global-list');
        this.elements.historyHeader = document.getElementById('history-header');
        this.elements.globalHeader = document.getElementById('global-header');

        this.elements.closeBtn = document.getElementById('close-leaderboard');
        this.elements.openBtn = document.getElementById('btn-leaderboard');

        this.elements.tabHistory = document.getElementById('tab-history');
        this.elements.tabGlobal = document.getElementById('tab-global');

        if (this.elements.openBtn) {
            this.elements.openBtn.onclick = () => this.show();
        }

        if (this.elements.closeBtn) {
            this.elements.closeBtn.onclick = () => this.hide();
        }

        if (this.elements.tabHistory) {
            this.elements.tabHistory.onclick = () => this.switchTab('history');
        }

        if (this.elements.tabGlobal) {
            this.elements.tabGlobal.onclick = () => this.switchTab('global');
        }

        // Close on ESC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.modal.classList.contains('hidden')) {
                this.hide();
            }
        });
    },

    async show() {
        if (!this.elements.modal) return;
        this.elements.modal.classList.remove('hidden');
        this.switchTab(this.currentTab);
    },

    hide() {
        if (!this.elements.modal) return;
        this.elements.modal.classList.add('hidden');
    },

    switchTab(tab) {
        this.currentTab = tab;

        // Update Tabs UI
        if (tab === 'history') {
            this.elements.tabHistory?.classList.add('active');
            this.elements.tabGlobal?.classList.remove('active');
            this.elements.historyList?.classList.remove('hidden');
            this.elements.globalList?.classList.add('hidden');
            this.elements.historyHeader?.classList.remove('hidden');
            this.elements.globalHeader?.classList.add('hidden');
            this.loadHistory();
        } else {
            this.elements.tabHistory?.classList.remove('active');
            this.elements.tabGlobal?.classList.add('active');
            this.elements.historyList?.classList.add('hidden');
            this.elements.globalList?.classList.remove('hidden');
            this.elements.historyHeader?.classList.add('hidden');
            this.elements.globalHeader?.classList.remove('hidden');
            this.loadGlobal();
        }
    },

    async loadHistory() {
        const profile = PlayerService.getCurrentProfile();
        if (!profile) {
            this.elements.historyList.innerHTML = '<div class="lb-error">LOGIN REQUIRED</div>';
            return;
        }

        this.elements.historyList.innerHTML = '<div class="lb-loading">RETRIVING COMBAT RECORDS...</div>';

        try {
            const supabase = PlayerService.getClient();
            const { data, error } = await supabase
                .from('match_history')
                .select('*')
                .eq('profile_id', profile.id)
                .order('played_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            console.log(`[HistoryUI] Received ${data?.length || 0} match records.`);

            // Update Header with Count
            if (this.elements.historyHeader) {
                this.elements.historyHeader.innerText = `COMBAT RECORDS (${data?.length || 0})`;
            }

            if (!data || data.length === 0) {
                this.elements.historyList.innerHTML = '<div class="lb-loading">NO MISSION RECORDS FOUND.</div>';
                return;
            }

            this.renderHistory(data);

        } catch (err) {
            console.error('[HistoryUI] Load error:', err);
            this.elements.historyList.innerHTML = '<div class="lb-error">FAILED TO SYNC RECORDS</div>';
        }
    },

    renderHistory(matches) {
        console.log('[HistoryUI] Rendering match history list...');
        this.elements.historyList.innerHTML = '';
        matches.forEach(match => {
            const row = document.createElement('div');
            row.className = `lb-row history-row ${match.result}`;
            const date = new Date(match.played_at).toLocaleDateString();
            const levelData = levels.find(l => l.id === match.level_id);
            const mission = (levelData ? levelData.name : match.level_id || 'UNKNOWN').toUpperCase();
            const result = match.result.toUpperCase();

            row.innerHTML = `
                <span style="width: 100px; font-size: 0.75rem; opacity: 0.7;">${date}</span>
                <span style="width: 100px; font-weight: bold;">${mission} <span class="result-tag" style="width: 60px;">${result}</span></span>
                <div class="history-stats">
                    <span class="stat-xp">+${match.xp_gained || 0}XP</span>
                    <span class="stat-tokens">+${match.tokens_gained || 0}◈</span>
                    <span class="stat-dmg">${Math.floor(match.total_damage || 0).toLocaleString()} D</span>
                    <span class="stat-kills">${match.total_kills || 0} K</span>
                </div>
            `;
            this.elements.historyList.appendChild(row);
        });
    },

    async loadGlobal() {
        this.elements.globalList.innerHTML = '<div class="lb-loading">LINKING GLOBAL UPLINK...</div>';
        try {
            const data = await RedisManager.getLeaderboard(this.globalMetric, 50);
            this.renderGlobal(data);
        } catch (err) {
            console.error('[HistoryUI] Global load error:', err);
            this.elements.globalList.innerHTML = '<div class="lb-error">UPLINK FAILED</div>';
        }
    },

    renderGlobal(data) {
        this.elements.globalList.innerHTML = '';
        if (data.length === 0) {
            this.elements.globalList.innerHTML = '<div class="lb-loading">NO DATA RECORDED.</div>';
            return;
        }

        data.forEach(item => {
            const row = document.createElement('div');
            row.className = 'lb-row';
            row.innerHTML = `
                <span class="lb-rank" style="width: 60px;">#${item.rank}</span>
                <span class="lb-user" style="flex:1;">${(item.username || 'UNKNOWN').split('_')[0].toUpperCase()}</span>
                <span class="lb-score" style="width: 120px; text-align:right;">${item.score.toLocaleString()}</span>
            `;
            this.elements.globalList.appendChild(row);
        });
    }
};
