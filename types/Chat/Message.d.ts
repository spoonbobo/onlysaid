import { IUser } from "@/types/User/User";
import { IFile } from "../File/File";
import type OpenAI from 'openai';

export interface IChatMessageToolCallFunction {
    name: string;
    arguments: string | Record<string, any>; // Allows string or parsed object for arguments
}

export interface IChatMessageToolCall {
    id: string;
    type: 'function';
    function: IChatMessageToolCallFunction;
    tool_description?: string;
    mcp_server?: string;
    status?: 'pending' | 'approved' | 'denied' | 'executed' | 'error' | string;
    result?: string | Record<string, any>;
    execution_time_seconds?: number;
    osswarm_call?: boolean;
}

export interface IEncryptedMessage {
    encryptedContent: string;    // Base64 encrypted message content
    iv: string;                  // Initialization vector for AES
    keyVersion: number;          // Which workspace key version was used
    algorithm: 'AES-GCM-256';    // Encryption algorithm
}

export interface IChatMessage {
    id: string;
    created_at: string;
    updated_at?: string;
    sent_at?: string;
    chat_id: string;
    sender: string;
    status?: string;
    reactions?: string | IReaction[];  // Allow both string and array
    reply_to?: string;
    mentions?: string;
    file_ids?: string;
    poll?: string;
    contact?: string;
    gif?: string;
    text?: string;
    files?: IFile[];
    sender_object?: IUser;
    tool_calls?: IChatMessageToolCall[];
    
    // Add new field
    isRead?: boolean;
    readAt?: string;
    // Add workspace_id directly to messages
    workspace_id?: string;
    is_encrypted?: boolean;
    encrypted_text?: IEncryptedMessage;
}

export interface IReaction {
    id: string;
    created_at: string;
    reaction: string;
    message_id: string;
    user_id: string;
}

export interface IUserCryptoKeys {
    userId: string;
    masterKeySalt: string;       // Stored in DB, used to derive master key
    masterKey?: string;          // Runtime only, never stored
}

export interface IWorkspaceKey {
    workspaceId: string;
    keyData: string;             // The actual symmetric key (AES-256)
    keyVersion: number;          // For key rotation
    createdAt: string;
    createdBy: string;           // User who created this key version
}

export interface IUserWorkspaceKey {
    userId: string;
    workspaceId: string;
    encryptedWorkspaceKey: string;  // Workspace key encrypted with user's master key
    keyVersion: number;
    hasAccess: boolean;
    grantedAt: string;
    grantedBy: string;
}

export interface ICryptoService {
    // User master key management
    deriveMasterKey(password: string, salt: string): Promise<string>;
    generateKeySalt(): string;
    
    // Workspace key management
    generateWorkspaceKey(): Promise<IWorkspaceKey>;
    encryptWorkspaceKey(workspaceKey: string, masterKey: string): Promise<string>;
    decryptWorkspaceKey(encryptedKey: string, masterKey: string): Promise<string>;
    
    // Message encryption/decryption
    encryptMessage(message: string, workspaceKey: string): Promise<IEncryptedMessage>;
    decryptMessage(encryptedMessage: IEncryptedMessage, workspaceKey: string): Promise<string>;
}

