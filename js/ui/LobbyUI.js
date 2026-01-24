/**
 * LobbyUI.js
 * Handles multiplayer lobby interface
 */
import { RoomService } from '../modules/RoomService.js';
import { PlayerService } from '../modules/PlayerService.js';
import { ProgressionManager } from '../modules/ProgressionManager.js';

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
            joinPanel: document.getElementById('lobby-join-panel'),
            roomPanel: document.getElementById('lobby-room-panel'),

            // Buttons
            createBtn: document.getElementById('btn-create-room'),
            joinModeBtn: document.getElementById('btn-join-mode'),
            joinSubmitBtn: document.getElementById('btn-join-submit'),
            readyBtn: document.getElementById('btn-ready'),
            startBtn: document.getElementById('btn-start-game'),
            leaveBtn: document.getElementById('btn-leave-room'),
            backBtns: document.querySelectorAll('.lobby-back-btn'),

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
        // Open/Close
        const triggerBtn = document.getElementById('btn-multiplayer');
        if (triggerBtn) {
            console.log('[LobbyUI] Found triggerBtn, adding click listener');
            triggerBtn.addEventListener('click', () => {
                console.log('[LobbyUI] Multiplayer button clicked');
                this.open();
            });
        } else {
            console.warn('[LobbyUI] triggerBtn (btn-multiplayer) NOT FOUND in DOM');
        }

        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }

        // Mode selection
        if (this.elements.createBtn) {
            this.elements.createBtn.addEventListener('click', () => this.createRoom());
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

    open() {
        console.log('[LobbyUI] Attempting to open...');
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
        this.elements.joinPanel.classList.remove('active');
        this.elements.roomPanel.classList.remove('active');
    },

    showJoinPanel() {
        this.elements.modePanel.classList.remove('active');
        this.elements.joinPanel.classList.add('active');
        this.elements.roomPanel.classList.remove('active');
        this.elements.joinCodeInput.focus();
    },

    showRoomPanel() {
        this.elements.modePanel.classList.remove('active');
        this.elements.joinPanel.classList.remove('active');
        this.elements.roomPanel.classList.add('active');
    },

    async createRoom() {
        this.setMessage(this.elements.joinMessage, 'Creating room...', '');

        try {
            const room = await RoomService.createRoom({ maxPlayers: 4 });
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
        try {
            await RoomService.startGame();
            this.setMessage(this.elements.roomMessage, 'Starting game...', 'success');

            // TODO: Transition to game
            setTimeout(() => {
                this.close();
                // Start actual game here
                console.log('🎮 GAME STARTING!');
            }, 1500);

        } catch (err) {
            console.error('Start game error:', err);
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
                console.log('Room updated:', payload);
                if (payload.new.status === 'in_progress') {
                    this.setMessage(this.elements.roomMessage, 'Game starting!', 'success');
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
