import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

interface IAssignRoleRequest {
    role_id: string;
}

interface IUpdateRoleRequest {
    old_role_id: string;
    new_role_id: string;
}

// Check if user has permission to manage roles
const hasRoleManagementPermission = async (userId: string, workspaceId: string): Promise<boolean> => {
    // Check if user has workspace.admin or user.admin policy
    const hasDirectPolicy = await db('user_policies')
        .join('policies', 'user_policies.policy_id', 'policies.id')
        .where('user_policies.user_id', userId)
        .where('user_policies.workspace_id', workspaceId)
        .whereIn('policies.name', ['workspace.admin', 'user.admin'])
        .first();

    if (hasDirectPolicy) return true;

    // Check through roles
    const hasRolePolicy = await db('user_roles')
        .join('role_policies', 'user_roles.role_id', 'role_policies.role_id')
        .join('policies', 'role_policies.policy_id', 'policies.id')
        .where('user_roles.user_id', userId)
        .where('user_roles.workspace_id', workspaceId)
        .whereIn('policies.name', ['workspace.admin', 'user.admin'])
        .first();

    return !!hasRolePolicy;
};

// GET - Get user's roles in workspace
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, userId } = await params;

    try {
        const userRoles = await db('user_roles')
            .join('roles', 'user_roles.role_id', 'roles.id')
            .where('user_roles.user_id', userId)
            .where('user_roles.workspace_id', workspaceId)
            .select('roles.*', 'user_roles.assigned_by', 'user_roles.created_at as assigned_at');

        return NextResponse.json({
            message: "User roles retrieved successfully",
            data: userRoles
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching user roles:", error);
        return NextResponse.json(
            { error: "Failed to fetch user roles" },
            { status: 500 }
        );
    }
}

// POST - Assign role to user
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, userId } = await params;
    const { role_id }: IAssignRoleRequest = await request.json();

    if (!role_id) {
        return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    // Check permissions
    const hasPermission = await hasRoleManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to assign roles" },
            { status: 403 }
        );
    }

    try {
        // Verify role exists and is valid for this workspace
        const role = await db('roles')
            .where('id', role_id)
            .where(builder => {
                builder.where('workspace_id', workspaceId).orWhereNull('workspace_id');
            })
            .first();

        if (!role) {
            return NextResponse.json({ error: "Invalid role for this workspace" }, { status: 400 });
        }

        // Check if user already has this role
        const existingRole = await db('user_roles')
            .where('user_id', userId)
            .where('role_id', role_id)
            .where('workspace_id', workspaceId)
            .first();

        if (existingRole) {
            return NextResponse.json({ 
                error: "User already has this role" 
            }, { status: 409 });
        }

        // Assign role
        const newRoleAssignment = await db('user_roles')
            .insert({
                user_id: userId,
                role_id,
                workspace_id: workspaceId,
                assigned_by: authenticated.user.id
            })
            .returning('*');

        // Update workspace_users table for backward compatibility
        await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', userId)
            .update({
                role_id,
                role: role.name
            });

        return NextResponse.json({
            message: "Role assigned successfully",
            data: newRoleAssignment[0]
        }, { status: 201 });

    } catch (error) {
        console.error("Error assigning role:", error);
        return NextResponse.json(
            { error: "Failed to assign role" },
            { status: 500 }
        );
    }
}

