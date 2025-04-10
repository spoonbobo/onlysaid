import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { User } from '@/types/user';

interface UserState {
    currentUser: User | null;
    isOwner: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSigningOut: boolean;
    error: string | null;
    expiresAt: number | null;
}

const initialState: UserState = {
    isOwner: false,
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    isSigningOut: false,
    error: null,
    expiresAt: null
};

// TTL duration in milliseconds (1 hour)
export const SESSION_TTL = 60 * 60 * 1000;

const userPersistConfig = {
    key: 'user',
    storage,
    whitelist: ['currentUser', 'isAuthenticated', 'expiresAt']
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.currentUser = action.payload;
            state.isAuthenticated = true;
            state.isOwner = action.payload.email === "seasonluke@gmail.com";
            state.error = null;
            state.expiresAt = Date.now() + SESSION_TTL;
        },
        clearUser: (state) => {
            state.currentUser = null;
            state.isAuthenticated = false;
            state.expiresAt = null;
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
    refreshSessionTTL
} = userSlice.actions;

// Create a persisted reducer
const persistedUserReducer = persistReducer(userPersistConfig, userSlice.reducer);

export default persistedUserReducer; 