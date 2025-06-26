// Define the UserSettings interface
export interface GeneralSettings {
    theme: string;
    language?: string;
}

// Define the structure for a single Knowledge Base item
export interface KnowledgeBaseItem {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    sourceType?: string;
    // Add any other relevant properties for a KB item here
    url?: string;
}

export interface KnowledgeBaseSettings {
    source?: string;
    enableKnowledgeBase?: boolean;
    apiKey?: string;
    apiUrl?: string;
    // Add the array of knowledge base items
    knowledgeBases?: KnowledgeBaseItem[];
    // Add missing properties
    relevanceThreshold?: number;
    maxResults?: number;
}

export interface MCPSettings {
    defaultModel?: string;
    temperature?: number;
    enableStreaming?: boolean;
    responseStyle?: string;
    apiKey?: string;
    apiUrl?: string;
}

export interface UserSettings {
    general?: GeneralSettings;
    knowledgeBase?: KnowledgeBaseSettings;
    mcp?: MCPSettings;
    // Add an index signature to allow string indexing
    [key: string]: any;
}

export interface User {
    id?: string;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
    avatar?: string;
    settings: UserSettings;
    lastOpenedTeam?: string;

    role?: string;
}