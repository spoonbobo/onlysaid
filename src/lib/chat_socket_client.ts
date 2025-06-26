// do not delete below line.
// import { io, Manager } from "socket.io-client";
import io from "socket.io-client";
import { User } from "@/types/user";
import { IMessage } from "@/types/chat";
import { toaster } from '@/components/ui/toaster';
import { INotification } from "@/types/notification";

class ChatSocketClient {
    socket: any;
    private user: User;
    private messageCallback: ((message: IMessage) => void) | null = null;
    private notificationCallback: ((notification: INotification) => void) | null = null;
    private messageDeletedCallback: ((data: { roomId: string, messageId: string }) => void) | null = null;
    private deletedMessageTracker: Set<string> = new Set(); // Track deleted messages to prevent loops

    constructor(user: User) {
        this.user = user;
    }

    initialize(): void {
        console.log("ChatSocketClient.initialize called", {
            username: this.user.username,
            socketUrl: window.location.origin
        });

        if (this.user.username === "") {
            console.warn("Cannot initialize socket: username is empty");
            return;
        }

        const socketUrl = window.location.origin;
        console.log("Initializing socket with URL:", socketUrl);
        console.log("this.user", this.user);

        this.socket = io(socketUrl, {
            auth: {
                user: this.user
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        console.log("Socket created:", !!this.socket);

        // Add direct event listeners for debugging
        this.socket.on('connect', () => {
            console.log("Socket connected successfully");
            // Set up message listener after connection is established
            if (this.messageCallback) {
                this.setupMessageListener(this.messageCallback);
            }
            if (this.notificationCallback) {
                this.setupNotificationListener(this.notificationCallback);
            }
            if (this.messageDeletedCallback) {
                this.setupMessageDeletedListener(this.messageDeletedCallback);
            }
        });

        this.socket.on('connect_error', (err: any) => {
            toaster.create({
                title: "Connection Error",
                description: "Failed to connect to chat server",
                type: "error"
            });
        });

        this.socket.on('error', (err: any) => {
            toaster.create({
                title: "Socket Error",
                description: "An error occurred with the chat connection",
                type: "error"
            });
        });
    }

    onConnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('connect', callback);
        }
    }

    joinRoom(roomId: string): void {
        console.log("ChatSocketClient.joinRoom called with roomId:", roomId);
        if (this.socket && this.socket.connected) {
            console.log("Socket is connected, emitting join_room event with roomId:", roomId);
            this.socket.emit('join_room', roomId);
            console.log("join_room event emitted");
        } else {
            console.error("Cannot join room: Socket not connected", {
                socketExists: !!this.socket,
                socketConnected: this.socket?.connected
            });
        }
    }

    inviteToRoom(roomId: string, userIds: string[]): void {
        console.log("inviteToRoom", roomId, userIds);
        console.log("this.socket", this.socket);
        console.log("this.socket.connected", this.socket.connected);
        if (this.socket && this.socket.connected) {
            this.socket.emit('invite_to_room', { roomId, userIds });
        } else {
            //
        }
        // console.log("invite_to_room", roomId, userIds);
    }

    quitRoom(roomId: string): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('quit_room', roomId);
        } else {
            //
        }
    }

    onDisconnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('disconnect', callback);
        }
    }

    onMessage(callback: (message: IMessage) => void): void {
        // Store the callback for later use if socket isn't connected yet
        this.messageCallback = callback;

        if (this.socket && this.socket.connected) {
            this.setupMessageListener(callback);
        } else {
            // console.log("Socket not connected yet, message listener will be set up after connection");
        }
    }

    onNotification(callback: (notification: INotification) => void): void {
        this.notificationCallback = callback;

        if (this.socket && this.socket.connected) {
            console.log("Socket connected, setting up notification listener");
            this.setupNotificationListener(callback);
        } else {
            // Add error handling or connection waiting logic here
            console.log("Socket not connected yet, notification listener will be set up after connection");
        }
    }

    deleteMessage(roomId: string, messageId: string): void {
        if (this.socket && this.socket.connected) {
            // Add to tracker to prevent loops
            const messageKey = `${roomId}:${messageId}`;
            this.deletedMessageTracker.add(messageKey);

            // Set a timeout to clean up the tracker after a reasonable time
            setTimeout(() => {
                this.deletedMessageTracker.delete(messageKey);
            }, 10000); // 10 seconds should be enough

            this.socket.emit('delete_message', { roomId, messageId });
        } else {
            //
        }
    }

    onMessageDeleted(callback: (data: { roomId: string, messageId: string }) => void): void {
        this.messageDeletedCallback = callback;

        if (this.socket && this.socket.connected) {
            this.setupMessageDeletedListener(callback);
        }
    }

    private setupMessageListener(callback: (message: IMessage) => void): void {
        // Remove any existing listeners to prevent duplicates
        this.socket.off('message');

        this.socket.on('message', (data: any) => {

            try {
                // Handle both string and object formats
                const messageData = typeof data === 'string' ? JSON.parse(data) : data;

                if (messageData && messageData.room_id) {
                    // toaster.create({
                    //     title: "Message Processed",
                    //     description: "Valid message received",
                    //     type: "success"
                    // });
                    // console.log("Message received in socket client:", messageData);
                    callback(messageData);
                } else {
                    toaster.create({
                        title: "Invalid Message",
                        description: "Received malformed message structure",
                        type: "error"
                    });
                }
            } catch (error) {
                toaster.create({
                    title: "Message Error",
                    description: "Error processing received message",
                    type: "error"
                });
            }
        });
    }

    private setupNotificationListener(callback: (notification: INotification) => void): void {
        // Remove any existing listeners to prevent duplicates
        this.socket.off('notification');

        this.socket.on('notification', (data: any) => {
            try {
                // Handle both string and object formats
                const notificationData = typeof data === 'string' ? JSON.parse(data) : data;
                console.log("notificationData", notificationData);

                if (notificationData && notificationData.notification_id) {
                    // Extract relevant information from the notification
                    const processedNotification: INotification = {
                        id: notificationData.notification_id,
                        message: notificationData.message,
                        sender: notificationData.sender,
                        timestamp: new Date().toISOString(),
                        notification_id: notificationData.notification_id,
                        created_at: notificationData.created_at,
                        updating_plan: notificationData.updating_plan,
                        room_id: notificationData.room_id
                    };

                    // Show toast for mentions
                    if (notificationData.message && notificationData.message.includes('@')) {
                        toaster.create({
                            title: `Mention from ${notificationData.sender?.username || 'Someone'}`,
                            description: notificationData.message || "You were mentioned",
                            type: "info"
                        });
                    }

                    // Handle plan update notifications
                    if (notificationData.updating_plan) {
                        // Dispatch event for plan update
                        const planUpdateEvent = new CustomEvent('plan-update', {
                            detail: { planId: notificationData.updating_plan }
                        });
                        window.dispatchEvent(planUpdateEvent);

                        toaster.create({
                            title: "Plan Update",
                            description: "A plan has been updated",
                            type: "info"
                        });
                    }

                    console.log("processedNotification", processedNotification);

                    callback(processedNotification);
                } else {
                    toaster.create({
                        title: "Invalid Notification",
                        description: "Received malformed notification structure",
                        type: "error"
                    });
                }
            } catch (error) {
                toaster.create({
                    title: "Notification Error",
                    description: "Error processing received notification",
                    type: "error"
                });
            }
        });
    }

    private setupMessageDeletedListener(callback: (data: { roomId: string, messageId: string }) => void): void {
        // Remove any existing listeners to prevent duplicates
        this.socket.off('message_deleted');

        this.socket.on('message_deleted', (data: any) => {
            try {
                // Handle both string and object formats
                const deletedData = typeof data === 'string' ? JSON.parse(data) : data;

                if (deletedData && deletedData.roomId && deletedData.messageId) {
                    // Check if we've already processed this deletion
                    const messageKey = `${deletedData.roomId}:${deletedData.messageId}`;
                    if (!this.deletedMessageTracker.has(messageKey)) {
                        callback(deletedData);
                    } else {
                        console.log("Skipping already processed message deletion:", messageKey);
                    }
                } else {
                    toaster.create({
                        title: "Invalid Delete Data",
                        description: "Received malformed message deletion data",
                        type: "error"
                    });
                }
            } catch (error) {
                toaster.create({
                    title: "Message Deletion Error",
                    description: "Error processing message deletion",
                    type: "error"
                });
            }
        });
    }

    onRoomUpdate(callback: (room: any) => void): void {
        if (this.socket) {
            this.socket.on('room_update', callback);
        }
    }

    sendMessage(message: IMessage): void {
        console.log("ChatSocketClient.sendMessage called with:", message);
        if (this.socket && this.socket.connected) {
            console.log("Socket is connected, emitting message event");
            this.socket.emit('message', message);
            console.log("Message event emitted");
        } else {
            console.error("Cannot send message: Socket not connected", {
                socketExists: !!this.socket,
                socketConnected: this.socket?.connected
            });
            toaster.create({
                title: "Cannot Send Message",
                description: "Socket not connected",
                type: "error"
            });
        }
    }

    sendNotification(notification: INotification): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('notification', notification);
        } else {
            toaster.create({
                title: "Cannot Send Notification",
                description: "Socket not connected",
                type: "error"
            });
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            // toaster.create({
            //     title: "Disconnected",
            //     description: "Socket disconnected successfully",
            //     type: "info"
            // });
        }
    }
}

export default ChatSocketClient;