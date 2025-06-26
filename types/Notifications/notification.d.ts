export interface INotificationData {
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
    content?: string;
    read?: boolean;
    timestamp?: string; // Formatted version of created_at
    type?: 'message' | 'mention' | 'workspace_invite' | 'system';
    
    // Context properties
    workspaceId?: string;
    workspaceSection?: string;
    workspaceContext?: string;
    homeSection?: string;
    homeContext?: string;
    
    // Add this for message deduplication
    messageId?: string;
}

export interface INotificationCounts {
    home: number;
    homeSections: Record<string, number>;
    homeContexts: Record<string, Record<string, number>>;
    workspaces: Record<string, number>;
    workspaceSections: Record<string, Record<string, number>>;
    workspaceContexts: Record<string, Record<string, Record<string, number>>>;
}
