/**
 * Supabase Realtime Room Chat Module
 * 
 * A production-ready chat module for browser-based games with authentication,
 * private channel subscription, broadcasts, reconnection with backoff, optimistic
 * local echo, deduplication, and clean-up.
 * 
 * @module SupabaseChatModule
 * @requires @supabase/supabase-js@2.x
 * 
 * USAGE EXAMPLE:
 * ---------------
 * import { createChatModule } from './modules/SupabaseChatModule.js';
 * 
 * const chat = createChatModule();
 * 
 * // Initialize with your credentials
 * await chat.initSupabase({ 
 *   url: SUPABASE_URL, 
 *   anonKey: SUPABASE_ANON_KEY, 
 *   debug: true 
 * });
 * 
 * // Ensure user is authenticated
 * await chat.ensureAuth({ 
 *   signInHandler: async () => {
 *     // Your auth logic here - return session or throw error
 *     const { data, error } = await supabase.auth.signInWithOtp({
 *       email: 'user@example.com'
 *     });
 *     if (error) throw error;
 *     return data.session;
 *   }
 * });
 * 
 * // Join a room
 * await chat.joinRoom(ROOM_ID, {
 *   onMessage: (msg) => {
 *     console.log('Message received:', msg);
 *     game.displayChatMessage(msg);
 *   },
 *   onStatus: (status, details) => {
 *     console.log('Chat status:', status, details);
 *     game.updateChatStatus(status);
 *   }
 * });
 * 
 * // Send a message
 * await chat.sendMessage({ text: 'Hello world!' });
 * 
 * // Leave the room
 * await chat.leaveRoom();
 * 
 * // Full cleanup
 * chat.destroy();
 * 
 * CONFIGURATION OPTIONS:
 * ----------------------
 * initSupabase({ url, anonKey, debug })
 * joinRoom(roomId, { 
 *   onMessage, 
 *   onStatus, 
 *   signInHandler,
 *   optimisticEcho = true,
 *   ack = true,
 *   backoff = { initialDelayMs: 1000, multiplier: 2, maxDelayMs: 30000, jitterMs: 250 }
 * })
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Creates a new chat module instance
 * @returns {Object} Chat module API
 */
