// Simple permission logic based on workspace role
const WORKSPACE_PERMISSIONS = {
    // Chat permissions by workspace role
    chat: {
        member: { read: true, write: true, share: false },
        admin: { read: true, write: true, share: true },
        super_admin: { read: true, write: true, share: true, control: true }
    },

    // KB permissions by workspace role  
    kb: {
        member: { read: true, write: false, share: false },
        admin: { read: true, write: true, share: true },
        super_admin: { read: true, write: true, share: true, control: true }
    }
};