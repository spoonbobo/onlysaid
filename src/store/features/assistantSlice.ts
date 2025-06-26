import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';
import { IMessage } from '@/types/chat';
import { User } from '@/types/user';
import { updateMessage } from '../features/chatSlice';
import { updateAssistantMessage } from '../features/assistantSlice';

// Add these new action types
export const startStreaming = createAction<{
    messageId: string;
    query: string;
    conversationHistory: string;
    locale: string;
    knowledgeBases?: string[];
}>('assistant/startStreaming');

export const stopStreaming = createAction('assistant/stopStreaming');

export const resumeGeneration = createAction<{
    messageId: string;
}>('assistant/resumeGeneration');

// Add a new action to track route changes
export const setCurrentRoute = createAction<string>('assistant/setCurrentRoute');

interface AssistantState {
    messages: IMessage[]; // Use IMessage instead of Message
    position: { x: number, y: number };
    isOpen: boolean;
    isStreaming: boolean;
    streamingMessageId: string | null;
    // Add new state to track the stream
    streamController: AbortController | null;
    canResume: boolean;
    resumeMessageId: string | null;
    currentRoute: string; // Add this new state property
    size: { width: number, height: number }; // Add size state
    isPinned: boolean; // Add isPinned state
}

// Default position for server-side rendering - no window references here
const defaultPosition = { x: 1200, y: 700 };

// Create a function to get the initial position that's safe for SSR
const getInitialPosition = () => {
    if (typeof window !== 'undefined') {
        try {
            // Try to get saved position from localStorage
            const savedPosition = localStorage.getItem('assistantPosition');
            if (savedPosition) {
                return JSON.parse(savedPosition);
            }

            // If no saved position, use default based on window size
            return {
                x: window.innerWidth - 100,
                y: window.innerHeight - 100
            };
        } catch (e) {
            // Fallback if localStorage fails
            return defaultPosition;
        }
    }
    return defaultPosition;
};

// Get initial size from localStorage or use default
const getInitialSize = () => {
    if (typeof window !== 'undefined') {
        try {
            const savedSize = localStorage.getItem('assistantSize');
            if (savedSize) {
                return JSON.parse(savedSize);
            }
        } catch (e) {
            // Fallback if localStorage fails
        }
    }
    return { width: 350, height: 500 }; // Default size
};

const initialState: AssistantState = {
    messages: [],
    position: getInitialPosition(),
    isOpen: false,
    isStreaming: false,
    streamingMessageId: null,
    streamController: null,
    canResume: false,
    resumeMessageId: null,
    currentRoute: typeof window !== 'undefined' ? window.location.pathname : '/', // Initialize with current route
    size: getInitialSize(),
    isPinned: false, // Initialize isPinned state
};

const assistantSlice = createSlice({
    name: 'assistant',
    initialState,
    reducers: {
        updatePosition: (state, action: PayloadAction<{ x: number, y: number }>) => {
            state.position = action.payload;
            // Save to localStorage when position changes
            if (typeof window !== 'undefined') {
                localStorage.setItem('assistantPosition', JSON.stringify(action.payload));
            }
        },
        setIsOpen: (state, action: PayloadAction<boolean>) => {
            state.isOpen = action.payload;
        },
        toggleOpen: (state) => {
            state.isOpen = !state.isOpen;
        },
        addMessage: (state, action: PayloadAction<IMessage>) => {
            state.messages.push(action.payload);
        },
        clearMessages: (state) => {
            state.messages = [];
        },
        updateMessage: (state, action: PayloadAction<IMessage>) => {
            const index = state.messages.findIndex(msg => msg.id === action.payload.id);
            if (index !== -1) {
                state.messages[index] = action.payload;
            }
        },
        setStreamingState: (state, action: PayloadAction<{
            isStreaming: boolean;
            messageId: string | null;
            canResume?: boolean;
            resumeMessageId?: string;
        }>) => {
            state.isStreaming = action.payload.isStreaming;
            state.streamingMessageId = action.payload.messageId;
            state.canResume = action.payload.canResume || false;
            state.resumeMessageId = action.payload.resumeMessageId || null;
        },
        // Add a reducer to handle route changes
        setCurrentRoute: (state, action: PayloadAction<string>) => {
            state.currentRoute = action.payload;
        },
        updateSize: (state, action: PayloadAction<{ width: number, height: number }>) => {
            state.size = action.payload;
            // Save to localStorage when size changes
            if (typeof window !== 'undefined') {
                localStorage.setItem('assistantSize', JSON.stringify(action.payload));
            }
        },
        // Add a reducer to handle pinned state
        setPinned: (state, action: PayloadAction<boolean>) => {
            state.isPinned = action.payload;
        },
    },
    // Add extraReducers to handle the createAction
    extraReducers: (builder) => {
        builder.addCase(setCurrentRoute, (state, action) => {
            state.currentRoute = action.payload;
        });
    }
});

const {
    updatePosition,
    setIsOpen,
    toggleOpen,
    addMessage,
    clearMessages,
    setStreamingState,
    updateSize,
    setPinned,
} = assistantSlice.actions;

export {
    clearMessages,
    setStreamingState,
    updateSize,
    setPinned,
    updateMessage as updateAssistantMessage,
};

export default assistantSlice.reducer;
