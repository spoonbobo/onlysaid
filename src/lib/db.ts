import knex, { Knex } from 'knex';

export const DBTABLES = {
    CHATROOM: 'chat',
    CHAT_MEMBERS: 'chat_members',
    MESSAGES: 'messages',
    PLANS: 'plans',
    TASKS: 'tasks',
    LOGS: 'logs',
    SKILLS: 'skills',
    USERS: 'users',
    WORKSPACES: 'workspaces',
    WORKSPACE_USERS: 'workspace_users',
    WORKSPACE_JOIN: 'workspace_join',
    WORKSPACE_INVITATIONS: 'workspace_invitations',
    WORKSPACE_SETTINGS: 'workspace_settings',
    KNOWLEDGE_BASES: 'knowledge_bases',
    KNOWLEDGE_BASE_MEMBERS: 'knowledge_base_members',
    FILES: 'files',
    USER_DEVICES: 'user_devices'
}

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: parseInt(process.env.PGPORT || '5432'),
    },
    pool: { min: 0, max: 7 }
});

export default db as Knex; 