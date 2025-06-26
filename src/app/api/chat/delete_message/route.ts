import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        // Authentication check temporarily disabled
        // const session = await getServerSession(authOptions);
        // if (!session) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // Temporarily use a mock session for testing
        const session = { user: { email: 'test@example.com' } };

        const body = await request.json().catch(() => ({}));
        const { id, all, room_id, role } = body;

        // Validate that at least one required parameter is provided
        if (!id && !all && !room_id) {
            return NextResponse.json({
                error: 'Missing required parameters: id, room_id, or all',
                details: 'At least one parameter must be provided to identify which message(s) to delete'
            }, { status: 400 });
        }

        // Delete all messages
        if (all === true) {
            // No need to check if user is owner - any authenticated user can reset
            const deletedCount = await db('messages').del();
            return NextResponse.json({
                success: true,
                message: `All messages deleted successfully. ${deletedCount} messages removed.`
            }, { status: 200 });
        }

        // Delete messages by room_id
        else if (room_id) {
            // Verify user has access to this room
            const room = await db('rooms')
                .where({ id: room_id })
                .first();

            if (!room) {
                return NextResponse.json({ error: 'Room not found' }, { status: 404 });
            }

            // Skip access check if role is "system"
            if (role !== "system") {
                // Check if user has access to this room
                const hasAccess = await db('room_users')
                    .where({
                        room_id: room_id,
                        id: session.user?.email
                    })
                    .first();

                if (!hasAccess) {
                    return NextResponse.json({ error: 'Forbidden: No access to this room' }, { status: 403 });
                }
            }

            const deletedCount = await db('messages')
                .where({ room_id })
                .del();

            return NextResponse.json({
                success: true,
                message: `All messages in room deleted successfully. ${deletedCount} messages removed.`
            }, { status: 200 });
        }

        // Delete a specific message by ID
        else if (id) {
            // Get the message to check ownership
            const message = await db('messages')
                .where({ id })
                .first();

            if (!message) {
                return NextResponse.json({ error: 'Message not found' }, { status: 404 });
            }

            // Skip ownership check if role is "system"
            if (role !== "system") {
                // Check if user is owner or the sender of the message
                const isOwner = await db('users')
                    .where({ email: session.user?.email })
                    .first();

                if (!isOwner && message.sender !== session.user?.email) {
                    return NextResponse.json({ error: 'Forbidden: Cannot delete another user\'s message' }, { status: 403 });
                }
            }

            await db('messages')
                .where({ id })
                .del();

            return NextResponse.json({
                success: true,
                message: 'Message deleted successfully'
            }, { status: 200 });
        }

        else {
            return NextResponse.json({ error: 'Missing required parameters: id, room_id, or all' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error deleting message(s):', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
