CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    image TEXT,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE,
    settings JSONB
);

-- Core policy definitions
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'user.read', 'user.readAll', 'chat.write', 'kb.admin'
    description TEXT,
    resource_type TEXT NOT NULL, -- e.g., 'user', 'chat', 'kb', 'workspace', 'file'
    action TEXT NOT NULL, -- e.g., 'read', 'write', 'delete', 'share', 'admin'
    scope TEXT DEFAULT 'self', -- 'self', 'workspace', 'all'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role definitions (groups of policies)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., 'member', 'admin', 'super_admin', 'kb_editor'
    description TEXT,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL for global roles
    is_system_role BOOLEAN DEFAULT FALSE, -- Built-in roles vs custom roles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, workspace_id)
);

-- Role-to-policy mappings (what permissions each role has)
CREATE TABLE IF NOT EXISTS role_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, policy_id)
);

-- Updated workspace_users table with role_id reference
CREATE TABLE IF NOT EXISTS workspace_users (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT, -- Keep for backward compatibility during migration
    role_id UUID REFERENCES roles(id), -- New policy-based role reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id)
);

-- User role assignments (supports multiple roles per user)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL for global roles
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id, workspace_id)
);

-- User-specific policy assignments (direct permissions)
CREATE TABLE IF NOT EXISTS user_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL for global permissions
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id), -- Who granted this permission
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workspace_id, policy_id)
);

-- Resource-specific permissions (for fine-grained control)
CREATE TABLE IF NOT EXISTS resource_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- e.g., 'chat', 'kb', 'file'
    resource_id TEXT NOT NULL, -- The specific resource ID
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource_type, resource_id, policy_id)
);

-- Policy conditions (for advanced rule-based permissions)
CREATE TABLE IF NOT EXISTS policy_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL, -- e.g., 'time_based', 'ip_based', 'device_based'
    condition_data JSONB NOT NULL, -- Flexible condition parameters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_join (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    inviter_id UUID NOT NULL,
    invitee_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (inviter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    moodle_course_id TEXT,
    moodle_api_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE(workspace_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_policies_user_workspace ON user_policies(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_workspace ON user_roles(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_resource ON resource_permissions(user_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_policies_resource_action ON policies(resource_type, action);
CREATE INDEX IF NOT EXISTS idx_role_policies_role ON role_policies(role_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_role_id ON workspace_users(role_id);

-- Insert basic policies
INSERT INTO policies (name, description, resource_type, action, scope) VALUES
('user.read', 'Read own user profile', 'user', 'read', 'self'),
('user.readAll', 'Read all user profiles in workspace', 'user', 'read', 'workspace'),
('user.write', 'Edit own user profile', 'user', 'write', 'self'),
('user.admin', 'Manage all users in workspace', 'user', 'admin', 'workspace'),
('chat.read', 'Read chat messages', 'chat', 'read', 'workspace'),
('chat.write', 'Send chat messages', 'chat', 'write', 'workspace'),
('chat.share', 'Share chat messages', 'chat', 'share', 'workspace'),
('chat.admin', 'Manage chat settings', 'chat', 'admin', 'workspace'),
('kb.read', 'Read knowledge base', 'kb', 'read', 'workspace'),
('kb.write', 'Edit knowledge base', 'kb', 'write', 'workspace'),
('kb.share', 'Share knowledge base content', 'kb', 'share', 'workspace'),
('kb.admin', 'Manage knowledge base', 'kb', 'admin', 'workspace'),
('workspace.read', 'View workspace details', 'workspace', 'read', 'workspace'),
('workspace.write', 'Edit workspace settings', 'workspace', 'write', 'workspace'),
('workspace.admin', 'Manage workspace settings', 'workspace', 'admin', 'workspace'),
('workspace.invite', 'Invite users to workspace', 'workspace', 'invite', 'workspace'),
('workspace.delete', 'Delete workspace', 'workspace', 'delete', 'workspace')
ON CONFLICT (name) DO NOTHING;

-- Create system roles
INSERT INTO roles (name, description, is_system_role) VALUES
('member', 'Basic workspace member', true),
('admin', 'Workspace administrator', true),
('super_admin', 'Super administrator with full access', true)
ON CONFLICT (name, workspace_id) DO NOTHING;

-- Map policies to roles (member)
INSERT INTO role_policies (role_id, policy_id)
SELECT r.id, p.id FROM roles r, policies p 
WHERE r.name = 'member' AND r.workspace_id IS NULL AND p.name IN (
    'user.read', 'user.write', 'chat.read', 'chat.write', 'kb.read', 'workspace.read'
)
ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Map policies to roles (admin)
INSERT INTO role_policies (role_id, policy_id)
SELECT r.id, p.id FROM roles r, policies p 
WHERE r.name = 'admin' AND r.workspace_id IS NULL AND p.name IN (
    'user.read', 'user.write', 'user.readAll', 
    'chat.read', 'chat.write', 'chat.share',
    'kb.read', 'kb.write', 'kb.share',
    'workspace.read', 'workspace.write', 'workspace.invite'
)
ON CONFLICT (role_id, policy_id) DO NOTHING;

-- Map policies to roles (super_admin) - gets all policies
INSERT INTO role_policies (role_id, policy_id)
SELECT r.id, p.id FROM roles r, policies p 
WHERE r.name = 'super_admin' AND r.workspace_id IS NULL
ON CONFLICT (role_id, policy_id) DO NOTHING;

ALTER TABLE roles ADD COLUMN display_order INTEGER DEFAULT 0;
