import { Middleware } from 'redux';
import {
    setStreamingState,
    resumeGeneration
} from '../features/assistantSlice';
import { IMessage } from '@/types/chat';
import { User, UserSettings } from '@/types/user';
import { updateMessage } from '../features/chatSlice';

// Define a default sender object for the assistant
const defaultAssistantSettings: UserSettings = {
    general: { theme: 'system' }, // Provide default general settings or leave empty
    knowledgeBase: {},
    mcp: {}
};

const assistantSender: User = {
    id: 'assistant-id',
    username: 'AI Assistant',
    email: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    settings: defaultAssistantSettings, // Add the settings property
    avatar: '' // Add avatar if needed, or make it optional in User interface
};

// Add this interface near the top of the file
interface StreamSession {
    sessionId: string;
    serverSessionId?: string | null;
    content: string;
    isComplete: boolean;
    tabSwitched?: boolean;
    lastContent?: string;
    lastUpdated?: number;
    query?: string;
    conversationHistory?: string;
    locale?: string;
    currentRoute?: string;
    isStreaming?: boolean;
}

// Update the saveSession function with proper typing
export const saveSession = (messageId: string, session: Partial<StreamSession>) => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        sessions[messageId] = {
            ...session,
            lastUpdated: Date.now(),
            currentRoute: window.location.pathname,
            isStreaming: session.isStreaming !== undefined ? session.isStreaming : false
        };
        localStorage.setItem('activeStreamSessions', JSON.stringify(sessions));
        debugLog('Saved session to localStorage:', messageId);
    } catch (e) {
        console.error('Error saving session to localStorage:', e);
    }
};

// Update getSession function to return the correct type
export const getSession = (messageId: string): StreamSession | null => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        return sessions[messageId] as StreamSession || null;
    } catch (e) {
        console.error('Error getting session from localStorage:', e);
        return null;
    }
};

// Update getAllSessions function
const getAllSessions = (): Record<string, StreamSession> => {
    try {
        return JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
    } catch (e) {
        console.error('Error getting all sessions from localStorage:', e);
        return {};
    }
};

const removeSession = (messageId: string) => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        delete sessions[messageId];
        localStorage.setItem('activeStreamSessions', JSON.stringify(sessions));
        debugLog('Removed session from localStorage:', messageId);
    } catch (e) {
        console.error('Error removing session from localStorage:', e);
    }
};

// Clean up old sessions (older than 30 minutes)
const cleanupOldSessions = () => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        const now = Date.now();
        let changed = false;

        Object.keys(sessions).forEach(messageId => {
            const session = sessions[messageId];
            if (session.isComplete || (now - session.lastUpdated > 30 * 60 * 1000)) {
                delete sessions[messageId];
                changed = true;
                debugLog('Cleaned up old session:', messageId);
            }
        });

        if (changed) {
            localStorage.setItem('activeStreamSessions', JSON.stringify(sessions));
        }
    } catch (e) {
        console.error('Error cleaning up old sessions:', e);
    }
};

let debugMode = true; // Enable debug logging

export function debugLog(...args: any[]) {
    if (debugMode) {
        console.log('[StreamMiddleware]', ...args);
    }
}

// Add this function to the middleware file
export const getActiveStreamingSession = () => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        // Find the first active session that isn't complete
        const activeSession = Object.entries(sessions).find(([_, session]: [string, any]) =>
            session && !session.isComplete
        );

        return activeSession ? { messageId: activeSession[0], session: activeSession[1] } : null;
    } catch (e) {
        console.error('Error getting active streaming session:', e);
        return null;
    }
};

