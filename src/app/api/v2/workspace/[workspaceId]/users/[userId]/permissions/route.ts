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