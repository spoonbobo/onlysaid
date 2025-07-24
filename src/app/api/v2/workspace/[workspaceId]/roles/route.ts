import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";

interface ICreateRoleRequest {
    name: string;
    description?: string;
    policy_ids: string[];
}

// Check if user has permission to manage roles
const hasRoleManagementPermission = async (userId: string, workspaceId: string): Promise<boolean> => {
    // Check if user has workspace.admin policy
    const hasDirectPolicy = await db('user_policies')
        .join('policies', 'user_policies.policy_id', 'policies.id')
        .where('user_policies.user_id', userId)
        .where('user_policies.workspace_id', workspaceId)
        .where('policies.name', 'workspace.admin')
        .first();

    if (hasDirectPolicy) return true;

    // Check through roles
    const hasRolePolicy = await db('user_roles')
        .join('role_policies', 'user_roles.role_id', 'role_policies.role_id')
        .join('policies', 'role_policies.policy_id', 'policies.id')
        .where('user_roles.user_id', userId)
        .where('user_roles.workspace_id', workspaceId)
        .where('policies.name', 'workspace.admin')
        .first();

    return !!hasRolePolicy;
};

// GET - Get all roles available in workspace
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;

    try {
        // Get workspace-specific roles and global system roles
        const roles = await db('roles')
            .leftJoin('role_policies', 'roles.id', 'role_policies.role_id')
            .leftJoin('policies', 'role_policies.policy_id', 'policies.id')
            .where(builder => {
                builder.where('roles.workspace_id', workspaceId)
                       .orWhereNull('roles.workspace_id');
            })
            .select('roles.*')
            .groupBy('roles.id')
            .orderBy('roles.is_system_role', 'desc')
            .orderBy('roles.name');

        // Get policies for each role
        const rolesWithPolicies = await Promise.all(
            roles.map(async (role) => {
                const policies = await db('role_policies')
                    .join('policies', 'role_policies.policy_id', 'policies.id')
                    .where('role_policies.role_id', role.id)
                    .select('policies.*');

                return {
                    ...role,
                    policies
                };
            })
        );

        return NextResponse.json({
            message: "Workspace roles retrieved successfully",
            data: rolesWithPolicies
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching workspace roles:", error);
        return NextResponse.json(
            { error: "Failed to fetch workspace roles" },
            { status: 500 }
        );
    }
}

// POST - Create custom role for workspace
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { name, description, policy_ids }: ICreateRoleRequest = await request.json();

    if (!name || !policy_ids || policy_ids.length === 0) {
        return NextResponse.json({ 
            error: "Role name and at least one policy are required" 
        }, { status: 400 });
    }

    // Check permissions
    const hasPermission = await hasRoleManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to create roles" },
            { status: 403 }
        );
    }

    try {
        // Check if role name already exists in this workspace
        const existingRole = await db('roles')
            .where('name', name)
            .where('workspace_id', workspaceId)
            .first();

        if (existingRole) {
            return NextResponse.json({ 
                error: "Role with this name already exists in workspace" 
            }, { status: 409 });
        }

        // Verify all policy IDs exist
        const validPolicies = await db('policies')
            .whereIn('id', policy_ids)
            .select('id');

        if (validPolicies.length !== policy_ids.length) {
            return NextResponse.json({ 
                error: "One or more policy IDs are invalid" 
            }, { status: 400 });
        }

        // Create the role
        const newRole = await db('roles')
            .insert({
                name,
                description,
                workspace_id: workspaceId,
                is_system_role: false
            })
            .returning('*');

        // Assign policies to the role
        const rolePolicyMappings = policy_ids.map(policy_id => ({
            role_id: newRole[0].id,
            policy_id
        }));

        await db('role_policies')
            .insert(rolePolicyMappings);

        // Fetch the complete role with policies
        const roleWithPolicies = await db('roles')
            .leftJoin('role_policies', 'roles.id', 'role_policies.role_id')
            .leftJoin('policies', 'role_policies.policy_id', 'policies.id')
            .where('roles.id', newRole[0].id)
            .select('roles.*', db.raw('json_agg(policies.*) as policies'))
            .groupBy('roles.id')
            .first();

        return NextResponse.json({
            message: "Role created successfully",
            data: roleWithPolicies
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating role:", error);
        return NextResponse.json(
            { error: "Failed to create role" },
            { status: 500 }
        );
    }
} 