export function createChatModule() {
    // Private state
    let supabase = null;
    let currentChannel = null;
    let currentRoomId = null;
    let session = null;
    let reconnectTimer = null;
    let reconnectAttempt = 0;
    let isReconnecting = false;
    let debugMode = false;
    let isDestroyed = false;

    // Message deduplication
    const seenMessageIds = new Set();
    const recentMessages = new Map(); // For text+timestamp deduplication

    // Callbacks
    let onMessageCallback = null;
    let onStatusCallback = null;
    const eventHandlers = {
        connected: [],
        disconnected: [],
        message: [],
        error: [],
        permission_denied: []
    };

    // Configuration defaults
    let config = {
        optimisticEcho: true,
        ack: true,
        backoff: {
            initialDelayMs: 1000,
            multiplier: 2,
            maxDelayMs: 30000,
            jitterMs: 250
        }
    };

    /**
     * Debug logger
     */
    function log(...args) {
        if (debugMode) {
            console.debug('[SupabaseChat]', ...args);
        }
    }

    /**
     * Error logger (always logs)
     */
    function logError(...args) {
        console.error('[SupabaseChat]', ...args);
    }

    /**
     * Generate topic name from room ID
     */
    function makeTopic(roomId) {
        return `room:${roomId}:messages`;
    }

    /**
     * Generate client-side message ID
     */
    function generateClientId() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Calculate backoff delay with exponential backoff and jitter
     */
    function calculateBackoffDelay(attempt) {
        const { initialDelayMs, multiplier, maxDelayMs, jitterMs } = config.backoff;
        const exponentialDelay = Math.min(
            initialDelayMs * Math.pow(multiplier, attempt),
            maxDelayMs
        );
        const jitter = Math.random() * jitterMs;
        return exponentialDelay + jitter;
    }

    /**
     * Emit event to registered handlers
     */
    function emit(eventName, data) {
        const handlers = eventHandlers[eventName];
        if (handlers && handlers.length > 0) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (err) {
                    logError(`Error in ${eventName} handler:`, err);
                }
            });
        }
    }

    /**
     * Check if message is duplicate
     */
    function isDuplicate(message) {
        // Check by client_message_id first
        if (message.client_message_id) {
            if (seenMessageIds.has(message.client_message_id)) {
                return true;
            }
            seenMessageIds.add(message.client_message_id);

            // Clean up old IDs (keep last 1000)
            if (seenMessageIds.size > 1000) {
                const iterator = seenMessageIds.values();
                for (let i = 0; i < 100; i++) {
                    seenMessageIds.delete(iterator.next().value);
                }
            }
            return false;
        }

        // Fallback: dedupe by text+timestamp within 5 second window
        if (message.text && message.created_at) {
            const key = `${message.text}:${message.created_at}`;
            const now = Date.now();

            if (recentMessages.has(key)) {
                const timestamp = recentMessages.get(key);
                if (now - timestamp < 5000) {
                    return true;
                }
            }

            recentMessages.set(key, now);

            // Clean up old entries
            if (recentMessages.size > 500) {
                const cutoff = now - 10000;
                for (const [k, v] of recentMessages.entries()) {
                    if (v < cutoff) {
                        recentMessages.delete(k);
                    }
                }
            }
        }

        return false;
    }

    /**
     * Normalize incoming message to standard format
     */
    function normalizeMessage(rawMessage) {
        return {
            id: rawMessage.id || null,
            client_message_id: rawMessage.client_message_id || null,
            text: rawMessage.text || '',
            sender_profile_id: rawMessage.sender_profile_id || null,
            sender_display_name: rawMessage.sender_display_name || 'Anonymous',
            created_at: rawMessage.created_at || new Date().toISOString(),
            meta: rawMessage.meta || {},
            localEcho: rawMessage.localEcho || false
        };
    }

    /**
     * Handle incoming broadcast message
     */
    function handleIncomingMessage(payload) {
        log('Received broadcast:', payload);

        const message = normalizeMessage(payload);

        // Check for duplicate
        if (isDuplicate(message)) {
            log('Duplicate message filtered:', message.client_message_id || message.text);
            return;
        }

        // Call onMessage callback
        if (onMessageCallback) {
            try {
                onMessageCallback(message);
            } catch (err) {
                logError('Error in onMessage callback:', err);
            }
        }

        // Emit to event handlers
        emit('message', message);
    }

    /**
     * Handle subscription status changes
     */
    function handleSubscriptionStatus(status, details = null) {
        log('Subscription status:', status, details);

        if (onStatusCallback) {
            try {
                onStatusCallback(status, details);
            } catch (err) {
                logError('Error in onStatus callback:', err);
            }
        }

        switch (status) {
            case 'connected':
                reconnectAttempt = 0;
                isReconnecting = false;
                emit('connected', details);
                break;
            case 'disconnected':
                emit('disconnected', details);
                break;
            case 'permission_denied':
                emit('permission_denied', details);
                emit('error', { type: 'permission_denied', details });
                break;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    function scheduleReconnect() {
        if (isDestroyed || !currentRoomId || isReconnecting) {
            return;
        }

        isReconnecting = true;
        reconnectAttempt++;
        const delay = calculateBackoffDelay(reconnectAttempt);

        log(`Scheduling reconnect attempt #${reconnectAttempt} in ${delay}ms`);
        handleSubscriptionStatus('connecting', { attempt: reconnectAttempt, delay });

        reconnectTimer = setTimeout(async () => {
            if (isDestroyed || !currentRoomId) {
                return;
            }

            log(`Attempting reconnect #${reconnectAttempt}`);

            try {
                await subscribeToChannel(currentRoomId);
            } catch (err) {
                logError('Reconnection failed:', err);
                emit('error', { type: 'reconnect_failed', error: err, attempt: reconnectAttempt });
                scheduleReconnect(); // Try again
            }
        }, delay);
    }

    /**
     * Cancel any pending reconnection
     */
    function cancelReconnect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        isReconnecting = false;
        reconnectAttempt = 0;
    }

    /**
     * Subscribe to channel
     */
    async function subscribeToChannel(roomId) {
        if (!supabase) {
            throw new Error('Supabase client not initialized. Call initSupabase first.');
        }

        if (!session) {
            throw new Error('Not authenticated. Call ensureAuth first.');
        }

        const topic = makeTopic(roomId);
        log('Subscribing to channel:', topic);

        // Create channel with private config
        const channel = supabase.channel(topic, {
            config: {
                broadcast: {
                    self: config.optimisticEcho, // Receive own messages if optimistic echo enabled
                    ack: config.ack
                },
                private: true // Enable RLS
            }
        });

        // Register broadcast handler
        channel.on('broadcast', { event: 'message_created' }, (payload) => {
            handleIncomingMessage(payload.payload);
        });

        // Subscribe and wait for result
        return new Promise((resolve, reject) => {
            channel.subscribe((status, error) => {
                log('Subscribe callback:', status, error);

                if (status === 'SUBSCRIBED') {
                    currentChannel = channel;
                    handleSubscriptionStatus('connected');
                    resolve();
                } else if (status === 'CLOSED') {
                    handleSubscriptionStatus('disconnected');
                    scheduleReconnect();
                } else if (status === 'CHANNEL_ERROR') {
                    logError('Channel error:', error);

                    // Check for permission denied
                    if (error && (error.message?.includes('permission') || error.message?.includes('not authorized'))) {
                        handleSubscriptionStatus('permission_denied', error);
                        reject(new Error('Permission denied. Check RLS policies and authentication.'));
                    } else {
                        emit('error', { type: 'channel_error', error });
                        scheduleReconnect();
                        reject(error || new Error('Channel subscription error'));
                    }
                } else if (status === 'TIMED_OUT') {
                    logError('Subscription timed out');
                    emit('error', { type: 'timeout', error: 'Subscription timed out' });
                    scheduleReconnect();
                    reject(new Error('Subscription timed out'));
                }
            });
        });
    }

    // PUBLIC API

    /**
     * Initialize Supabase client
     * @param {Object} options
     * @param {string} options.url - Supabase project URL
     * @param {string} options.anonKey - Supabase anon key
     * @param {boolean} [options.debug=false] - Enable debug logging
     * @returns {Object} Module instance for chaining
     */
    function initSupabase({ url, anonKey, debug = false }) {
        if (!url || !anonKey) {
            throw new Error('url and anonKey are required');
        }

        debugMode = debug;
        log('Initializing Supabase client');

        supabase = createClient(url, anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });

        log('Supabase client initialized');
        return api; // Return API for chaining
    }

    /**
     * Ensure user is authenticated
     * @param {Object} [options]
     * @param {Function} [options.signInHandler] - Async function that returns session
     * @returns {Promise<Object>} Session object
     */
    async function ensureAuth({ signInHandler } = {}) {
        if (!supabase) {
            throw new Error('Supabase client not initialized. Call initSupabase first.');
        }

        log('Checking authentication');

        // Try to restore session
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();

        if (existingSession) {
            log('Session restored');
            session = existingSession;
            return session;
        }

        // No session - try sign in handler
        if (signInHandler && typeof signInHandler === 'function') {
            log('No session found, calling signInHandler');

            try {
                session = await signInHandler();

                if (!session) {
                    throw new Error('signInHandler did not return a session');
                }

                log('Authentication successful via signInHandler');
                return session;
            } catch (err) {
                logError('signInHandler failed:', err);
                throw err;
            }
        }

        // No session and no handler
        throw new Error('Not authenticated. Provide signInHandler or call supabase auth flow.');
    }

    /**
     * Join a room and subscribe to messages
     * @param {string} roomId - Room UUID
     * @param {Object} options
     * @param {Function} options.onMessage - Callback for incoming messages
     * @param {Function} options.onStatus - Callback for status changes
     * @param {Function} [options.signInHandler] - Optional auth handler
     * @param {boolean} [options.optimisticEcho=true] - Enable optimistic message echo
     * @param {boolean} [options.ack=true] - Enable message acknowledgments
     * @param {Object} [options.backoff] - Custom backoff configuration
     * @returns {Promise<void>}
     */
    async function joinRoom(roomId, options = {}) {
        if (isDestroyed) {
            throw new Error('Chat module has been destroyed. Create a new instance.');
        }

        if (!roomId) {
            throw new Error('roomId is required');
        }

        if (!options.onMessage || typeof options.onMessage !== 'function') {
            throw new Error('onMessage callback is required');
        }

        // Check if already in this room
        if (currentRoomId === roomId && currentChannel) {
            log('Already connected to room:', roomId);
            return;
        }

        // Leave current room if in one
        if (currentChannel) {
            log('Leaving current room before joining new one');
            await leaveRoom();
        }

        // Update config
        if (options.optimisticEcho !== undefined) {
            config.optimisticEcho = options.optimisticEcho;
        }
        if (options.ack !== undefined) {
            config.ack = options.ack;
        }
        if (options.backoff) {
            config.backoff = { ...config.backoff, ...options.backoff };
        }

        // Store callbacks
        onMessageCallback = options.onMessage;
        onStatusCallback = options.onStatus || null;

        // Ensure authenticated
        try {
            await ensureAuth({ signInHandler: options.signInHandler });
        } catch (err) {
            logError('Authentication failed:', err);
            emit('error', { type: 'auth_failed', error: err });
            throw err;
        }

        // Subscribe
        currentRoomId = roomId;

        try {
            await subscribeToChannel(roomId);
            log('Successfully joined room:', roomId);
        } catch (err) {
            currentRoomId = null;
            throw err;
        }
    }

    /**
     * Send a message to the current room
     * @param {Object} payload - Message payload
     * @param {string} payload.text - Message text (required)
     * @param {string} [payload.sender_display_name] - Sender name
     * @param {Object} [payload.meta] - Additional metadata
     * @returns {Promise<void>}
     */
    async function sendMessage(payload) {
        if (isDestroyed) {
            throw new Error('Chat module has been destroyed');
        }

        if (!currentChannel) {
            throw new Error('Not connected to a room. Call joinRoom first.');
        }

        if (!session) {
            throw new Error('Not authenticated. Call ensureAuth first.');
        }

        if (!payload || !payload.text || typeof payload.text !== 'string' || payload.text.trim() === '') {
            throw new Error('payload.text is required and must be a non-empty string');
        }

        // Enrich message
        const clientMessageId = generateClientId();
        const enrichedPayload = {
            ...payload,
            client_message_id: clientMessageId,
            created_at: payload.created_at || new Date().toISOString(),
            sender_profile_id: session.user?.id || null
        };

        log('Sending message:', enrichedPayload);

        // Optimistic echo
        if (config.optimisticEcho && onMessageCallback) {
            const echoMessage = normalizeMessage({
                ...enrichedPayload,
                localEcho: true
            });

            // Add to seen IDs to prevent duplicate when it comes back
            if (clientMessageId) {
                seenMessageIds.add(clientMessageId);
            }

            try {
                onMessageCallback(echoMessage);
            } catch (err) {
                logError('Error in optimistic echo callback:', err);
            }

            emit('message', echoMessage);
        }

        // Send broadcast
        try {
            const response = await currentChannel.send({
                type: 'broadcast',
                event: 'message_created',
                payload: enrichedPayload
            });

            log('Message sent, response:', response);

            if (response === 'ok' || response?.status === 'ok') {
                return;
            } else {
                throw new Error('Failed to send message: ' + JSON.stringify(response));
            }
        } catch (err) {
            logError('Send message error:', err);
            emit('error', { type: 'send_failed', error: err });
            throw err;
        }
    }

    /**
     * Leave the current room
     * @returns {Promise<void>}
     */
    async function leaveRoom() {
        log('Leaving room');

        cancelReconnect();

        if (currentChannel) {
            try {
                await supabase.removeChannel(currentChannel);
                log('Channel removed');
            } catch (err) {
                logError('Error removing channel:', err);
            }

            currentChannel = null;
        }

        currentRoomId = null;
        onMessageCallback = null;
        onStatusCallback = null;
        seenMessageIds.clear();
        recentMessages.clear();

        log('Room left successfully');
    }

    /**
     * Register event handler
     * @param {string} eventName - Event name: 'connected', 'disconnected', 'message', 'error', 'permission_denied'
     * @param {Function} handler - Event handler function
     */
    function on(eventName, handler) {
        if (!eventHandlers[eventName]) {
            throw new Error(`Unknown event: ${eventName}. Valid events: ${Object.keys(eventHandlers).join(', ')}`);
        }

        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        eventHandlers[eventName].push(handler);
        log(`Registered handler for event: ${eventName}`);
    }

    /**
     * Unregister event handler
     * @param {string} eventName - Event name
     * @param {Function} handler - Handler to remove
     */
    function off(eventName, handler) {
        if (!eventHandlers[eventName]) {
            return;
        }

        const index = eventHandlers[eventName].indexOf(handler);
        if (index > -1) {
            eventHandlers[eventName].splice(index, 1);
            log(`Unregistered handler for event: ${eventName}`);
        }
    }

    /**
     * Get current connection status
     * @returns {string} 'disconnected', 'connecting', or 'connected'
     */
    function getStatus() {
        if (!currentChannel) return 'disconnected';
        if (isReconnecting) return 'connecting';
        return 'connected';
    }

    /**
     * Get Supabase client (for advanced use)
     * @returns {Object|null} Supabase client instance
     */
    function getSupabaseClient() {
        return supabase;
    }

    /**
     * Destroy the module and clean up all resources
     */
    function destroy() {
        log('Destroying chat module');

        isDestroyed = true;

        leaveRoom().catch(err => logError('Error during destroy leaveRoom:', err));

        // Clear all event handlers
        Object.keys(eventHandlers).forEach(key => {
            eventHandlers[key] = [];
        });

        supabase = null;
        session = null;

        log('Chat module destroyed');
    }

    // Return public API
    const api = {
        initSupabase,
        ensureAuth,
        joinRoom,
        sendMessage,
        leaveRoom,
        on,
        off,
        getStatus,
        getSupabaseClient,
        destroy
    };

    return api;
}

