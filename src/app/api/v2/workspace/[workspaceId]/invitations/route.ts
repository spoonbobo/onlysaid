import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { invitee_email } = await request.json();

    if (!invitee_email) {
        return NextResponse.json(
            { message: "Email is required" },
            { status: 400 }
        );
    }

    const existingInvitation = await db(DBTABLES.WORKSPACE_INVITATIONS)
        .where('workspace_id', workspaceId)
        .where('invitee_email', invitee_email)
        .where('status', 'pending')
        .first();

    if (existingInvitation) {
        return NextResponse.json(
            { message: "Invitation already exists" },
            { status: 409 }
        );
    }

    const invitation = await db(DBTABLES.WORKSPACE_INVITATIONS)
        .insert({
            workspace_id: workspaceId,
            inviter_id: authenticated.user.id,
            invitee_email,
            status: 'pending'
        })
        .returning('*');

    return NextResponse.json(
        { message: "Invitation sent", data: invitation[0] },
        { status: 201 }
    );
}

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    const invitations = await db(DBTABLES.WORKSPACE_INVITATIONS)
        .join(DBTABLES.USERS, `${DBTABLES.WORKSPACE_INVITATIONS}.inviter_id`, '=', `${DBTABLES.USERS}.id`)
        .where(`${DBTABLES.WORKSPACE_INVITATIONS}.workspace_id`, workspaceId)
        .where(`${DBTABLES.WORKSPACE_INVITATIONS}.status`, status)
        .select(
            `${DBTABLES.WORKSPACE_INVITATIONS}.*`,
            `${DBTABLES.USERS}.username as inviter_username`,
            `${DBTABLES.USERS}.avatar as inviter_avatar`
        );

    return NextResponse.json(
        { message: "Invitations retrieved", data: invitations },
        { status: 200 }
    );
}

export async function PUT(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { invitation_id, status } = await request.json();

    if (!invitation_id || !status) {
        return NextResponse.json(
            { message: "Invitation ID and status are required" },
            { status: 400 }
        );
    }

    const invitation = await db(DBTABLES.WORKSPACE_INVITATIONS)
        .where('id', invitation_id)
        .where('workspace_id', workspaceId)
        .update({ status, updated_at: db.fn.now() })
        .returning('*');

    if (status === 'accepted') {
        const user = await db(DBTABLES.USERS)
            .where('email', invitation[0].invitee_email)
            .first();

        if (user) {
            await db(DBTABLES.WORKSPACE_USERS)
                .insert({
                    workspace_id: workspaceId,
                    user_id: user.id,
                    role: 'member'
                })
                .onConflict(['workspace_id', 'user_id'])
                .ignore();
        }
    }

    return NextResponse.json(
        { message: "Invitation updated", data: invitation[0] },
        { status: 200 }
    );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const url = new URL(request.url);
    const invitationId = url.searchParams.get('invitationId');

    if (!invitationId) {
        return NextResponse.json(
            { message: "Invitation ID is required" },
            { status: 400 }
        );
    }

    const deleted = await db(DBTABLES.WORKSPACE_INVITATIONS)
        .where('id', invitationId)
        .where('workspace_id', workspaceId)
        .delete()
        .returning('*');

    return NextResponse.json(
        { message: "Invitation cancelled", data: deleted[0] },
        { status: 200 }
    );
}

