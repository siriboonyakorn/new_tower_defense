/**
 * LobbyUI.js
 * Handles multiplayer lobby interface
 */
import { RoomService } from '../modules/RoomService.js';
import { PlayerService } from '../modules/PlayerService.js';
import { ProgressionManager } from '../modules/ProgressionManager.js';
import { levels } from '../data/levels.js';
import { Game } from '../core/Game.js';

export const LobbyUI = {
    elements: {},
    currentChannel: null,

    init() {
        console.log('[LobbyUI] Initializing...');
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            modal: document.getElementById('lobby-modal'),
            closeBtn: document.getElementById('close-lobby'),

            // Panels
            modePanel: document.getElementById('lobby-mode-panel'),
            mapPanel: document.getElementById('lobby-map-panel'),
            joinPanel: document.getElementById('lobby-join-panel'),
            roomPanel: document.getElementById('lobby-room-panel'),

            // Buttons
            createBtn: document.getElementById('btn-create-room'),
            backToModeBtn: document.getElementById('btn-back-to-mode'),
            joinModeBtn: document.getElementById('btn-join-mode'),
            joinSubmitBtn: document.getElementById('btn-join-submit'),
            readyBtn: document.getElementById('btn-ready'),
            startBtn: document.getElementById('btn-start-game'),
            leaveBtn: document.getElementById('btn-leave-room'),
            backBtns: document.querySelectorAll('.lobby-back-btn'),

            // Map List
            mapList: document.getElementById('lobby-map-list'),

            // Join
            joinCodeInput: document.getElementById('join-code-input'),
            joinMessage: document.getElementById('join-message'),

            // Room
            roomCode: document.getElementById('room-code'),
            membersList: document.getElementById('members-list'),
            roomMessage: document.getElementById('room-message'),

            // Player Stats Widget
            statsWidget: document.getElementById('player-stats-widget'),
            playerLevel: document.getElementById('player-level'),
            playerTokens: document.getElementById('player-tokens'),
            playerXpFill: document.getElementById('player-xp-fill'),
            playerXpText: document.getElementById('player-xp-text')
        };
    },

    bindEvents() {
        console.log('[LobbyUI] Binding events...');
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }

        // Mode selection
        if (this.elements.createBtn) {
            this.elements.createBtn.addEventListener('click', () => this.showMapPanel());
        }

        if (this.elements.backToModeBtn) {
            this.elements.backToModeBtn.addEventListener('click', () => this.showModePanel());
        }

        if (this.elements.joinModeBtn) {
            this.elements.joinModeBtn.addEventListener('click', () => this.showJoinPanel());
        }

        // Join room
        if (this.elements.joinSubmitBtn) {
            this.elements.joinSubmitBtn.addEventListener('click', () => this.joinRoom());
        }

        if (this.elements.joinCodeInput) {
            this.elements.joinCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.joinRoom();
            });
        }

        // Room actions
        if (this.elements.readyBtn) {
            this.elements.readyBtn.addEventListener('click', () => this.toggleReady());
        }

        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => this.startGame());
        }

        if (this.elements.leaveBtn) {
            this.elements.leaveBtn.addEventListener('click', () => this.leaveRoom());
        }

        // Back buttons
        this.elements.backBtns.forEach(btn => {
            btn.addEventListener('click', () => this.showModePanel());
        });

        // Copy room code
        if (this.elements.roomCode) {
            this.elements.roomCode.addEventListener('click', () => this.copyRoomCode());
        }

        // Listen for profile updates
        window.addEventListener('player-profile-updated', () => {
            console.log('[LobbyUI] Profile updated event received');
            this.updatePlayerStats();
        });
    },

    open(levelId = null) {
        console.log('[LobbyUI] Opening with Level ID:', levelId);
        this.selectedLevelId = levelId;

        // Check if logged in
        const profile = PlayerService.getCurrentProfile();
        if (!profile || profile.is_anonymous) {
            console.warn('[LobbyUI] Open failed: Not logged in');
            alert('Please login first! (Guest accounts not supported for multiplayer)');
            return;
        }

        this.showModePanel();

        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
        }

        this.updatePlayerStats();
    },

    updatePlayerStats() {
        const profile = PlayerService.getCurrentProfile();

        if (!this.elements.statsWidget) return;

        if (profile && !profile.is_anonymous) {
            this.elements.statsWidget.classList.remove('player-stats-hidden');

            // Update Text
            this.elements.playerLevel.textContent = (profile.level || 1).toString().padStart(2, '0');
            this.elements.playerTokens.textContent = (profile.neon_tokens || 0).toLocaleString();

            // Calcluate XP Bar
            const xp = profile.xp || 0;
            const level = profile.level || 1;
            const requiredAndProgress = ProgressionManager.getLevelProgress(xp, level);
            const required = ProgressionManager.getXpForLevel(level);

            this.elements.playerXpFill.style.width = `${requiredAndProgress}%`;
            this.elements.playerXpText.textContent = `${xp} / ${required} XP`;

        } else {
            this.elements.statsWidget.classList.add('player-stats-hidden');
        }
    },

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('closing');
            setTimeout(() => {
                this.elements.modal.classList.add('hidden');
                this.elements.modal.classList.remove('closing');
            }, 300);
        }

        // Unsubscribe from room updates
        if (this.currentChannel) {
            this.currentChannel.unsubscribe();
            this.currentChannel = null;
        }
    },

    showModePanel() {
        this.elements.modePanel.classList.add('active');
        this.elements.mapPanel.classList.remove('active');
        this.elements.joinPanel.classList.remove('active');
        this.elements.roomPanel.classList.remove('active');
    },

    showJoinPanel() {
        this.elements.modePanel.classList.remove('active');
        this.elements.mapPanel.classList.remove('active');
        this.elements.joinPanel.classList.add('active');
        this.elements.roomPanel.classList.remove('active');
        this.elements.joinCodeInput.focus();
    },

    showMapPanel() {
        this.elements.modePanel.classList.remove('active');
        this.elements.mapPanel.classList.add('active');
        this.elements.joinPanel.classList.remove('active');
        this.elements.roomPanel.classList.remove('active');
        this.populateMapList();
    },

    showRoomPanel() {
        this.elements.modePanel.classList.remove('active');
        this.elements.mapPanel.classList.remove('active');
        this.elements.joinPanel.classList.remove('active');
        this.elements.roomPanel.classList.add('active');
    },

    populateMapList() {
        if (!this.elements.mapList) return;
        this.elements.mapList.innerHTML = '';

        levels.forEach(level => {
            const btn = document.createElement('button');
            btn.className = 'lobby-map-btn';

            // Determine color based on difficulty logic (simplified here or reused)
            let diffColor = '#fff';
            if (level.difficulty === 'EASY') diffColor = '#00f3ff';
            if (level.difficulty === 'NORMAL') diffColor = '#00ff00';
            if (level.difficulty === 'HARD') diffColor = '#ff9f00';
            if (level.difficulty === 'EXTREME') diffColor = '#ff0055';
            if (level.difficulty === 'INSANE') diffColor = '#ff00ff';
            if (level.difficulty === 'OMEGA') diffColor = '#ff0000';

            btn.innerHTML = `
                <span class="map-name">${level.name}</span>
                <span class="map-diff" style="color: ${diffColor};">${level.difficulty}</span>
            `;

            btn.onclick = () => this.createRoom(level.id);
            this.elements.mapList.appendChild(btn);
        });
    },

    async createRoom(selectedMapId) {
        this.setMessage(this.elements.joinMessage, 'Creating room...', '');

        try {
            // PASS SELECTED MAP ID
            const levelId = selectedMapId || 'sector1';
            console.log('[LobbyUI] Creating room for level:', levelId);

            const room = await RoomService.createRoom({
                maxPlayers: 4,
                metadata: { levelId: levelId }
            });
            console.log('Room created:', room);

            this.displayRoom(room);
            this.subscribeToRoom(room.id);

        } catch (err) {
            console.error('Create room error:', err);
            this.setMessage(this.elements.joinMessage, 'Failed to create room: ' + err.message, 'error');
        }
    },

    async joinRoom() {
        const code = this.elements.joinCodeInput.value.trim().toUpperCase();

        if (!code || code.length !== 6) {
            this.setMessage(this.elements.joinMessage, 'Enter a valid 6-character code', 'error');
            return;
        }

        this.setMessage(this.elements.joinMessage, 'Joining room...', '');

        try {
            const room = await RoomService.joinRoomByCode(code);
            console.log('Joined room:', room);

            this.displayRoom(room);
            this.subscribeToRoom(room.id);

        } catch (err) {
            console.error('Join room error:', err);
            this.setMessage(this.elements.joinMessage, err.message, 'error');
        }
    },

    displayRoom(room) {
        this.showRoomPanel();

        // Display room code
        if (this.elements.roomCode) {
            this.elements.roomCode.textContent = room.join_code;
        }

        // Update members
        this.updateMembersList();

        // Show/hide start button based on host status
        const profile = PlayerService.getCurrentProfile();
        const isHost = room.host_profile_id === profile.id;

        if (this.elements.startBtn) {
            this.elements.startBtn.style.display = isHost ? 'block' : 'none';
        }
    },

    async updateMembersList() {
        const members = await RoomService.fetchMembers();
        const room = RoomService.getCurrentRoom();
        const profile = PlayerService.getCurrentProfile();

        if (!this.elements.membersList) return;

        this.elements.membersList.innerHTML = members.map(member => {
            const isHost = member.profile_id === room.host_profile_id;
            const isSelf = member.profile_id === profile.id;

            return `
                <div class="member-card ${isHost ? 'host' : ''}">
                    <div class="member-info">
                        <span class="member-icon">${isHost ? '👑' : '👤'}</span>
                        <span class="member-name">
                            ${member.profiles.display_name || member.profiles.username}
                            ${isSelf ? ' (You)' : ''}
                        </span>
                        ${isHost ? '<span class="member-role">HOST</span>' : ''}
                    </div>
                    <div class="member-status ${member.is_ready ? 'ready' : 'waiting'}">
                        <span class="ready-indicator"></span>
                        ${member.is_ready ? 'READY' : 'NOT READY'}
                    </div>
                </div>
            `;
        }).join('');

        // Update ready button state
        const currentMember = members.find(m => m.profile_id === profile.id);
        if (this.elements.readyBtn && currentMember) {
            this.elements.readyBtn.textContent = currentMember.is_ready ? 'NOT READY' : 'READY UP';
        }

        // Enable start button if all ready
        if (this.elements.startBtn) {
            const allReady = members.every(m => m.is_ready);
            this.elements.startBtn.disabled = !allReady || members.length < 1;
        }
    },

    async toggleReady() {
        const members = RoomService.getMembers();
        const profile = PlayerService.getCurrentProfile();
        const currentMember = members.find(m => m.profile_id === profile.id);

        if (!currentMember) return;

        try {
            await RoomService.setReady(!currentMember.is_ready);
            await this.updateMembersList();
        } catch (err) {
            console.error('Toggle ready error:', err);
        }
    },

    async startGame() {
        console.log('[LobbyUI] startGame() called');
        try {
            console.log('[LobbyUI] Calling RoomService.startGame()...');
            await RoomService.startGame();
            console.log('[LobbyUI] RoomService.startGame() completed successfully');
            this.setMessage(this.elements.roomMessage, 'Starting game...', 'success');
            // The subscription update will trigger the actual transition for everyone
        } catch (err) {
            console.error('[LobbyUI] Start game error:', err);
            this.setMessage(this.elements.roomMessage, err.message, 'error');
        }
    },

    async leaveRoom() {
        if (this.currentChannel) {
            this.currentChannel.unsubscribe();
            this.currentChannel = null;
        }

        await RoomService.leaveRoom();
        this.showModePanel();
        this.setMessage(this.elements.joinMessage, '', '');
    },

    subscribeToRoom(roomId) {
        this.currentChannel = RoomService.subscribeToRoom(roomId, {
            onMemberChange: () => {
                console.log('Member changed');
                this.updateMembersList();
            },
            onRoomUpdate: (payload) => {
                console.log('[LobbyUI] Room updated:', payload);
                const room = payload.new;
                console.log('[LobbyUI] Room status:', room.status);

                // GAME START SIGNAL
                if (room.status === 'in_progress') {
                    console.log('[LobbyUI] Game status is in_progress! Starting game sequence...');
                    this.setMessage(this.elements.roomMessage, 'DEPLOYING TO SECTOR...', 'success');

                    const targetLevelId = room.metadata?.levelId || 'sector1';
                    console.log(`[LobbyUI] Launching Game Map: ${targetLevelId}`);

                    setTimeout(() => {
                        console.log('[LobbyUI] Timeout fired, initializing game...');
                        this.close();

                        // Clean up main menu
                        const mainMenu = document.getElementById('main-menu');
                        if (mainMenu) mainMenu.classList.remove('active');

                        // Stop background
                        if (window.menuBackground) window.menuBackground.stop();

                        // START GAME
                        if (window.game && typeof window.game.stop === 'function') {
                            window.game.stop();
                        }
                        console.log('[LobbyUI] Creating new Game instance...');
                        window.game = new Game('game-canvas', targetLevelId);
                        console.log('[LobbyUI] Game instance created successfully!');

                    }, 1000);
                } else {
                    console.log('[LobbyUI] Room status is not in_progress, current status:', room.status);
                }
            }
        });
    },

    copyRoomCode() {
        const code = this.elements.roomCode.textContent;
        navigator.clipboard.writeText(code);
        this.setMessage(this.elements.roomMessage, 'Code copied!', 'success');
        setTimeout(() => {
            this.setMessage(this.elements.roomMessage, '', '');
        }, 2000);
    },

    setMessage(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'lobby-message ' + type;
    }
};
