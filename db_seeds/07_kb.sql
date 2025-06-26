CREATE TABLE IF NOT EXISTS knowledge_bases (
    id TEXT PRIMARY KEY, -- Using TEXT for ID as it can be a path or a UUID-like string from external services
    name TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL, -- Path for local, unique ID for cloud
    url TEXT NOT NULL,    -- Path for local, URL for cloud
    create_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enabled BOOLEAN DEFAULT FALSE,
    configured BOOLEAN DEFAULT FALSE,
    embedding_engine TEXT,
    workspace_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('public', 'private')) -- "public" for Onlysaid KB, "private" for local
);
