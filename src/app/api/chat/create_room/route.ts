// /api/chat/create_room/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const name = body.name || 'New Chat';

        const [result] = await db('chat_rooms')
            .insert({ name, unread: 0, active_users: [] })
            .returning(['id', 'name']);

        const roomId = result.id;
        return NextResponse.json({ room_id: roomId, name: result.name }, { status: 200 });
    } catch (error) {
        console.error('Error creating chat room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}