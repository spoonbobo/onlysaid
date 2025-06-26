import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the current user from the database
        const user = await db('users')
            .where('email', session.user.email)
            .first();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Parse the request body to get the roomIds
        const { roomIds } = await request.json();

        // Validate roomIds
        if (!roomIds || !Array.isArray(roomIds)) {
            return NextResponse.json({ error: 'Invalid roomIds format' }, { status: 400 });
        }

        // Query rooms based on the provided roomIds
        const rooms = await db('chat_rooms')
            .whereIn('id', roomIds)
            .select('*');

        // Format rooms to match IChatRoom interface
        const formattedRooms = rooms.map(room => ({
            id: room.id,
            created_at: room.created_at,
            last_updated: room.last_updated,
            name: room.name,
            unread: room.unread,
            // Convert active_users from string array to User array
            active_users: room.active_users || [],
            // Include additional information that might be useful for admins
            total_messages: room.total_messages || 0,
            is_archived: room.is_archived || false
        }));

        return NextResponse.json(formattedRooms, { status: 200 });
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
    }
}
