import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";
import { inDevelopment } from "@/utils/common";
import { ICreateWorkspaceArgs } from "@/../../types/Workspace/Workspace";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    try {
        const body: ICreateWorkspaceArgs = await request.json();
        
        // Add debugging logs
        console.log("🔍 Workspace creation request body:", JSON.stringify(body, null, 2));
        console.log("🔍 body.request:", JSON.stringify(body.request, null, 2));
        
        // Validate request structure
        if (!body || !body.request) {
            console.error("❌ Invalid request structure - missing body.request");
            return NextResponse.json(
                { message: "Invalid request structure - missing workspace data" },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!body.request.name || typeof body.request.name !== 'string' || body.request.name.trim().length === 0) {
            console.error("❌ Missing or invalid workspace name");
            return NextResponse.json(
                { message: "Workspace name is required" },
                { status: 400 }
            );
        }

        // Ensure we have all required fields with proper defaults
        const workspaceData = {
            id: body.request.id,
            name: body.request.name.trim(),
            image: body.request.image || '/default-workspace.png',
            invite_code: body.request.invite_code || '',
            created_at: body.request.created_at || new Date().toISOString(),
            updated_at: body.request.updated_at || new Date().toISOString(),
            settings: body.request.settings || {},
        };

        console.log("🔍 Final workspace data for insertion:", JSON.stringify(workspaceData, null, 2));

        // Use transaction to create workspace and add creator as super_admin
        const result = await db.transaction(async (trx) => {
            // Create workspace
            const workspace = await trx(DBTABLES.WORKSPACES)
                .insert(workspaceData)
                .returning('*');

            const workspaceId = workspace[0].id;

            // Find super_admin role
            const superAdminRole = await trx('roles')
                .where('name', 'super_admin')
                .whereNull('workspace_id') // System role
                .first();

            if (superAdminRole) {
                // Add creator to workspace_users using only role_id
                await trx(DBTABLES.WORKSPACE_USERS)
                    .insert({
                        workspace_id: workspaceId,
                        user_id: authenticated.user.id,
                        role_id: superAdminRole.id
                    })
                    .onConflict(['workspace_id', 'user_id'])
                    .merge(['role_id']); // Update role_id if already exists

                // Add creator to user_roles table
                try {
                    await trx('user_roles')
                        .insert({
                            user_id: authenticated.user.id,
                            role_id: superAdminRole.id,
                            workspace_id: workspaceId,
                            assigned_by: authenticated.user.id
                        })
                        .onConflict(['user_id', 'role_id', 'workspace_id'])
                        .ignore();
                } catch (error) {
                    console.log("user_roles table not available, skipping");
                }
            }

            return workspace[0];
        });

        const storageDir = path.join(process.cwd(), 'storage', `${result.id}`);
        await fs.promises.mkdir(storageDir, { recursive: true });

        return NextResponse.json(
            { message: "Workspace created", data: result },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("❌ Error in workspace creation:", error);
        return NextResponse.json(
            { message: "Failed to create workspace", error: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json(
            { message: "User ID is required" },
            { status: 400 }
        );
    }

    const ws = DBTABLES.WORKSPACES;
    const wu = DBTABLES.WORKSPACE_USERS;
    const r = 'roles';

    const workspaces = await db(ws)
        .join(wu, `${ws}.id`, '=', `${wu}.workspace_id`)
        .join(r, `${wu}.role_id`, '=', `${r}.id`)
        .where(`${wu}.user_id`, userId)
        .select(`${ws}.*`, `${wu}.role_id`, `${r}.name as role_name`)
        .returning('*');

    return NextResponse.json(
        { message: "Workspaces fetched", data: workspaces },
        { status: 200 }
    );
}

export async function PUT(request: Request) {
    return inDevelopment();
}

export async function DELETE(request: Request) {
    return inDevelopment();
}
