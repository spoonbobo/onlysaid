import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getToken } from 'next-auth/jwt';

export interface AuthResult {
    user: any;
    isAuthenticated: boolean;
    error?: {
        message: string;
        status: number;
    };
}

/**
 * Authenticate a request using either session cookies or bearer token
 * @param request The Next.js request object
 * @returns AuthResult containing authentication status and user if authenticated
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
    try {
        // Try to get the session from cookies first (standard NextAuth approach)
        const session = await getServerSession(authOptions);

        if (session && session.user?.email) {
            // User is authenticated via session
            const user = await db('users')
                .where('email', session.user.email)
                .first();

            if (!user) {
                return {
                    isAuthenticated: false,
                    user: null,
                    error: { message: 'User not found', status: 404 }
                };
            }

            return { isAuthenticated: true, user };
        }

        // No session, try to get it from the Authorization header
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return {
                isAuthenticated: false,
                user: null,
                error: { message: 'Unauthorized', status: 401 }
            };
        }

        // Verify the JWT token
        try {
            const decodedToken = await getToken({
                req: request as any,
                secret: process.env.NEXTAUTH_SECRET
            });

            if (!decodedToken || !decodedToken.email) {
                return {
                    isAuthenticated: false,
                    user: null,
                    error: { message: 'Invalid token', status: 401 }
                };
            }

            // Get the user from the database using the email from the token
            const user = await db('users')
                .where('email', decodedToken.email)
                .first();


            if (!user) {
                return {
                    isAuthenticated: false,
                    user: null,
                    error: { message: 'User not found', status: 404 }
                };
            }
            return { isAuthenticated: true, user };
        } catch (tokenError) {
            console.error('Token verification failed:', tokenError);
            return {
                isAuthenticated: false,
                user: null,
                error: { message: 'Invalid token', status: 401 }
            };
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            isAuthenticated: false,
            user: null,
            error: { message: 'Authentication failed', status: 500 }
        };
    }
}

/**
 * Helper function to handle unauthorized responses
 * @param error Error message and status from AuthResult
 */
export function unauthorized(error?: { message: string; status: number }) {
    return NextResponse.json(
        { error: error?.message || 'Unauthorized' },
        { status: error?.status || 401 }
    );
}
