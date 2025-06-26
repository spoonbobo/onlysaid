CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,                                -- UUID for the file
    workspace_id UUID NOT NULL,                         -- Foreign key to workspaces table
    user_id UUID,                                       -- ID of the user who uploaded the file (can be NULL if uploaded by system)
    name TEXT NOT NULL,                                 -- Original name of the file
    path TEXT NOT NULL UNIQUE,                  -- Full path where the file is stored on the server (e.g., /storage/workspace_id/file_id.ext)
    mime_type TEXT,                                     -- MIME type of the file (e.g., image/png, application/pdf)
    size BIGINT,                                        -- Size of the file in bytes
    metadata JSONB,                                     -- Any additional metadata (e.g., { "type": "workspace-logo" })
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_workspace
        FOREIGN KEY(workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,    -- If a workspace is deleted, also delete its files

    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id) -- Assuming you have a 'users' table with 'id' as PK
        ON DELETE SET NULL    -- If a user is deleted, set user_id in files to NULL (or CASCADE if files should be deleted)
);

-- Optional: Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files (workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files (mime_type);
