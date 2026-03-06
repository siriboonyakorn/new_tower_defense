// js/modules/PlayerService.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { CONFIG } from '../config.js';

export const PlayerService = {
    client: null,
    session: null,
    profile: null,
    _loadingProfileId: null, // Track currently loading ID to avoid races
    _profilePromise: null,   // Store promise to allow multiple listeners to wait on same request

    /**
     * Initialize the Supabase Client
     */
    async init() {
        if (this.client) return;
        console.log('[PlayerService] Initializing with Supabase v2.45.4...');
        console.log('[PlayerService] Security Context:', window.isSecureContext ? 'SECURE' : 'NON-SECURE');

        this.client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                lockType: 'null', // Mandatory for non-secure or buggy environments
                storageKey: 'sector-zero-session',
                detectSessionInUrl: true  // needed for OAuth and password-recovery redirects
            }
        });

        // Listen for auth changes
        this.client.auth.onAuthStateChange(async (event, session) => {
            console.log('[PlayerService] Auth Event:', event, session?.user?.email);
            const oldSessionId = this.session?.user?.id;
            this.session = session;

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                // Avoid redundant loads if session basically same
                if (oldSessionId !== session.user.id || !this.profile) {
                    await this._loadProfile(session.user.id);
                }
            } else if (event === 'PASSWORD_RECOVERY') {
                // Supabase fires this when user clicks a password-reset email link.
                // Dispatch so AuthUI can display the set-new-password form.
                window.dispatchEvent(new CustomEvent('auth-password-recovery'));
            } else if (event === 'SIGNED_OUT') {
                this.profile = null;
                this._notifyUpdate();
            }
        });

        // Initial session check
        try {
            console.log('[PlayerService] Getting initial session...');
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) console.error('[PlayerService] getSession Error:', error);

            this.session = session;
            if (session) {
                console.log('[PlayerService] Session found for:', session.user.email);
                await this._loadProfile(session.user.id);
            } else {
                console.log('[PlayerService] No active session.');
            }
        } catch (err) {
            console.warn('[PlayerService] Fatal initialization error during getSession:', err);
            // We don't re-throw here so the rest of the app can attempt to boot
        }
    },

    async loadProfile() {
        if (this.session) {
            return this._loadProfile(this.session.user.id);
        }
    },

    getClient() {
        if (!this.client) throw new Error("PlayerService not initialized. Call init() first.");
        return this.client;
    },

    /**
     * Load user profile from database
     */
    async _loadProfile(authId) {
        // 1. If we are already loading THIS ID, reuse promise
        if (this._loadingProfileId === authId && this._profilePromise) {
            return this._profilePromise;
        }

        this._loadingProfileId = authId;
        this._profilePromise = (async () => {
            // Give auth engine a tiny breather to settle state
            await new Promise(r => setTimeout(r, 400));

            console.log('[PlayerService] Starting profile fetch for:', authId);
            const supabase = this.getClient();
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    console.log(`[PlayerService] Fetching profile (Attempt ${attempts + 1})...`);

                    // Add a 5 second timeout to the request
                    const fetchWithTimeout = Promise.race([
                        supabase.from('profiles').select('*').eq('auth_id', authId).single(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch Timeout')), 5000))
                    ]);

                    const { data, error, status } = await fetchWithTimeout;

                    if (data) {
                        console.log('[PlayerService] Success: Loaded user', data.username);
                        this.profile = {
                            ...data,
                            level: data.level || 1,
                            xp: data.xp || 0,
                            neon_tokens: data.neon_tokens || 0,
                            is_anonymous: this.session?.user?.is_anonymous || false
                        };
                        this._notifyUpdate();
                        return this.profile;
                    }

                    if (error) {
                        const isAbort = error.message?.includes('AbortError') || error.status === 0;
                        if (isAbort && attempts < maxAttempts - 1) {
                            attempts++;
                            console.warn(`[PlayerService] Signal abort. Retry ${attempts}/3...`);
                            await new Promise(r => setTimeout(r, attempts * 500));
                            continue;
                        }

                        console.error('[PlayerService] Fetch failed:', error.message, '| Code:', error.code);
                        if (error.code === 'PGRST116') {
                            return await this._createInitialProfile(authId);
                        }
                        break;
                    }
                } catch (err) {
                    console.error('[PlayerService] Exception in fetch:', err);
                    break;
                }
                attempts++;
            }

            // CLEANUP CACHE SO NEXT CALL CAN START FRESH IF NEEDED
            this._loadingProfileId = null;
            this._profilePromise = null;

            if (!this.profile) {
                console.error('[PlayerService] Profile load failed after retries/timeout.');
            }
            return this.profile;
        })();

        return this._profilePromise;
    },

    /**
     * Fallback to create profile if trigger failed or didn't exist
     */
    async _createInitialProfile(authId) {
        console.log('[PlayerService] Creating initial profile for:', authId);
        const supabase = this.getClient();
        const user = this.session?.user;

        // GitHub provides user_name / name; email/password signup provides display_name
        const oauthUsername = user?.user_metadata?.user_name
            || user?.user_metadata?.preferred_username
            || user?.user_metadata?.display_name;
        const oauthDisplayName = user?.user_metadata?.name
            || user?.user_metadata?.display_name;

        const newProfile = {
            auth_id: authId,
            username: oauthUsername || 'Survivor_' + authId.substring(0, 5),
            display_name: oauthDisplayName || 'Survivor',
            level: 1,
            xp: 0,
            neon_tokens: 500 // Starting bonus
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

        if (data) {
            console.log('[PlayerService] Profile created manually:', data.username);
            this.profile = data;
            this._notifyUpdate();
            return this.profile;
        } else {
            console.error('[PlayerService] Manual profile creation failed:', error);
            return null;
        }
    },

    /**
     * Notify UI of profile updates
     */
    _notifyUpdate() {
        window.dispatchEvent(new CustomEvent('player-profile-updated', {
            detail: { profile: this.profile }
        }));
    },

    /**
     * Sign In with GitHub OAuth (redirects to GitHub, then back to the app)
     */
    async signInWithGithub() {
        const supabase = this.getClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
        return data;
    },

    /**
     * Send a password-reset email to the given address
     */
    async sendPasswordResetEmail(email) {
        const supabase = this.getClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '?type=recovery'
        });
        if (error) throw error;
    },

    /**
     * Update the currently signed-in user's password (call after recovery redirect)
     */
    async updatePassword(newPassword) {
        const supabase = this.getClient();
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return data;
    },

    // ------------------------------------------------------------------
    // MFA / 2FA  (TOTP)
    // ------------------------------------------------------------------

    /**
     * Returns { currentLevel, nextLevel } to detect if MFA step-up is needed
     */
    async getMFALevel() {
        const supabase = this.getClient();
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        return data;
    },

    /**
     * Begin TOTP enrollment — returns { id, totp: { qr_code, secret, uri } }
     */
    async enrollMFA() {
        const supabase = this.getClient();
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            issuer: 'SectorZero'
        });
        if (error) throw error;
        return data;
    },

    /**
     * Complete enrollment by verifying the first TOTP code
     */
    async verifyMFAEnrollment(factorId, code) {
        const supabase = this.getClient();
        const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
        if (cErr) throw cErr;
        const { data, error } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challenge.id,
            code: code.trim()
        });
        if (error) throw error;
        this.session = data.session;
        return data;
    },

    /**
     * Issue a challenge then verify a login-time TOTP code
     */
    async challengeAndVerifyMFA(factorId, code) {
        const supabase = this.getClient();
        const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
        if (cErr) throw cErr;
        const { data, error } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challenge.id,
            code: code.trim()
        });
        if (error) throw error;
        this.session = data.session;
        return data;
    },

    /**
     * List enrolled TOTP factors — returns { totp: [{ id, friendly_name, ... }] }
     */
    async listMFAFactors() {
        const supabase = this.getClient();
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        return data;
    },

    /**
     * Remove (unenroll) a TOTP factor by its id
     */
    async unenrollMFA(factorId) {
        const supabase = this.getClient();
        const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
        return data;
    },

    /**
     * Sign Up with Username + Password only (no real email needed)
     * Internally generates a fake email: username@sectorzero.game
     */
    async signUpWithUsername(username, password) {
        // Sanitize username for use in fake email (lowercase, alphanumeric/underscore only)
        const safeUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const fakeEmail = `${safeUser}@sectorzero.game`;
        return this.signUpWithEmail(fakeEmail, password, username);
    },

    /**
     * Sign In with Username + Password only
     * Reconstructs the fake email that was used during signUpWithUsername
     */
    async signInWithUsername(username, password) {
        const safeUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const fakeEmail = `${safeUser}@sectorzero.game`;
        return this.signInWithEmail(fakeEmail, password);
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

        if (data.user && data.session) {
            this.session = data.session;
            await this._loadProfile(data.user.id);
            return { user: data.user, session: data.session, profile: this.profile };
        }

        return { user: data.user, session: null };
    },

    /**
     * Sign In with Email and Password
     */
    async signInWithEmail(email, password) {
        const supabase = this.getClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        this.session = data.session;
        // Wait for the profile to actually load before returning
        await this._loadProfile(data.user.id);
        return { user: data.user, session: data.session, profile: this.profile };
    },

    /**
     * Sign In Anonymously (Guest)
     */
    async loginAsGuest(username = 'Guest') {
        const supabase = this.getClient();
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) throw error;

        this.session = data.session;
        await this._loadProfile(data.user.id);

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
        this._notifyUpdate();
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
     * Delete user account
     */
    async deleteAccount() {
        if (!this.profile) return;
        const supabase = this.getClient();

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', this.profile.id);

        if (error) throw error;

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
        if (money !== undefined) updates.neon_tokens = money;
        if (exp !== undefined) updates.xp = exp;
        if (level !== undefined) updates.level = level;

        return await this.updateProfile(updates);
    }
};
