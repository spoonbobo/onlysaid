import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const session = await getServerSession(authOptions);
        const email = session?.user?.email;

        const { room_id, all } = body;

        // If "all" flag is true, delete all rooms
        if (all === true) {
            const deletedCount = await db('chat_rooms').del();
            return NextResponse.json({
                success: true,
                message: `All chat rooms deleted successfully. Total: ${deletedCount}`
            }, { status: 200 });
        }

        // Otherwise, require a room_id
        if (!room_id) {
            return NextResponse.json({
                error: 'Missing room_id parameter'
            }, { status: 400 });
        }

        // Delete the specific room
        const deletedCount = await db('chat_rooms')
            .where({ id: room_id })
            .del();

        if (deletedCount === 0) {
            return NextResponse.json({
                error: 'Room not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Chat room deleted successfully'
        }, { status: 200 });
    } catch (error) {
        console.error('Error deleting chat room:', error);
        return NextResponse.json({
            error: 'Internal Server Error'
        }, { status: 500 });
    }
}
