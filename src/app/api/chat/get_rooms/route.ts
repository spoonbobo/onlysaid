// /api/chat/get_rooms/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
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

        // Get only the rooms that are in the user's active_rooms array
        const rooms = await db('chat_rooms')
            .select('*')
            .whereIn('id', user.active_rooms);

        // Format rooms to match IChatRoom interface
        const formattedRooms = rooms.map(room => ({
            id: room.id,
            created_at: room.created_at,
            last_updated: room.last_updated,
            name: room.name,
            unread: room.unread,
            // Convert active_users from string array to User array
            active_users: room.active_users || []
        }));

        return NextResponse.json(formattedRooms, { status: 200 });
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse the request body
        const body = await request.json();
        const { userIds } = body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'Invalid user IDs provided' }, { status: 400 });
        }

        // Fetch user information for the provided user IDs
        const users = await db('users')
            .select([
                "*"
            ])
            .whereIn('id', userIds);

        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error('Error fetching user information:', error);
        return NextResponse.json({
            error: 'Failed to fetch user information',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}