// PUT - Update user's role (replace existing role)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, userId } = await params;
    const { old_role_id, new_role_id }: IUpdateRoleRequest = await request.json();

    if (!old_role_id || !new_role_id) {
        return NextResponse.json({ 
            error: "Both old_role_id and new_role_id are required" 
        }, { status: 400 });
    }

    // Check permissions
    const hasPermission = await hasRoleManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to update roles" },
            { status: 403 }
        );
    }

    try {
        // Verify new role exists and is valid for this workspace
        const newRole = await db('roles')
            .where('id', new_role_id)
            .where(builder => {
                builder.where('workspace_id', workspaceId).orWhereNull('workspace_id');
            })
            .first();

        if (!newRole) {
            return NextResponse.json({ error: "Invalid new role for this workspace" }, { status: 400 });
        }

        // Update the role assignment
        const updatedRole = await db('user_roles')
            .where('user_id', userId)
            .where('role_id', old_role_id)
            .where('workspace_id', workspaceId)
            .update({
                role_id: new_role_id,
                assigned_by: authenticated.user.id
            })
            .returning('*');

        if (updatedRole.length === 0) {
            return NextResponse.json({ 
                error: "Role assignment not found" 
            }, { status: 404 });
        }

        // Update workspace_users table for backward compatibility
        await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', userId)
            .update({
                role_id: new_role_id,
                role: newRole.name
            });

        return NextResponse.json({
            message: "Role updated successfully",
            data: updatedRole[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error updating role:", error);
        return NextResponse.json(
            { error: "Failed to update role" },
            { status: 500 }
        );
    }
}

// DELETE - Remove role from user
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, userId } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
        return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    // Check permissions
    const hasPermission = await hasRoleManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to remove roles" },
            { status: 403 }
        );
    }

    try {
        // Remove role assignment
        const removedRole = await db('user_roles')
            .where('user_id', userId)
            .where('role_id', roleId)
            .where('workspace_id', workspaceId)
            .delete()
            .returning('*');

        if (removedRole.length === 0) {
            return NextResponse.json({ 
                error: "Role assignment not found" 
            }, { status: 404 });
        }

        // Find remaining primary role for workspace_users table
        const remainingRole = await db('user_roles')
            .join('roles', 'user_roles.role_id', 'roles.id')
            .where('user_roles.user_id', userId)
            .where('user_roles.workspace_id', workspaceId)
            .orderBy('roles.name')
            .first();

        // Update workspace_users table
        if (remainingRole) {
            await db(DBTABLES.WORKSPACE_USERS)
                .where('workspace_id', workspaceId)
                .where('user_id', userId)
                .update({
                    role_id: remainingRole.role_id,
                    role: remainingRole.name
                });
        } else {
            // Remove from workspace if no roles remain
            await db(DBTABLES.WORKSPACE_USERS)
                .where('workspace_id', workspaceId)
                .where('user_id', userId)
                .delete();
        }

        return NextResponse.json({
            message: "Role removed successfully",
            data: removedRole[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error removing role:", error);
        return NextResponse.json(
            { error: "Failed to remove role" },
            { status: 500 }
        );
    }
}
```

Now let's create a route for checking user permissions:

```typescript:src/app/api/v2/workspace/[workspaceId]/users/[userId]/permissions/route.ts
import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET - Get user's effective permissions in workspace
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, userId } = await params;
    const { searchParams } = new URL(request.url);
    const policyName = searchParams.get('policy');

    try {
        // Get direct user policies
        const directPolicies = await db('user_policies')
            .join('policies', 'user_policies.policy_id', 'policies.id')
            .where('user_policies.user_id', userId)
            .where('user_policies.workspace_id', workspaceId)
            .select('policies.*', 'user_policies.granted_by', 'user_policies.created_at as granted_at');

        // Get policies through roles
        const rolePolicies = await db('user_roles')
            .join('role_policies', 'user_roles.role_id', 'role_policies.role_id')
            .join('policies', 'role_policies.policy_id', 'policies.id')
            .join('roles', 'user_roles.role_id', 'roles.id')
            .where('user_roles.user_id', userId)
            .where('user_roles.workspace_id', workspaceId)
            .select('policies.*', 'roles.name as role_name', 'user_roles.assigned_by', 'user_roles.created_at as assigned_at');

        // Get resource-specific permissions
        const resourcePermissions = await db('resource_permissions')
            .join('policies', 'resource_permissions.policy_id', 'policies.id')
            .where('resource_permissions.user_id', userId)
            .where('resource_permissions.workspace_id', workspaceId)
            .where(builder => {
                if (resourcePermissions.expires_at) {
                    builder.where('expires_at', '>', new Date());
                }
            })
            .select('policies.*', 'resource_permissions.resource_type', 'resource_permissions.resource_id', 'resource_permissions.granted_by', 'resource_permissions.expires_at');

        // If specific policy requested, check if user has it
        if (policyName) {
            const hasPolicy = [...directPolicies, ...rolePolicies, ...resourcePermissions]
                .some(p => p.name === policyName);

            return NextResponse.json({
                message: "Permission check completed",
                data: {
                    policy: policyName,
                    hasPermission: hasPolicy,
                    granted_through: directPolicies.find(p => p.name === policyName) ? 'direct' :
                                   rolePolicies.find(p => p.name === policyName) ? 'role' :
                                   resourcePermissions.find(p => p.name === policyName) ? 'resource' : null
                }
            }, { status: 200 });
        }

        // Return all permissions
        return NextResponse.json({
            message: "User permissions retrieved successfully",
            data: {
                direct_policies: directPolicies,
                role_policies: rolePolicies,
                resource_permissions: resourcePermissions,
                summary: {
                    total_policies: new Set([...directPolicies, ...rolePolicies, ...resourcePermissions].map(p => p.name)).size,
                    direct_count: directPolicies.length,
                    role_count: rolePolicies.length,
                    resource_count: resourcePermissions.length
                }
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching user permissions:", error);
        return NextResponse.json(
            { error: "Failed to fetch user permissions" },
            { status: 500 }
        );
    }
}
```

Let's also create a route for managing policies:

```typescript:src/app/api/v2/workspace/[workspaceId]/policies/route.ts
import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";

interface ICreatePolicyRequest {
    name: string;
    description?: string;
    resource_type: string;
    action: string;
    scope?: string;
}

// GET - Get all available policies for workspace
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resource_type');
    const action = searchParams.get('action');

    try {
        let query = db('policies').select('*');

        if (resourceType) {
            query = query.where('resource_type', resourceType);
        }

        if (action) {
            query = query.where('action', action);
        }

        const policies = await query.orderBy('resource_type').orderBy('action');

        return NextResponse.json({
            message: "Policies retrieved successfully",
            data: policies
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching policies:", error);
        return NextResponse.json(
            { error: "Failed to fetch policies" },
            { status: 500 }
        );
    }
}

// POST - Create custom policy (admin only)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const policyData: ICreatePolicyRequest = await request.json();

    // Check if user has workspace.admin permission
    const hasPermission = await db('user_policies')
        .join('policies', 'user_policies.policy_id', 'policies.id')
        .where('user_policies.user_id', authenticated.user.id)
        .where('user_policies.workspace_id', workspaceId)
        .where('policies.name', 'workspace.admin')
        .first();

    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to create policies" },
            { status: 403 }
        );
    }

    try {
        const newPolicy = await db('policies')
            .insert({
                name: policyData.name,
                description: policyData.description,
                resource_type: policyData.resource_type,
                action: policyData.action,
                scope: policyData.scope || 'workspace'
            })
            .returning('*');

        return NextResponse.json({
            message: "Policy created successfully",
            data: newPolicy[0]
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating policy:", error);
        return NextResponse.json(
            { error: "Failed to create policy" },
            { status: 500 }
        );
    }
}
```

The key changes made:

1. **Removed IPC Handlers**: Removed `workspace:add_users`, `workspace:remove_user`, `workspace:get_users`, and `workspace:update_user_role` from the Electron main process
2. **Updated workspace users route**: Now works with the new policy system while maintaining backward compatibility
3. **Created new role management route**: `/workspace/[workspaceId]/users/[userId]/roles` for assigning/updating/removing roles
4. **Created permissions check route**: `/workspace/[workspaceId]/users/[userId]/permissions` for checking user permissions
5. **Created policy management route**: `/workspace/[workspaceId]/policies` for managing policies

The new system:
- Uses the `user_roles` table for multiple role assignments
- Maintains the old `workspace_users.role` column for backward compatibility
- Checks permissions through both direct policies and role-based policies
- Supports resource-specific permissions
- Provides detailed permission checking and management

The renderer will need to be updated to use these new API endpoints instead of the removed IPC handlers. 