import { Middleware } from 'redux';
import ChatSocketClient from '@/lib/chat_socket_client';
import { User } from '@/types/user';
import {
    setSocketConnected,
    addMessage,
    updateRoom,
    setSelectedRoom,
    setUnreadCount,
    clearSelectedRoom,
    deleteMessage
} from '../features/chatSlice';
import { IMessage } from '@/types/chat';
import { INotification } from '@/types/notification';
import { toaster } from '@/components/ui/toaster';
import { v4 as uuidv4 } from 'uuid';
import { addNotification } from '../features/notificationSlice';

let socketClient: ChatSocketClient | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const CONNECTION_RETRY_DELAY = 2000; // 2 seconds

interface ChatAction {
    type: string;
    payload?: any;
}

export const socketMiddleware: Middleware = store => next => (action: unknown) => {
    // GUARD: Prevent recursion from streamingMiddleware or other flagged actions
    if ((action as any)._fromStreamingMiddleware) {
        return next(action);
    }

    const { dispatch, getState } = store;
    const chatAction = action as ChatAction;

    // console.log('Action received in middleware:', (action as ChatAction).type);

    // Handle socket initialization
    if (chatAction.type === 'chat/initializeSocket') {
        const user: User = chatAction.payload;
        // console.log("Initializing socket with user:", user);
        connectionAttempts = 0;

        // clean up if needed.
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
        }

        // Create a new socket client
        socketClient = new ChatSocketClient(user);
        // console.log("Socket client created:", !!socketClient);

        // Set up event listeners
        socketClient.onConnect(() => {
            console.log("Socket connected callback triggered");
            dispatch(setSocketConnected(true));
            connectionAttempts = 0; // Reset connection attempts on successful connection
        });

        socketClient.onDisconnect(() => {
            console.log("Socket disconnected callback triggered");
            dispatch(setSocketConnected(false));

            // Try to reconnect automatically if disconnected
            if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
                connectionAttempts++;
                console.log(`Attempting to reconnect (${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);

                setTimeout(() => {
                    if (socketClient) {
                        console.log("Reinitializing socket connection...");
                        socketClient.initialize();
                    } else {
                        console.log("Socket client is null, dispatching initializeSocket again");
                        const currentUser = getState().user.currentUser;
                        if (currentUser) {
                            dispatch({ type: 'chat/initializeSocket', payload: currentUser });
                        }
                    }
                }, CONNECTION_RETRY_DELAY);
            } else {
                toaster.create({
                    title: "Socket Disconnected",
                    description: "Please try reconnecting later",
                    type: "error"
                });
            }
        });

        socketClient.onMessage((message: IMessage) => {
            console.log("Message received in middleware:", message);
            if (message && message.room_id) {
                dispatch(addMessage({ roomId: message.room_id, message }));
            } else {
                toaster.create({
                    title: "Invalid message format",
                    description: "Please try again later",
                    type: "error"
                });
            }
        });

        socketClient.onMessageDeleted((data: { roomId: string, messageId: string }) => {
            console.log("Message deleted event received:", data);
            dispatch(deleteMessage(data));
        });

        socketClient.onNotification((notification: INotification) => {
            console.log("Notification received in middleware:", notification);
            dispatch(addNotification(notification));
        });

        socketClient.onRoomUpdate((room) => {
            dispatch(updateRoom(room));
            toaster.create({
                title: "Room Updated",
                description: `Room ${room.id} updated`,
                type: "info"
            });
        });

        // Initialize the connection
        console.log("Calling initialize on socket client");
        socketClient.initialize();

        // Log the new state after initialization
        console.log("New socket state after initialization:", {
            socketExists: !!socketClient,
            socketConnected: socketClient?.socket?.connected
        });

        // Set a timeout to check if the connection was successful
        setTimeout(() => {
            if (socketClient && !socketClient.socket?.connected) {
                console.log("Socket not connected after initialization timeout, retrying...");
                if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
                    connectionAttempts++;
                    console.log(`Retrying connection (${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
                    socketClient.initialize();
                }
            }
        }, 3000); // Check after 3 seconds

        return next(action);
    }

    // Handle socket disconnection
    if (chatAction.type === 'chat/disconnectSocket') {
        console.log("Disconnecting socket");
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
            dispatch(setSocketConnected(false));
        }

        return next(action);
    }

    // Handle sending messages
    if (chatAction.type === 'chat/sendMessage') {
        console.log("Sending message in middleware:", chatAction.payload.message);
        console.log("Current socket state when sending:", {
            socketExists: !!socketClient,
            socketConnected: socketClient?.socket?.connected
        });

        // Check if we have a socket client
        if (socketClient && socketClient.socket?.connected) {
            console.log("Socket client exists and is connected, attempting to send message");
            try {
                socketClient.sendMessage(chatAction.payload.message);
                console.log("Message sent through socket client");
            } catch (error) {
                console.error("Error sending message through socket client:", error);
                toaster.create({
                    title: "Error",
                    description: "Failed to send message. Please try again.",
                    type: "error"
                });
            }
        } else {
            console.error("Cannot send message: Socket not connected", {
                socketExists: !!socketClient,
                socketConnected: socketClient?.socket?.connected
            });

            // Show error toast instead of trying to re-initialize
            toaster.create({
                title: "Cannot Send Message",
                description: "You are not connected to the chat server. Please refresh the page.",
                type: "error"
            });

            // Attempt to re-initialize for future messages, but don't try to resend this one
            const currentUser = getState().user.currentUser;
            if (currentUser) {
                console.log("Attempting to re-initialize socket with current user for future messages");
                dispatch({ type: 'chat/initializeSocket', payload: currentUser });
            }
        }

        return next(action);
    }

    // Handle joining a room
    if (chatAction.type === 'chat/joinRoom') {
        const roomId = chatAction.payload;
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.joinRoom(roomId);
            dispatch(setSelectedRoom(roomId));
        }
        return next(action);
    }

    if (chatAction.type === 'chat/inviteToRoom') {
        const { roomId, userIds } = chatAction.payload;
        console.log("MIDDLEWARE: Inviting users to room:", roomId, userIds);
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.inviteToRoom(roomId, userIds);
        }
        return next(action);
    }

    if (chatAction.type === 'chat/quitRoom') {
        const roomId = chatAction.payload;
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.quitRoom(roomId);
            dispatch(clearSelectedRoom(roomId));
        }
        return next(action);
    }

    if (chatAction.type === 'chat/mentionUser') {
        const { message } = chatAction.payload;
        const notification: INotification = {
            notification_id: uuidv4(),
            message: message.content,
            sender: message.sender,
            receivers: message.mentions?.map((user: User) => user.id),
            created_at: new Date().toISOString(),
        }
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.sendNotification(notification);
        }
        return next(action);
    }

    if (chatAction.type === 'chat/deleteMessage') {
        const { roomId, messageId } = chatAction.payload;
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            // Immediately update the local state to prevent UI lag
            dispatch({ type: 'chat/localDeleteMessage', payload: { roomId, messageId } });

            // Send the delete request to the server
            socketClient.deleteMessage(roomId, messageId);
        }
        return next(action);
    }

    if ((action as ChatAction).type === 'plan/approvePlan') {
        console.log('Plan approve action detected in middleware');
        const plan = (action as ChatAction).payload;
        console.log('approvePlan plan data:', plan);
        const notification: INotification = {
            notification_id: uuidv4(),
            message: `Plan ${plan.plan_name} has been approved`,
            sender: plan.id,
            created_at: new Date().toISOString(),
            room_id: plan.room_id
        }
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.sendNotification(notification);
        }
        return next(action);
    }

    return next(action);
}; 
