import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

// GET - Get all members of a knowledge base
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; kbId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, kbId } = await params;

    if (!workspaceId || !kbId) {
        return NextResponse.json({ error: "Workspace ID and KB ID are required" }, { status: 400 });
    }

    try {
        // Check if user has access to this workspace
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .first();

        if (!workspaceUser) {
            return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
        }

        // Verify KB belongs to this workspace
        const kb = await db(DBTABLES.KNOWLEDGE_BASES)
            .where('id', kbId)
            .where('workspace_id', workspaceId)
            .first();

        if (!kb) {
            return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
        }

        // Get all KB members with user details
        const members = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .select(
                'knowledge_base_members.*',
                'users.username',
                'users.email',
                'users.avatar'
            )
            .leftJoin('users', 'knowledge_base_members.user_id', 'users.id')
            .where('kb_id', kbId)
            .orderBy('added_at', 'asc');

        return NextResponse.json({
            message: "KB members retrieved successfully",
            data: members
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching KB members:", error);
        return NextResponse.json(
            { error: "Failed to fetch KB members" },
            { status: 500 }
        );
    }
}

// POST - Add a user to knowledge base
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; kbId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, kbId } = await params;
    const { user_id, role = 'member' } = await request.json();

    if (!workspaceId || !kbId || !user_id) {
        return NextResponse.json({ error: "Workspace ID, KB ID, and user ID are required" }, { status: 400 });
    }

    try {
        // Check if current user has admin access to workspace or KB
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        const kbMember = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .where('kb_id', kbId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        if (!workspaceUser && !kbMember) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Verify KB belongs to this workspace
        const kb = await db(DBTABLES.KNOWLEDGE_BASES)
            .where('id', kbId)
            .where('workspace_id', workspaceId)
            .first();

        if (!kb) {
            return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
        }

        // Check if user is already a member
        const existingMember = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .where('kb_id', kbId)
            .where('user_id', user_id)
            .first();

        if (existingMember) {
            return NextResponse.json({ 
                error: "User is already a member of this knowledge base" 
            }, { status: 409 });
        }

        // Add user to KB
        const newMember = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .insert({
                kb_id: kbId,
                user_id,
                role
            })
            .returning('*');

        return NextResponse.json({
            message: "User added to knowledge base successfully",
            data: newMember[0]
        }, { status: 201 });

    } catch (error) {
        console.error("Error adding user to KB:", error);
        return NextResponse.json(
            { error: "Failed to add user to knowledge base" },
            { status: 500 }
        );
    }
}

// PUT - Update KB member role
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; kbId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, kbId } = await params;
    const { user_id, role } = await request.json();

    if (!workspaceId || !kbId || !user_id || !role) {
        return NextResponse.json({ error: "Workspace ID, KB ID, user ID, and role are required" }, { status: 400 });
    }

    try {
        // Check if current user has admin access to workspace or KB
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        const kbMember = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .where('kb_id', kbId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        if (!workspaceUser && !kbMember) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Update member role
        const updatedMember = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .where('kb_id', kbId)
            .where('user_id', user_id)
            .update({ role })
            .returning('*');

        if (updatedMember.length === 0) {
            return NextResponse.json({ 
                error: "Member not found" 
            }, { status: 404 });
        }

        return NextResponse.json({
            message: "KB member role updated successfully",
            data: updatedMember[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error updating KB member role:", error);
        return NextResponse.json(
            { error: "Failed to update KB member role" },
            { status: 500 }
        );
    }
}

// DELETE - Remove user from knowledge base
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string; kbId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId, kbId } = await params;
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!workspaceId || !kbId || !user_id) {
        return NextResponse.json({ error: "Workspace ID, KB ID, and user ID are required" }, { status: 400 });
    }

    try {
        // Check if current user has admin access to workspace or KB, or is removing themselves
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        const kbMember = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .where('kb_id', kbId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        const canRemove = workspaceUser || kbMember || authenticated.user.id === user_id;

        if (!canRemove) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Remove user from KB
        const removedMember = await db(DBTABLES.KNOWLEDGE_BASE_MEMBERS)
            .where('kb_id', kbId)
            .where('user_id', user_id)
            .delete()
            .returning('*');

        if (removedMember.length === 0) {
            return NextResponse.json({ 
                error: "Member not found" 
            }, { status: 404 });
        }

        return NextResponse.json({
            message: "User removed from knowledge base successfully",
            data: removedMember[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error removing user from KB:", error);
        return NextResponse.json(
            { error: "Failed to remove user from knowledge base" },
            { status: 500 }
        );
    }
}
