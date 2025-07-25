-- Create the chat_rooms table
CREATE TABLE IF NOT EXISTS chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type TEXT DEFAULT 'chat', -- agent, friend, workspace
    name TEXT DEFAULT 'New Chat',
    unread INTEGER DEFAULT 0,
    workspace_id UUID,
    user_id UUID
);

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    chat_id UUID,
    sender UUID,
    avatar TEXT,
    -- TODO: to be added
    text TEXT,
    reactions JSONB,
    reply_to UUID,
    mentions UUID[],
    image UUID,
    video UUID,
    audio UUID,
    poll UUID,
    contact UUID,
    gif UUID
);

-- Updated chat_members table
CREATE TABLE IF NOT EXISTS chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
    UNIQUE(chat_id, user_id)
);
