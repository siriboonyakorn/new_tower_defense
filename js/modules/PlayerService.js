/**
 * Player Service Module
 * Handles player authentication and profile management.
 * Updated to work with existing database schema (auth_id, profiles table)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export const PlayerService = {
    client: null,
    session: null,
    profile: null,

    /**
     * Initialize the Supabase Client
     */
    init(config) {
        if (this.client) return;
        console.log('[PlayerService] Initializing with URL:', config.url);

        this.client = createClient(config.url, config.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });

        // Listen for auth changes
        this.client.auth.onAuthStateChange(async (event, session) => {
            console.log('[PlayerService] Auth Event:', event, session?.user?.email);
            this.session = session;

            if (event === 'SIGNED_IN' && session) {
                await this._loadProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                this.profile = null;
                this._notifyUpdate();
            } else if (event === 'INITIAL_SESSION') {
                if (session) await this._loadProfile(session.user.id);
            }
        });
    },

    getClient() {
        if (!this.client) throw new Error("PlayerService not initialized. Call init() first.");
        return this.client;
    },

    /**
     * Load user profile from database
     */
    async _loadProfile(authId) {
        console.log('[PlayerService] Loading profile for:', authId);
        const supabase = this.getClient();

        try {
            // Add timeout to prevent hanging
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('auth_id', authId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout after 5 seconds')), 5000)
            );

            const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

            console.log('[PlayerService] Profile query finished. Data:', data ? 'FOUND' : 'NOT FOUND', 'Error:', error?.message || 'NONE');

            if (error) {
                console.error('[PlayerService] Profile load error:', error);
                console.error('[PlayerService] Full error details:', JSON.stringify(error, null, 2));
            }

            if (data) {
                console.log('[PlayerService] Profile loaded:', data.username);
                this.profile = {
                    ...data,
                    // Ensure defaults
                    level: data.level || 1,
                    xp: data.xp || 0,
                    neon_tokens: data.neon_tokens || 0,
                    is_anonymous: this.session?.user?.is_anonymous || false
                };
                this._notifyUpdate();
            } else if (!error) {
                console.warn('[PlayerService] No profile found and no error - profile may not exist');
            }
        } catch (err) {
            console.error('[PlayerService] Profile load exception:', err);
        }

        return this.profile;
    },

    /**
     * Notify UI of profile updates
     */
    _notifyUpdate() {
        console.log('[PlayerService] Dispatching profile-updated');
        window.dispatchEvent(new CustomEvent('player-profile-updated', {
            detail: { profile: this.profile }
        }));
    },

    /**
     * Sign Up with Email and Password
     */
    async signUpWithEmail(email, password, username) {
        const supabase = this.getClient();

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: username
                }
            }
        });

        if (error) throw error;

        // Profile will be created by trigger
        if (data.user && data.session) {
            this.session = data.session;
            await this._loadProfile(data.user.id);

            // Update username if profile was created
            if (this.profile) {
                await this.updateProfile({ username, display_name: username });
            }

            return { user: data.user, session: data.session, profile: this.profile };
        }

        return { user: data.user, session: null }; // Needs email confirmation
    },

    /**
     * Sign In with Email and Password
     */
    async signInWithEmail(email, password) {
        const supabase = this.getClient();

        console.log('[PlayerService] Calling signInWithPassword for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        console.log('[PlayerService] signInWithPassword finished. Success:', !!data.user, 'Error:', error?.message || 'NONE');

        if (error) throw error;

        this.session = data.session;
        await this._loadProfile(data.user.id);

        return { user: data.user, session: data.session, profile: this.profile };
    },

    /**
     * Sign In Anonymously (Guest)
     */
    async loginAsGuest(username = 'Guest') {
        const supabase = this.getClient();

        // Check existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            this.session = session;
            await this._loadProfile(session.user.id);
            return this.profile;
        }

        // Sign in anonymously
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) throw error;

        this.session = data.session;
        await this._loadProfile(data.user.id);

        // Update display name
        if (this.profile) {
            await this.updateProfile({ display_name: username });
        }

        return this.profile;
    },

    /**
     * Get current session
     */
    async getSession() {
        const supabase = this.getClient();
        const { data: { session } } = await supabase.auth.getSession();
        this.session = session;
        return session;
    },

    /**
     * Sign out
     */
    async logout() {
        const supabase = this.getClient();
        await supabase.auth.signOut();
        this.session = null;
        this.profile = null;
    },

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        if (!this.profile) return;

        const supabase = this.getClient();

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', this.profile.id)
            .select()
            .single();

        if (!error && data) {
            this.profile = data;
            this._notifyUpdate();
        }

        return this.profile;
    },

    /**
     * Delete user account (Wipe profile and sign out)
     */
    async deleteAccount() {
        if (!this.profile) return;
        const supabase = this.getClient();

        // 1. Delete the profile from the 'profiles' table
        // Note: The actual auth user can only be deleted via management API or dashboard usually,
        // but we can at least wipe their data and log them out.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', this.profile.id);

        if (error) throw error;

        // 2. Log out
        await this.logout();
    },

    /**
     * Get current profile
     */
    getCurrentProfile() {
        return this.profile;
    },

    /**
     * Update stats (money, exp, level)
     */
    async updateStats({ money, exp, level }) {
        if (!this.profile) return;

        const updates = {};
        if (money !== undefined) updates.money = money;
        if (exp !== undefined) updates.exp = exp;
        if (level !== undefined) updates.level = level;

        return await this.updateProfile(updates);
    }
};
