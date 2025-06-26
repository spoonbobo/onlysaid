export interface IChatRoom {
    id: string;
    created_at: string;
    last_updated: string;
    name: string;
    unread: number;
    type: string;
    workspace_id?: string;
    user_id?: string;
}

export interface ICreateChatRequest {
    created_at: string;
    last_updated: string;
    name: string;
    unread: number;
    user_id?: string;
}

export interface ICreateChatArgs {
    token: string;
    request: ICreateChatRequest;
}

export interface IGetChatArgs {
    token: string;
    userId: string;
    type: string;
    workspaceId?: string;
}

export interface IUpdateChatArgs {
    token: string;
    request: IChatRoom;
}
