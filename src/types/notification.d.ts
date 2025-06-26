/**
 * Notification type definitions
 */

export interface INotification {
    id?: string;
    notification_id: string;
    message: string;
    sender?: string;
    receivers?: string[];
    created_at: string;
    room_id?: string;
    updating_plan?: string;

    // Frontend-specific properties
    title?: string;
    read?: boolean;
    timestamp?: string; // Formatted version of created_at
}

export interface NotificationProps {
    notifications?: Notification[];
    onNotificationClick?: (id: string) => void;
}

// API response types
export interface GetNotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
}

export interface MarkNotificationReadResponse {
    success: boolean;
    notification?: Notification;
}
