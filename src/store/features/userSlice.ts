import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { User, UserSettings } from '@/types/user';
import { Team } from '@/types/teams';

interface UserState {
    currentUser: User | null;
    isOwner: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSigningOut: boolean;
    error: string | null;
    expiresAt: number | null;
    trustMode: boolean;
    lastOpenedTeam: string | null;
    currentTeam: Team | null;
}

const initialState: UserState = {
    isOwner: false,
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    isSigningOut: false,
    error: null,
    expiresAt: null,
    trustMode: false,
    lastOpenedTeam: null,
    currentTeam: null
};

// TTL duration in milliseconds (1 hour)
export const SESSION_TTL = 60 * 60 * 1000;

const userPersistConfig = {
    key: 'user',
    storage,
    whitelist: [
        'currentUser',
        'isAuthenticated',
        'expiresAt',
        'trustMode',
        'lastOpenedTeam'
    ]
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.currentUser = action.payload;
            state.isAuthenticated = true;
            state.isOwner = true; // TODO: make it dynamic
            state.error = null;
            state.currentTeam = null;
            state.expiresAt = Date.now() + SESSION_TTL;

            // Set lastOpenedTeam if it exists in the user data
            if (action.payload.lastOpenedTeam) {
                state.lastOpenedTeam = action.payload.lastOpenedTeam;
            }
        },
        clearUser: (state) => {
            state.currentUser = null;
            state.isAuthenticated = false;
            state.expiresAt = null;
            state.lastOpenedTeam = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setSigningOut: (state, action: PayloadAction<boolean>) => {
            state.isSigningOut = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
        },
        checkSessionExpiration: (state) => {
            if (state.isAuthenticated && (!state.expiresAt || Date.now() > state.expiresAt)) {
                console.log("Session expired or no expiration set, clearing user");
                state.currentUser = null;
                state.isAuthenticated = false;
                state.expiresAt = null;
            }
        },
        // New action to refresh the TTL
        refreshSessionTTL: (state) => {
            if (state.isAuthenticated) {
                state.expiresAt = Date.now() + SESSION_TTL;
                console.log("Session TTL refreshed to:", new Date(state.expiresAt).toLocaleString());
            }
        },

        // New reducer to update user settings
        updateUserSettings: (state, action: PayloadAction<{ key: string; value: any }>) => {
            if (!state.currentUser) return;

            // Initialize user_settings if it doesn't exist
            if (!state.currentUser.settings) {
                state.currentUser.settings = {
                    general: {
                        theme: 'light'
                    }
                };
            }

            // Update the specific setting
            const { key, value } = action.payload;
            state.currentUser.settings[key] = value;
        },

        // New reducer to replace all user settings at once
        setUserSettings: (state, action: PayloadAction<UserSettings>) => {
            if (!state.currentUser) return;

            state.currentUser.settings = action.payload;
        },
        setTrustMode: (state, action: PayloadAction<boolean>) => {
            state.trustMode = action.payload;
        },
        setLastOpenedTeam: (state, action: PayloadAction<string>) => {
            state.lastOpenedTeam = action.payload;

            // Also update the user object if it exists
            if (state.currentUser) {
                state.currentUser.lastOpenedTeam = action.payload;
            }
        },
        // New reducer to update isOwner status
        updateOwner: (state, action: PayloadAction<{ team: Team }>) => {
            if (!state.currentUser) return;

            const { team } = action.payload;
            // Check if the current user's ID is in the team's owners array
            state.isOwner = team.owners.includes(state.currentUser.id || "");
        },
        resetOwner: (state) => {
            state.isOwner = false;
        },
        // New reducer to set the current team
        setCurrentTeam: (state, action: PayloadAction<Team>) => {
            state.currentTeam = action.payload;
        },
        // New reducer to reset/clear the current team
        resetCurrentTeam: (state) => {
            state.currentTeam = null;
        },
        // New reducer to update team settings
        updateTeamSettings: (state, action: PayloadAction<{ key: string; value: any }>) => {
            if (!state.currentTeam) return;

            // Initialize team_settings if it doesn't exist
            if (!state.currentTeam.settings) {
                state.currentTeam.settings = {
                    general: {
                        theme: 'light'
                    }
                };
            }

            // Update the specific setting
            const { key, value } = action.payload;
            state.currentTeam.settings[key] = value;
        },

        // New reducer to replace all team settings at once
        setTeamSettings: (state, action: PayloadAction<UserSettings>) => {
            if (!state.currentTeam) return;

            state.currentTeam.settings = action.payload;
        }
    }
});

export const {
    setUser,
    clearUser,
    setLoading,
    setSigningOut,
    setError,
    checkSessionExpiration,
    refreshSessionTTL,
    updateUserSettings,
    setUserSettings,
    setTrustMode,
    setLastOpenedTeam,
    updateOwner,
    resetOwner,
    setCurrentTeam,
    resetCurrentTeam,
    updateTeamSettings,
    setTeamSettings
} = userSlice.actions;

// Create a persisted reducer
const persistedUserReducer = persistReducer(userPersistConfig, userSlice.reducer);

export default persistedUserReducer; 