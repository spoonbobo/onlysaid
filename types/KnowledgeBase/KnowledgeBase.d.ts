export interface IKnowledgeBase {
    id: string;
    name: string;
    description: string;
    source: string;
    url: string;
    create_at: string;
    update_at: string;
    enabled: boolean;
    configured: boolean;
    embedding_engine: string;
    workspace_id: string;
    type: "public" | "private";

    size?: number;
    documents?: number;
}

export interface IKnowledgeBaseRegisterArgs {
    id: string;
    name: string;
    description: string;
    source: string;
    url: string;
    workspace_id: string;
    type: string;
    embedding_engine: string;
    configured?: boolean;
}

// Centralized IPC Argument Interfaces
export interface IKBListIPCArgs {
    workspaceId: string;
    token: string;
}

export interface IKBCreateIPCArgs {
    kbData: IKnowledgeBaseRegisterArgs; // workspace_id is within kbData
    token: string;
}

export interface IKBGetIPCArgs {
    workspaceId: string;
    kbId: string;
    token: string;
}

export interface IKBUpdateIPCArgs {
    workspaceId: string;
    kbId: string;
    kbUpdateData: Partial<Omit<IKnowledgeBase, 'id' | 'workspace_id'>>; // Consistent with store
    token: string;
}

export interface IKBDeleteIPCArgs {
    workspaceId: string;
    kbId: string;
    token: string;
}

export interface IKBViewIPCArgs {
    workspaceId: string;
    // token is not currently used by the handler's implementation
}

export interface IKBQueryIPCArgs {
    query: string;
    workspaceId: string;
    // token?: string; // Not currently used by handler's implementation
}

// New IPC argument interfaces for the requested actions
export interface IKBRegisterIPCArgs {
    kbData: IKnowledgeBaseRegisterArgs; // workspace_id is within kbData
    token: string;
}

export interface IKBGetStatusIPCArgs {
    workspaceId: string;
    kbId: string; // Using kbId for consistency
    token: string;
}

export interface IKBSynchronizeIPCArgs {
    workspaceId: string;
    kbId: string; // Using kbId for consistency
    token: string;
}

export interface IKBFullUpdateIPCArgs {
    workspaceId: string;
    kbId: string;
    kbData: IKnowledgeBase; // Full IKnowledgeBase object
    token: string;
}
