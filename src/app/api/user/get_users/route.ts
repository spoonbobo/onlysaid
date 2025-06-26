import { NextResponse } from 'next/server';
import db from '@/lib/db'; // knex

export async function GET(request: Request) {
    try {
        // Get query parameters
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const search = url.searchParams.get('search') || '';
        const teamId = url.searchParams.get('teamId') || '';
        // Base query
        let query = db('users').select([
            "*"
        ]);

        // Add search functionality if search parameter is provided
        if (search) {
            query = query.where(builder => {
                builder
                    .whereILike('username', `%${search}%`)
                    .orWhereILike('email', `%${search}%`);
            });
        }

        // Add team filtering if teamId parameter is provided
        if (teamId) {
            query = query.where('teams', '@>', `{${teamId}}`);
        }

        // Get total count for pagination
        const [{ count }] = await db('users')
            .count('id as count')
            .modify(builder => {
                if (search) {
                    builder.where(subBuilder => {
                        subBuilder
                            .whereILike('username', `%${search}%`)
                            .orWhereILike('email', `%${search}%`);
                    });
                }
                if (teamId) {
                    builder.where('teams', '@>', `{${teamId}}`);
                }
            });

        // Apply pagination
        const users = await query
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            users,
            pagination: {
                total: parseInt(count as string),
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);

        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

// Add a new POST method to handle filtering by ids
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Get parameters from request body
        const limit = body.limit || 50;
        const offset = body.offset || 0;
        const search = body.search || '';
        const userIds = body.ids || [];
        const roomId = body.room_id || '';
        const teamId = body.team_id || '';

        // Base query
        let query = db('users').select([
            "*"
        ]);

        // Add search functionality if search parameter is provided
        if (search) {
            query = query.where(builder => {
                builder
                    .whereILike('username', `%${search}%`)
                    .orWhereILike('email', `%${search}%`);
            });
        }

        // Add ids filtering if ids array is provided
        if (userIds.length > 0) {
            query = query.whereIn('id', userIds);
        }

        // Add room_id filtering if room_id is provided
        if (roomId) {
            query = query.where('active_rooms', '@>', `{${roomId}}`);
        }

        // Add team filtering if team_id is provided
        if (teamId) {
            query = query.where('teams', '@>', `{${teamId}}`);
        }

        // Get total count for pagination
        const [{ count }] = await db('users')
            .count('id as count')
            .modify(builder => {
                if (search) {
                    builder.where(subBuilder => {
                        subBuilder
                            .whereILike('username', `%${search}%`)
                            .orWhereILike('email', `%${search}%`);
                    });
                }
                if (userIds.length > 0) {
                    builder.whereIn('id', userIds);
                }
                if (roomId) {
                    builder.where('active_rooms', '@>', `{${roomId}}`);
                }
                if (teamId) {
                    builder.where('teams', '@>', `{${teamId}}`);
                }
            });

        // Apply pagination
        const users = await query
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            users,
            pagination: {
                total: parseInt(count as string),
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);

        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}