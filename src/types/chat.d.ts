import { User } from "./user";

// client -> server Message
export interface IMessage {
    id: string;
    created_at: string;
    sender: User;
    content: string;
    avatar: string;
    room_id: string;
    mentions?: User[];  // Array of mentioned users
    isStreaming?: boolean;
}

export interface IChatBubbleProps {
    message: IMessage;
    isUser: boolean;
    isFirstInGroup: boolean;
    isTaskMode?: boolean;
}

// client-view
export interface IChatRoom {
    id: string;
    created_at: string;
    last_updated: string;
    name: string;
    unread: number;
    active_users: string[];
}

// server -> client message
// this update will be sent to all clients in the room.
// active_users -> chatroom (#people, who are they)
export interface IChatRoomUpdate {
    id: string;
    active_users: User[];
    messages: IMessage[];
}
