/**
 * RoomService.js
 * Handles multiplayer room creation, joining, and management
 */
import { PlayerService } from './PlayerService.js';

export const RoomService = {
    currentRoom: null,
    currentMembers: [],

    getClient() {
        return PlayerService.getClient();
    },

    /**
     * Create a new room
     * @param {Object} options { maxPlayers, metadata }
     * @returns {Promise<Object>} Room data with join_code
     */
    async createRoom(options = {}) {
        const supabase = this.getClient();
        const profile = PlayerService.getCurrentProfile();

        if (!profile) {
            throw new Error('Must be logged in to create a room');
        }

        console.log('[RoomService] Creating room for profile:', profile.id);

        // Generate join code
        try {
            const { data: codeData } = await supabase.rpc('generate_join_code');
            const joinCode = codeData || this._generateFallbackCode();

            console.log('[RoomService] Generated join code:', joinCode);

            console.log('[RoomService] Attempting to insert room...');
            const { data, error } = await supabase
                .from('rooms')
                .insert({
                    host_profile_id: profile.id,
                    join_code: joinCode,
                    max_players: options.maxPlayers || 4,
                    status: 'waiting',
                    metadata: options.metadata || {}
                })
                .select()
                .single();

            if (error) {
                console.error('[RoomService] Insert error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw error;
            }

            console.log('[RoomService] Room created successfully:', data);
            this.currentRoom = data;

            // Auto-join as host
            await this.joinRoom(data.id);

            return data;
        } catch (err) {
            console.error('[RoomService] createRoom exception:', err);
            throw err;
        }
    },

    /**
     * Join a room by join code
     * @param {string} joinCode - 6-character room code
     * @returns {Promise<Object>} Room data
     */
    async joinRoomByCode(joinCode) {
        const supabase = this.getClient();

        // Find room
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('join_code', joinCode.toUpperCase())
            .eq('status', 'waiting')
            .single();

        if (roomError || !room) {
            throw new Error('Room not found or already started');
        }

        // Check if room is full
        const { count } = await supabase
            .from('room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

        if (count >= room.max_players) {
            throw new Error('Room is full');
        }

        await this.joinRoom(room.id);
        return room;
    },

    /**
     * Join a room by room ID (internal)
     */
    async joinRoom(roomId) {
        const supabase = this.getClient();
        const profile = PlayerService.getCurrentProfile();

        if (!profile) {
            throw new Error('Must be logged in to join a room');
        }

        // Check if already in room
        // Check if already in room
        const { data: existing } = await supabase
            .from('room_members')
            .select('*')
            .eq('room_id', roomId)
            .eq('profile_id', profile.id)
            .maybeSingle();

        if (existing) {
            console.log('Already in this room');
            return existing;
        }

        // Join room
        const { data, error } = await supabase
            .from('room_members')
            .insert({
                room_id: roomId,
                profile_id: profile.id,
                is_ready: false
            })
            .select()
            .single();

        if (error) throw error;

        // Fetch full room data
        const { data: room } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        this.currentRoom = room;
        await this.fetchMembers();

        return data;
    },

    /**
     * Leave current room
     */
    async leaveRoom() {
        if (!this.currentRoom) return;

        const supabase = this.getClient();
        const profile = PlayerService.getCurrentProfile();

        if (!profile) return;

        await supabase
            .from('room_members')
            .delete()
            .eq('room_id', this.currentRoom.id)
            .eq('profile_id', profile.id);

        this.currentRoom = null;
        this.currentMembers = [];
    },

    /**
     * Toggle ready status
     */
    async setReady(isReady) {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        const supabase = this.getClient();
        const profile = PlayerService.getCurrentProfile();

        const { error } = await supabase
            .from('room_members')
            .update({ is_ready: isReady })
            .eq('room_id', this.currentRoom.id)
            .eq('profile_id', profile.id);

        if (error) throw error;

        await this.fetchMembers();
    },

    /**
     * Start game (host only)
     */
    async startGame() {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        const supabase = this.getClient();
        const profile = PlayerService.getCurrentProfile();

        // Check if host
        if (this.currentRoom.host_profile_id !== profile.id) {
            throw new Error('Only host can start the game');
        }

        const { error } = await supabase
            .from('rooms')
            .update({
                status: 'in_progress',
                starts_at: new Date().toISOString()
            })
            .eq('id', this.currentRoom.id);

        if (error) throw error;

        this.currentRoom.status = 'in_progress';
    },

    /**
     * Fetch current room members
     */
    async fetchMembers() {
        if (!this.currentRoom) return [];

        const supabase = this.getClient();

        const { data, error } = await supabase
            .from('room_members')
            .select(`
                *,
                profiles (*)
            `)
            .eq('room_id', this.currentRoom.id);

        if (!error && data) {
            this.currentMembers = data;
        }

        return this.currentMembers;
    },

    /**
     * Subscribe to room updates
     */
    subscribeToRoom(roomId, callbacks = {}) {
        const supabase = this.getClient();

        const channel = supabase
            .channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'room_members',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    if (callbacks.onMemberChange) {
                        callbacks.onMemberChange(payload);
                    }
                    this.fetchMembers();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${roomId}`
                },
                (payload) => {
                    if (callbacks.onRoomUpdate) {
                        callbacks.onRoomUpdate(payload);
                    }
                    this.currentRoom = payload.new;
                }
            )
            .subscribe();

        return channel;
    },

    /**
     * Get current room
     */
    getCurrentRoom() {
        return this.currentRoom;
    },

    /**
     * Get current members
     */
    getMembers() {
        return this.currentMembers;
    },

    /**
     * Fallback code generator if function doesn't exist
     */
    _generateFallbackCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
};
