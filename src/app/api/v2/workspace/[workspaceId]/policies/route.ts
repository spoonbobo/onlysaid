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