/**
 * Example test harness (commented out - uncomment to test)
 */
/*
async function testChatModule() {
  const SUPABASE_URL = 'https://your-project.supabase.co';
  const SUPABASE_ANON_KEY = 'your-anon-key';
  const ROOM_ID = 'test-room-uuid';
  
  const chat = createChatModule();
  
  // Initialize
  chat.initSupabase({ 
    url: SUPABASE_URL, 
    anonKey: SUPABASE_ANON_KEY, 
    debug: true 
  });
  
  // Register event handlers
  chat.on('connected', () => console.log('✓ Connected'));
  chat.on('disconnected', () => console.log('✗ Disconnected'));
  chat.on('message', (msg) => console.log('📨 Message:', msg));
  chat.on('error', (err) => console.error('❌ Error:', err));
  
  // Auth
  await chat.ensureAuth({
    signInHandler: async () => {
      // Your auth logic - this is just an example
      const client = chat.getSupabaseClient();
      const { data, error } = await client.auth.signInAnonymously();
      if (error) throw error;
      return data.session;
    }
  });
  
  // Join room
  await chat.joinRoom(ROOM_ID, {
    onMessage: (msg) => {
      console.log('[Room Message]', msg.sender_display_name + ':', msg.text);
    },
    onStatus: (status, details) => {
      console.log('[Room Status]', status, details);
    }
  });
  
  // Send a test message
  await chat.sendMessage({ 
    text: 'Hello from test harness!',
    sender_display_name: 'Test User'
  });
  
  // Wait a bit to see messages
  setTimeout(async () => {
    await chat.leaveRoom();
    chat.destroy();
    console.log('Test complete');
  }, 5000);
}

// Run test
// testChatModule().catch(console.error);
*/
