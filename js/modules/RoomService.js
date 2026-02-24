import { PlayerService } from './PlayerService.js';
import { CONFIG } from '../config.js';

export const RoomService = {
    socket: null,
    currentRoom: null,
    currentMembers: [],

    init() {
        if (this.socket) return;

        console.log('[RoomService] Connecting to Socket.io server:', CONFIG.SOCKET_URL);
        this.socket = io(CONFIG.SOCKET_URL, {
            autoConnect: true,
            reconnection: true
        });

        this.socket.on('connect', () => {
            console.log('[RoomService] Connected to Multi-Server');
        });

        this.socket.on('connect_error', (error) => {
            console.warn('[RoomService] Connection Error:', error.message);
            console.log('[RoomService] TIP: Ensure your Render server is running and CORS is allowed for this origin.');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[RoomService] Disconnected:', reason);
        });

        this.socket.on('room_update', (data) => {
            console.log('[RoomService] Received Update:', data);
            this.currentRoom = data.room;
            this.currentMembers = data.members;

            // Dispatch event for UI
            window.dispatchEvent(new CustomEvent('room-data-updated'));
        });

        this.socket.on('game_start', (data) => {
            console.log('[RoomService] Multi-Signal: Game Starting', data);
            window.dispatchEvent(new CustomEvent('game-start-signal', { detail: data }));
        });

        this.socket.on('game_event', (payload) => {
            console.log('[RoomService] Multi-Event Received:', payload);
            window.dispatchEvent(new CustomEvent('game-event-received', { detail: payload }));
        });
    },

    getClient() {
        return PlayerService.getClient();
    },

    /**
     * Create a new room
     */
    async createRoom(options = {}) {
        const profile = PlayerService.getCurrentProfile();
        if (!profile) throw new Error('Must be logged in to create a room');

        console.log('[RoomService] Requesting new room creation...');

        return new Promise((resolve, reject) => {
            this.socket.emit('room:create', {
                hostId: profile.id,
                username: profile.username,
                metadata: options.metadata || {}
            }, (response) => {
                if (response.success) {
                    this.currentRoom = response.room;
                    resolve(response.room);
                } else {
                    reject(new Error(response.message || 'Failed to create room'));
                }
            });
        });
    },

    /**
     * Join a room by join code
     */
    async joinRoomByCode(joinCode) {
        const profile = PlayerService.getCurrentProfile();
        if (!profile) throw new Error('Must be logged in to join');

        return new Promise((resolve, reject) => {
            this.socket.emit('room:join', {
                code: joinCode.toUpperCase(),
                profileId: profile.id,
                username: profile.username
            }, (response) => {
                if (response.success) {
                    this.currentRoom = response.room;
                    resolve(response.room);
                } else {
                    reject(new Error(response.message || 'Room not found'));
                }
            });
        });
    },

    /**
     * Fetch latest members (not needed as much with live socket updates)
     */
    async fetchMembers() {
        return this.currentMembers;
    },

    async leaveRoom() {
        if (this.socket) {
            this.socket.emit('room:leave');
        }
        this.currentRoom = null;
        this.currentMembers = [];
    },

    async setReady(isReady) {
        this.socket.emit('room:ready', { ready: isReady });
    },

    async startGame() {
        this.socket.emit('room:start_game');
    },

    /**
     * Broadcast generic game event
     */
    broadcastEvent(event, data) {
        if (!this.socket) return;
        this.socket.emit('game:event', { type: event, ...data });
    },

    // Mock/No-op for existing sub-system compatibility
    subscribeToRoom(roomId, callbacks = {}) {
        console.log('[RoomService] Redirecting live updates to UI...');

        const updateUI = () => {
            if (callbacks.onMemberChange) callbacks.onMemberChange(this.currentMembers);
            if (callbacks.onRoomUpdate) callbacks.onRoomUpdate({ new: this.currentRoom });
        };

        const signalStart = (data) => {
            console.log('[RoomService] Forwarding server start-signal to UI');
            if (callbacks.onRoomUpdate) {
                callbacks.onRoomUpdate({ new: { ...this.currentRoom, status: 'in_progress' } });
            }
        };

        this.socket.on('room_update', updateUI);
        this.socket.on('game_start', signalStart);
        this.socket.on('game_event', (payload) => {
            if (callbacks.onGameEvent) callbacks.onGameEvent(payload);
        });

        return {
            unsubscribe: () => {
                this.socket.off('room_update', updateUI);
                this.socket.off('game_start', signalStart);
            }
        };
    },

    getCurrentRoom() { return this.currentRoom; },
    getMembers() { return this.currentMembers; }
};
