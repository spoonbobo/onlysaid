    import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";

// Check if user has permission to manage policies
const hasPolicyManagementPermission = async (userId: string, workspaceId: string): Promise<boolean> => {
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

// GET - Get user's direct policies
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
        const directPolicies = await db('user_policies')
            .join('policies', 'user_policies.policy_id', 'policies.id')
            .where('user_policies.user_id', userId)
            .where('user_policies.workspace_id', workspaceId)
            .select('policies.*', 'user_policies.granted_by', 'user_policies.created_at as granted_at');

        return NextResponse.json({
            message: "User direct policies retrieved successfully",
            data: directPolicies
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching user direct policies:", error);
        return NextResponse.json(
            { error: "Failed to fetch user direct policies" },
            { status: 500 }
        );
    }
}

// POST - Grant direct policy to user
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, userId } = await params;
    const { policy_id } = await request.json();

    if (!policy_id) {
        return NextResponse.json({ error: "Policy ID is required" }, { status: 400 });
    }

    // Check permissions
    const hasPermission = await hasPolicyManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to grant policies" },
            { status: 403 }
        );
    }

    try {
        // Verify policy exists
        const policy = await db('policies')
            .where('id', policy_id)
            .first();

        if (!policy) {
            return NextResponse.json({ error: "Policy not found" }, { status: 404 });
        }

        // Check if user already has this direct policy
        const existingPolicy = await db('user_policies')
            .where('user_id', userId)
            .where('policy_id', policy_id)
            .where('workspace_id', workspaceId)
            .first();

        if (existingPolicy) {
            return NextResponse.json({ 
                error: "User already has this direct policy" 
            }, { status: 409 });
        }

        // Grant policy
        const newPolicyGrant = await db('user_policies')
            .insert({
                user_id: userId,
                policy_id,
                workspace_id: workspaceId,
                granted_by: authenticated.user.id
            })
            .returning('*');

        return NextResponse.json({
            message: "Policy granted successfully",
            data: newPolicyGrant[0]
        }, { status: 201 });

    } catch (error) {
        console.error("Error granting policy:", error);
        return NextResponse.json(
            { error: "Failed to grant policy" },
            { status: 500 }
        );
    }
}

// DELETE - Revoke direct policy from user
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
    const policyId = searchParams.get('policy_id');

    if (!policyId) {
        return NextResponse.json({ error: "Policy ID is required" }, { status: 400 });
    }

    // Check permissions
    const hasPermission = await hasPolicyManagementPermission(authenticated.user.id, workspaceId);
    if (!hasPermission) {
        return NextResponse.json(
            { message: "Insufficient permissions to revoke policies" },
            { status: 403 }
        );
    }

    try {
        // Revoke policy
        const revokedPolicy = await db('user_policies')
            .where('user_id', userId)
            .where('policy_id', policyId)
            .where('workspace_id', workspaceId)
            .delete()
            .returning('*');

        if (revokedPolicy.length === 0) {
            return NextResponse.json({ 
                error: "Policy assignment not found" 
            }, { status: 404 });
        }

        return NextResponse.json({
            message: "Policy revoked successfully",
            data: revokedPolicy[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error revoking policy:", error);
        return NextResponse.json(
            { error: "Failed to revoke policy" },
            { status: 500 }
        );
    }
} 