import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";
import { inDevelopment } from "@/utils/common";

interface IAddUserToWorkspaceRequest {
    user_id?: string;
    email?: string;
    role_id?: string;
    role_name?: string; // For role lookup by name
}

interface IAssignRoleRequest {
    user_id: string;
    role_id: string;
}

const findUserByEmail = async (email: string) => {
    const user = await db(DBTABLES.USERS)
        .where('email', email)
        .first();
    return user;
};

const findRoleByName = async (roleName: string, workspaceId?: string) => {
    return await db('roles')
        .where('name', roleName)
        .where(builder => {
            if (workspaceId) {
                builder.where('workspace_id', workspaceId).orWhereNull('workspace_id');
            } else {
                builder.whereNull('workspace_id');
            }
        })
        .orderBy('workspace_id', 'desc') // Prefer workspace-specific roles
        .first();
};

// Check if user has permission to manage workspace users using new policy system
const hasUserManagementPermission = async (userId: string, workspaceId: string): Promise<boolean> => {
    // Check if user is admin/super_admin in workspace_users via role_id
    const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
        .join('roles', 'workspace_users.role_id', 'roles.id')
        .where('workspace_users.workspace_id', workspaceId)
        .where('workspace_users.user_id', userId)
        .whereIn('roles.name', ['admin', 'super_admin'])
        .first();

    if (workspaceUser) return true;

    // Check new policy system
    try {
        const hasDirectPolicy = await db('user_policies')
            .join('policies', 'user_policies.policy_id', 'policies.id')
            .where('user_policies.user_id', userId)
            .where('user_policies.workspace_id', workspaceId)
            .whereIn('policies.name', ['workspace.admin', 'user.admin'])
            .first();

        if (hasDirectPolicy) return true;

        const hasRolePolicy = await db('user_roles')
            .join('role_policies', 'user_roles.role_id', 'role_policies.role_id')
            .join('policies', 'role_policies.policy_id', 'policies.id')
            .where('user_roles.user_id', userId)
            .where('user_roles.workspace_id', workspaceId)
            .whereIn('policies.name', ['workspace.admin', 'user.admin'])
            .first();

        return !!hasRolePolicy;
    } catch (error) {
        console.log("Policy tables not available, using workspace_users check");
        return false;
    }
};

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const userRequests = await request.json();
    const { workspaceId } = await context.params;

    // Check permissions
    const hasPermission = await hasUserManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to add users" },
            { status: 403 }
        );
    }

    try {
        const usersToInsert = await Promise.all(userRequests.map(async (user: IAddUserToWorkspaceRequest) => {
            let userId = user.user_id;
            let roleId = user.role_id;

            // Find user by email if provided
            if (user.email && !userId) {
                const existingUser = await findUserByEmail(user.email);
                if (existingUser) {
                    userId = existingUser.id;
                }
            }

            // Find role by name if role_id not provided
            if (!roleId && user.role_name) {
                const role = await findRoleByName(user.role_name, workspaceId);
                if (role) {
                    roleId = role.id;
                }
            }

            // Default to 'member' role if nothing specified
            if (!roleId) {
                const memberRole = await findRoleByName('member');
                if (memberRole) {
                    roleId = memberRole.id;
                }
            }

            return {
                workspace_id: workspaceId,
                user_id: userId,
                role_id: roleId
            };
        }));

        const invalidUsers = usersToInsert.filter(user =>
            user.workspace_id === undefined ||
            user.user_id === undefined ||
            user.role_id === undefined
        );

        if (invalidUsers.length > 0) {
            return NextResponse.json(
                { message: "Failed to add users: Missing required fields", invalidUsers },
                { status: 400 }
            );
        }

        // Insert into workspace_users using only role_id
        const workspaceUsers = await db(DBTABLES.WORKSPACE_USERS)
            .insert(usersToInsert.map(u => ({
                workspace_id: u.workspace_id,
                user_id: u.user_id,
                role_id: u.role_id
            })))
            .onConflict(['workspace_id', 'user_id'])
            .merge(['role_id']) // Update role_id if user already exists
            .returning('*');

        // Also insert into user_roles table
        try {
            await db('user_roles')
                .insert(usersToInsert.map(u => ({
                    user_id: u.user_id,
                    role_id: u.role_id,
                    workspace_id: u.workspace_id,
                    assigned_by: authenticated.user.id
                })))
                .onConflict(['user_id', 'role_id', 'workspace_id'])
                .ignore();
        } catch (error) {
            console.log("user_roles table not available, skipping");
        }

        return NextResponse.json(
            { message: "Users added to workspace", data: workspaceUsers },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error adding users to workspace:', error);
        return NextResponse.json(
            { message: "Failed to add users to workspace" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await context.params;

    try {
        const wu = DBTABLES.WORKSPACE_USERS;
        const u = DBTABLES.USERS;
        const r = 'roles';

        // First get the basic user and role information
        const workspaceUsers = await db(wu)
            .join(u, `${wu}.user_id`, '=', `${u}.id`)
            .join(r, `${wu}.role_id`, '=', `${r}.id`)
            .where(`${wu}.workspace_id`, workspaceId)
            .where(`${u}.is_human`, true)
            .select(
                `${wu}.*`, 
                `${u}.username`, 
                `${u}.avatar`, 
                `${u}.last_login`, 
                `${u}.level`, 
                `${u}.agent_id`,
                `${r}.name as role_name`,
                `${r}.description as role_description`,
                `${r}.id as current_role_id`,
                `${r}.is_system_role`,
                `${r}.display_order`
            );

        // For each user, get their role's policies
        const usersWithPolicies = await Promise.all(
            workspaceUsers.map(async (user) => {
                // Get policies for this user's role
                const rolePolicies = await db('role_policies')
                    .join('policies', 'role_policies.policy_id', 'policies.id')
                    .where('role_policies.role_id', user.role_id)
                    .select(
                        'policies.id as policy_id',
                        'policies.name as policy_name',
                        'policies.description as policy_description',
                        'policies.resource_type',
                        'policies.action',
                        'policies.scope'
                    );

                // Get any direct user policies (if user has additional permissions)
                const directPolicies = await db('user_policies')
                    .join('policies', 'user_policies.policy_id', 'policies.id')
                    .where('user_policies.user_id', user.user_id)
                    .where('user_policies.workspace_id', workspaceId)
                    .select(
                        'policies.id as policy_id',
                        'policies.name as policy_name',
                        'policies.description as policy_description',
                        'policies.resource_type',
                        'policies.action',
                        'policies.scope',
                        'user_policies.granted_by'
                    );

                return {
                    ...user,
                    role: {
                        id: user.current_role_id,
                        name: user.role_name,
                        description: user.role_description,
                        is_system_role: user.is_system_role,
                        display_order: user.display_order,
                        policies: rolePolicies
                    },
                    direct_policies: directPolicies,
                    // Remove the flat role fields since they're now in the role object
                    role_name: undefined,
                    role_description: undefined,
                    current_role_id: undefined,
                    is_system_role: undefined,
                    display_order: undefined
                };
            })
        );

        return NextResponse.json(
            { message: "Workspace users retrieved", data: usersWithPolicies },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching workspace users:', error);
        return NextResponse.json(
            { message: "Failed to fetch workspace users" },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    return inDevelopment();
}

export async function DELETE(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const { workspaceId } = await context.params;

    if (!userId) {
        return NextResponse.json(
            { message: "User ID is required" },
            { status: 400 }
        );
    }

    // Check permissions
    const hasPermission = await hasUserManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to remove users" },
            { status: 403 }
        );
    }

    try {
        // Remove from workspace_users
        const deleted = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', userId)
            .delete()
            .returning('*');

        // Remove from user_roles for this workspace
        try {
            await db('user_roles')
                .where('workspace_id', workspaceId)
                .where('user_id', userId)
                .delete();
        } catch (error) {
            console.log("user_roles table not available, skipping");
        }

        return NextResponse.json(
            { message: "User removed from workspace", data: deleted },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error removing user from workspace:', error);
        return NextResponse.json(
            { message: "Failed to remove user from workspace" },
            { status: 500 }
        );
    }
}