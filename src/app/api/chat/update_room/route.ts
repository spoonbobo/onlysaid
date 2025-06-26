import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { roomId, active_users, name } = body;

        if (!roomId) {
            return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
        }

        // Get the current room data
        const room = await db('chat_rooms').where({ id: roomId }).first();

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Prepare update object
        const updateData: any = {};

        // Update active_users if provided
        if (active_users !== undefined) {
            updateData.active_users = active_users;
        }

        // Update name if provided
        if (name !== undefined) {
            updateData.name = name;
        }

        // Update last_updated timestamp
        updateData.last_updated = new Date().toISOString();

        const [result] = await db('chat_rooms')
            .where({ id: roomId })
            .update(updateData)
            .returning(['id', 'name', 'active_users', 'last_updated']);

        return NextResponse.json({
            id: result.id,
            name: result.name,
            active_users: result.active_users,
            last_updated: result.last_updated
        }, { status: 200 });
    } catch (error) {
        console.error('Error updating chat room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
