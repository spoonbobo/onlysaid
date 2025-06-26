// src/store/store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import chatReducer from './features/chatSlice';
import userReducer from './features/userSlice';
import notificationReducer from './features/notificationSlice';
import planReducer from './features/planSlice';
import assistantReducer from './features/assistantSlice';
import announcementReducer from './features/announcementSlice';
import workbenchReducer from './features/workbenchSlice';
import { socketMiddleware } from './middleware/socketMiddleware';
import streamingMiddleware from './middleware/streamingMiddleware';

// Combine all reducers
const rootReducer = combineReducers({
    chat: chatReducer,
    user: userReducer,
    notification: notificationReducer,
    plan: planReducer,
    assistant: assistantReducer,
    announcement: announcementReducer,
    workbench: workbenchReducer,
    // Add other reducers here
});

// Configure persist settings for root reducer
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['chat', 'user', 'notification', 'assistant', 'plan', 'announcement', 'workbench'],
};

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }).concat(socketMiddleware, streamingMiddleware),
});

// Persistor object
export const persistor = persistStore(store);

// Define RootState type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;