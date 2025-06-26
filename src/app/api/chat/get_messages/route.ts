import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { IMessage } from '@/types/chat';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before'); // Message ID to load messages before

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
        let query = db('messages').where('room_id', roomId);

        // If 'before' is provided, get messages created before that message
        if (before) {
            const beforeMessage = await db('messages').where('id', before).first();
            if (beforeMessage) {
                query = query.where('created_at', '<', beforeMessage.created_at);
            }
        }

        // Order by created_at descending to get newest messages first, then limit
        const messages: IMessage[] = await query
            .orderBy('created_at', 'desc')
            .limit(limit);

        // Return in ascending order for display
        return NextResponse.json(messages.reverse());
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { roomId, limit } = await request.json();

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
        let query = db('messages').where('room_id', roomId).orderBy('created_at', 'desc');

        if (limit && typeof limit === 'number') {
            query = query.limit(limit);
        }

        const messages: IMessage[] = await query;
        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
