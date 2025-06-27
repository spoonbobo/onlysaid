import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

// GET - Get all members of a chat
export async function GET(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { chatId } = await params;

    if (!chatId) {
        return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }

    try {
        // Check if user is a member of this chat
        const userMembership = await db(DBTABLES.CHAT_MEMBERS)
            .where('chat_id', chatId)
            .where('user_id', authenticated.user.id)
            .first();

        if (!userMembership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Get all members with user details
        const members = await db(DBTABLES.CHAT_MEMBERS)
            .select(
                'chat_members.*',
                'users.username',
                'users.email',
                'users.avatar'
            )
            .leftJoin('users', 'chat_members.user_id', 'users.id')
            .where('chat_id', chatId)
            .orderBy('joined_at', 'asc');

        return NextResponse.json({
            message: "Chat members retrieved successfully",
            data: members
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching chat members:", error);
        return NextResponse.json(
            { error: "Failed to fetch chat members" },
            { status: 500 }
        );
    }
}

// POST - Add a user to chat
export async function POST(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { chatId } = await params;
    const { user_id, role = 'member' } = await request.json();

    if (!chatId || !user_id) {
        return NextResponse.json({ error: "Chat ID and user ID are required" }, { status: 400 });
    }

    try {
        // Check if current user is admin or super_admin of this chat
        const userMembership = await db(DBTABLES.CHAT_MEMBERS)
            .where('chat_id', chatId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        if (!userMembership) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Check if user is already a member
        const existingMember = await db(DBTABLES.CHAT_MEMBERS)
            .where('chat_id', chatId)
            .where('user_id', user_id)
            .first();

        if (existingMember) {
            return NextResponse.json({ 
                error: "User is already a member of this chat" 
            }, { status: 409 });
        }

        // Add user to chat
        const newMember = await db(DBTABLES.CHAT_MEMBERS)
            .insert({
                chat_id: chatId,
                user_id,
                role
            })
            .returning('*');

        return NextResponse.json({
            message: "User added to chat successfully",
            data: newMember[0]
        }, { status: 201 });

    } catch (error) {
        console.error("Error adding user to chat:", error);
        return NextResponse.json(
            { error: "Failed to add user to chat" },
            { status: 500 }
        );
    }
}

// PUT - Update member role
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { chatId } = await params;
    const { user_id, role } = await request.json();

    if (!chatId || !user_id || !role) {
        return NextResponse.json({ error: "Chat ID, user ID, and role are required" }, { status: 400 });
    }

    try {
        // Check if current user is admin or super_admin of this chat
        const userMembership = await db(DBTABLES.CHAT_MEMBERS)
            .where('chat_id', chatId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        if (!userMembership) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Update member role
        const updatedMember = await db(DBTABLES.CHAT_MEMBERS)
            .where('chat_id', chatId)
            .where('user_id', user_id)
            .update({ role })
            .returning('*');

        if (updatedMember.length === 0) {
            return NextResponse.json({ 
                error: "Member not found" 
            }, { status: 404 });
        }

        return NextResponse.json({
            message: "Member role updated successfully",
            data: updatedMember[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error updating member role:", error);
        return NextResponse.json(
            { error: "Failed to update member role" },
            { status: 500 }
        );
    }
}

// DELETE - Remove user from chat
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!chatId || !user_id) {
        return NextResponse.json({ error: "Chat ID and user ID are required" }, { status: 400 });
    }

    try {
        // Check if current user is admin or super_admin of this chat, or removing themselves
        const userMembership = await db(DBTABLES.CHAT_MEMBERS)
            .where('chat_id', chatId)
            .where('user_id', authenticated.user.id)
            .first();

        const canRemove = userMembership && (
            ['admin', 'super_admin'].includes(userMembership.role) ||
            authenticated.user.id === user_id
        );

        if (!canRemove) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Remove user from chat
        const removedMember = await db(DBTABLES.CHAT_MEMBERS)
            .where('chat_id', chatId)
            .where('user_id', user_id)
            .delete()
            .returning('*');

        if (removedMember.length === 0) {
            return NextResponse.json({ 
                error: "Member not found" 
            }, { status: 404 });
        }

        return NextResponse.json({
            message: "User removed from chat successfully",
            data: removedMember[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error removing user from chat:", error);
        return NextResponse.json(
            { error: "Failed to remove user from chat" },
            { status: 500 }
        );
    }
}