// Update the checkAndReconnectStreams function
const checkAndReconnectStreams = (storeRef: any) => {
    cleanupOldSessions();

    const sessions = getAllSessions();
    const sessionCount = Object.keys(sessions).length;
    debugLog('Checking for active streams to reconnect...', sessionCount);

    if (sessionCount > 0) {
        // Find any active streaming session
        for (const [messageId, session] of Object.entries(sessions)) {
            debugLog('Session found:', messageId, session);

            if (!session || typeof session !== 'object') continue;

            if (!session.isComplete) {
                debugLog(`Found incomplete session: ${messageId}`);

                // First, restore the content we have so far
                const updatedMessage: IMessage = {
                    id: messageId,
                    content: session.content || '',
                    created_at: new Date().toISOString(),
                    sender: assistantSender,
                    avatar: '',
                    room_id: ''
                };

                // Safely dispatch after a small delay
                setTimeout(() => {
                    storeRef.dispatch({
                        ...updateMessage({
                            roomId: updatedMessage.room_id,
                            messageId: updatedMessage.id,
                            content: updatedMessage.content,
                            // add other fields if needed, e.g. isStreaming
                        }),
                        _fromStreamingMiddleware: true
                    });

                    // Then set the streaming state to show the "Continue" button
                    storeRef.dispatch(setStreamingState({
                        isStreaming: false,
                        messageId: null,
                        canResume: true,
                        resumeMessageId: messageId
                    }));

                    // If this is the active session and we're on the same route, try to reconnect
                    if (session.currentRoute === window.location.pathname) {
                        debugLog('Attempting to auto-reconnect to stream on same route');
                        setTimeout(() => {
                            if (session.query && session.conversationHistory) {
                                storeRef.dispatch(resumeGeneration({ messageId }));
                            }
                        }, 500);
                    }
                }, 100);
            }
        }
    }
};

// Also update the visibility change handler to use setTimeout for dispatching
const setupVisibilityChangeHandler = (storeRef: any) => {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Page is now hidden (tab switch, minimize, etc.)
            // debugLog('Page visibility changed to hidden');

            // Get all active sessions
            const sessions = getAllSessions();

            // For each active session, save the current state
            Object.entries(sessions).forEach(([messageId, session]) => {
                if (!session || typeof session !== 'object') return;

                if (!session.isComplete) {
                    debugLog(`Saving session state for ${messageId} before tab switch`);

                    // Mark the session with a special flag
                    saveSession(messageId, {
                        ...session as object,
                        tabSwitched: true,
                        lastContent: session.content
                    });
                }
            });
        } else if (document.visibilityState === 'visible') {
            // Page is now visible again
            // debugLog('Page visibility changed to visible');

            // Get all sessions that were active when tab was switched
            const sessions = getAllSessions();

            // For each session that was interrupted by tab switch
            Object.entries(sessions).forEach(([messageId, session]) => {
                if (!session || typeof session !== 'object') return;

                if (session.tabSwitched && !session.isComplete) {
                    debugLog(`Restoring session ${messageId} after tab switch`);

                    // Restore the message content
                    if (session.lastContent) {
                        const updatedMessage: IMessage = {
                            id: messageId,
                            content: session.lastContent,
                            created_at: new Date().toISOString(),
                            sender: assistantSender,
                            avatar: '',
                            room_id: ''
                        };

                        // Use setTimeout to safely dispatch
                        setTimeout(() => {
                            storeRef.dispatch({
                                ...updateMessage({
                                    roomId: updatedMessage.room_id,
                                    messageId: updatedMessage.id,
                                    content: updatedMessage.content,
                                    // add other fields if needed, e.g. isStreaming
                                }),
                                _fromStreamingMiddleware: true
                            });

                            // Update the session to remove the tab switch flag
                            saveSession(messageId, {
                                ...session as object,
                                tabSwitched: false
                            });

                            // Set the streaming state to show the "Continue" button
                            storeRef.dispatch(setStreamingState({
                                isStreaming: false,
                                messageId: null,
                                canResume: true,
                                resumeMessageId: messageId
                            }));
                        }, 100);
                    }
                }
            });
        }
    });
};

// Add this at the top level, outside any functions
let controller: AbortController | null = null;

// COMPLETELY DISABLE ALL STREAMING UPDATES
const streamingMiddleware: Middleware = store => next => action => {
    // Create a reference to the store for use in callbacks
    const storeRef = store;

    // Check if this is the first time the middleware is being initialized
    if (typeof window !== 'undefined' && !(window as any).__streamingMiddlewareInitialized) {
        // Set a flag to prevent multiple initializations
        (window as any).__streamingMiddlewareInitialized = true;

        // Setup visibility change handler only once
        setupVisibilityChangeHandler(storeRef);

        // Check for active streams to reconnect
        setTimeout(() => {
            checkAndReconnectStreams(storeRef);
        }, 1000);
    }

    // Check if the action is coming from the streaming middleware itself
    // This prevents infinite loops when the middleware dispatches actions
    // @ts-expect-error
    if (action && action._fromStreamingMiddleware) {
        // Pass through without additional processing
        return next(action);
    }

    // Just pass through all other actions
    return next(action);
};

export default streamingMiddleware; 