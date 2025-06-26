import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { invite_code } = await request.json();

    let workspace;
    let actualWorkspaceId = workspaceId;

    // If workspaceId is actually an invite code (6 chars), find workspace by invite code
    if (workspaceId.length === 6 && invite_code === workspaceId) {
        workspace = await db(DBTABLES.WORKSPACES)
            .where('invite_code', workspaceId)
            .first();

        if (!workspace) {
            return NextResponse.json(
                { message: "Invalid invite code" },
                { status: 404 }
            );
        }
        actualWorkspaceId = workspace.id;
    } else {
        // Normal case: workspaceId is provided
        workspace = await db(DBTABLES.WORKSPACES)
            .where('id', workspaceId)
            .first();

        if (!workspace) {
            return NextResponse.json(
                { message: "Workspace not found" },
                { status: 404 }
            );
        }

        if (invite_code && workspace.invite_code !== invite_code) {
            return NextResponse.json(
                { message: "Invalid invite code" },
                { status: 401 }
            );
        }
    }

    const existingMember = await db(DBTABLES.WORKSPACE_USERS)
        .where('workspace_id', actualWorkspaceId)
        .where('user_id', authenticated.user.id)
        .first();

    if (existingMember) {
        return NextResponse.json(
            { message: "Already a member" },
            { status: 409 }
        );
    }

    // Check if there's already a pending join request
    const existingJoinRequest = await db(DBTABLES.WORKSPACE_JOIN)
        .where('workspace_id', actualWorkspaceId)
        .where('user_id', authenticated.user.id)
        .where('status', 'pending')
        .first();

    if (existingJoinRequest) {
        return NextResponse.json(
            { message: "Join request already pending" },
            { status: 409 }
        );
    }

    // Always create join request for admin approval
    // Invite code just validates the user has permission to request
    const joinRecord = await db(DBTABLES.WORKSPACE_JOIN)
        .insert({
            workspace_id: actualWorkspaceId,
            user_id: authenticated.user.id,
            status: 'pending'
        })
        .returning('*');

    const message = invite_code === workspace.invite_code
        ? "Join request sent with valid invite code - waiting for admin approval"
        : "Join request sent - waiting for admin approval";

    return NextResponse.json(
        {
            message,
            data: {
                ...joinRecord[0],
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    image: workspace.image
                }
            }
        },
        { status: 201 }
    );
}

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;

    const joinRequests = await db(DBTABLES.WORKSPACE_JOIN)
        .join(DBTABLES.USERS, `${DBTABLES.WORKSPACE_JOIN}.user_id`, '=', `${DBTABLES.USERS}.id`)
        .where(`${DBTABLES.WORKSPACE_JOIN}.workspace_id`, workspaceId)
        .select(
            `${DBTABLES.WORKSPACE_JOIN}.*`,
            `${DBTABLES.USERS}.username`,
            `${DBTABLES.USERS}.avatar`,
            `${DBTABLES.USERS}.email`
        );

    return NextResponse.json(
        { message: "Join requests retrieved", data: joinRequests },
        { status: 200 }
    );
}

export async function PUT(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { user_id, status } = await request.json();

    if (!user_id || !status) {
        return NextResponse.json(
            { message: "User ID and status are required" },
            { status: 400 }
        );
    }

    const updated = await db(DBTABLES.WORKSPACE_JOIN)
        .where('workspace_id', workspaceId)
        .where('user_id', user_id)
        .update({ status, updated_at: db.fn.now() })
        .returning('*');

    if (status === 'active') {
        await db(DBTABLES.WORKSPACE_USERS)
            .insert({
                workspace_id: workspaceId,
                user_id: user_id,
                role: 'member'
            })
            .onConflict(['workspace_id', 'user_id'])
            .ignore();
    }

    return NextResponse.json(
        { message: "Join request updated", data: updated[0] },
        { status: 200 }
    );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;

    const deleted = await db(DBTABLES.WORKSPACE_USERS)
        .where('workspace_id', workspaceId)
        .where('user_id', authenticated.user.id)
        .delete()
        .returning('*');

    return NextResponse.json(
        { message: "Left workspace", data: deleted[0] },
        { status: 200 }
    );
}

