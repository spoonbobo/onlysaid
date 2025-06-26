
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { email, id, all } = await request.json();

        // Handle deleting all users
        if (all === true) {
            // This is a dangerous operation, so we might want to add additional checks
            // For example, require an admin role or a confirmation code
            const deletedCount = await db('users').delete();

            return NextResponse.json({
                message: `All users deleted successfully (${deletedCount} users)`,
                count: deletedCount
            }, { status: 200 });
        }

        // Require either email or id for single user deletion
        if (!email && !id) {
            return NextResponse.json({
                error: 'Bad Request',
                message: 'Either email or id is required'
            }, { status: 400 });
        }

        // Build query based on provided parameters
        const query: Record<string, any> = {};
        if (email) query['email'] = email;
        if (id) query['id'] = id;

        // Check if user exists before deletion
        const userExists = await db('users').where(query).first();
        if (!userExists) {
            return NextResponse.json({
                error: 'Not Found',
                message: 'User not found'
            }, { status: 404 });
        }

        // Delete the user
        await db('users').where(query).delete();

        return NextResponse.json({
            message: 'User deleted successfully'
        }, { status: 200 });
    } catch (error) {
        console.error("Error deleting user:", error);

        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
