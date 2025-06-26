import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        // Get roomId from request body
        const body = await request.json();
        const { roomId } = body;

        if (!roomId) {
            return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
        }

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

        // Get the room by ID
        const room = await db('chat_rooms')
            .where('id', roomId)
            .first();

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Format room to match IChatRoom interface
        const formattedRoom = {
            id: room.id,
            created_at: room.created_at,
            last_updated: room.last_updated,
            name: room.name,
            unread: room.unread,
            active_users: room.active_users || []
        };

        return NextResponse.json(formattedRoom, { status: 200 });
    } catch (error) {
        console.error('Error fetching chat room:', error);
        return NextResponse.json({ error: 'Failed to fetch chat room' }, { status: 500 });
    }
} 