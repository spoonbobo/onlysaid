import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import db from '@/lib/db';

const ELECTRON_PROTOCOL = 'onlysaid-electron';

// Helper function to get the correct base URL
function getBaseUrl(request: NextRequest): string {
    // Use the same environment variable that's used elsewhere in the project
    const envDomain = process.env.NEXT_PUBLIC_DOMAIN;
    if (envDomain) {
        return envDomain;
    }
    
    // Fallback to request headers
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 
                    (host?.includes('localhost') ? 'http' : 'https');
    
    if (host) {
        return `${protocol}://${host}`;
    }
    
    // Last resort fallback
    return 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
    console.log('[App Router API /api/electron-flow/generate-deeplink] GET handler started.');

    const baseUrl = getBaseUrl(request);
    console.log('[App Router API] Using base URL:', baseUrl);

    try {
        // Get the session using getServerSession
        const session = await getServerSession(authOptions);
        console.log('session', session);

        if (session && session.user?.email) {
            console.log(`[App Router API] User is authenticated with session:`, session);

            // Check if user exists in database
            const user = await db('users').where({ email: session.user.email }).first();

            // If user doesn't exist, create one along with an agent
            if (!user) {
                console.log(`[App Router API] User not found, creating new user for ${session.user.email}`);
                const baseUsername = session.user.email.split('@')[0];
                const emailDomain = session.user.email.split('@')[1];

                const agentUsername = `${baseUsername}_agent`;
                const agentEmail = `${baseUsername}+agent@${emailDomain}`;

                try {
                    await db.transaction(async trx => {
                        // Create the agent user
                        const agentToInsert = {
                            email: agentEmail,
                            username: agentUsername,
                            avatar: null, // Or a default agent avatar
                            created_at: new Date(),
                            updated_at: new Date(),
                            is_human: false, // Agent is not human
                        };
                        console.log(`[App Router API] Creating agent user: ${agentUsername}`);
                        const insertedAgents = await trx('users').insert(agentToInsert).returning('id');
                        const agentId = insertedAgents[0].id;
                        console.log(`[App Router API] Agent user created successfully with ID: ${agentId}`);

                        // Create the human user and link the agent
                        const humanUserToInsert = {
                            email: session?.user?.email || '',
                            username: baseUsername,
                            avatar: session?.user?.image || null,
                            created_at: new Date(),
                            updated_at: new Date(),
                            is_human: true, // This is a human user
                            agent_id: agentId, // Link to the created agent
                        };
                        console.log(`[App Router API] Creating human user: ${baseUsername} linked to agent ID: ${agentId}`);
                        await trx('users').insert(humanUserToInsert);
                        console.log(`[App Router API] Human user created successfully for ${session?.user?.email || ''}`);
                    });
                } catch (transactionError) {
                    console.error('[App Router API] Transaction failed for user and agent creation:', transactionError);
                    // Redirect to close window page with error
                    const closeUrl = new URL('/redirect/close_window', baseUrl);
                    closeUrl.searchParams.set('type', 'error');
                    closeUrl.searchParams.set('message', 'Failed to create user account. Please try again.');
                    
                    return NextResponse.redirect(closeUrl.toString(), 302);
                }
            }

            const sessionCookieName = authOptions.cookies?.sessionToken?.name ||
                (process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token');

            const cookieStore = await cookies();
            const sessionCookie = cookieStore.get(sessionCookieName);
            const sessionCookieValue = sessionCookie?.value;

            // Create a deeplink with the session token
            const deeplinkUrl = `${ELECTRON_PROTOCOL}://auth/callback?token=${encodeURIComponent(sessionCookieValue || '')}&cookieName=${encodeURIComponent(sessionCookieName)}`;
            console.log(`[App Router API] Redirecting to close window with deeplink: ${deeplinkUrl}`);

            // ✅ Use the correct base URL with NEXT_PUBLIC_DOMAIN
            const closeUrl = new URL('/redirect/close_window', baseUrl);
            closeUrl.searchParams.set('type', 'success');
            closeUrl.searchParams.set('message', 'Authentication successful! You can now use the app.');
            closeUrl.searchParams.set('deeplink', deeplinkUrl);
            
            return NextResponse.redirect(closeUrl.toString(), 302);
        } else {
            console.error(`[App Router API] No session found. User is not authenticated.`);
            
            // Redirect to close window page with error
            const closeUrl = new URL('/redirect/close_window', baseUrl);
            closeUrl.searchParams.set('type', 'error');
            closeUrl.searchParams.set('message', 'Authentication failed. No session found.');
            
            return NextResponse.redirect(closeUrl.toString(), 302);
        }
    } catch (error) {
        console.error('[App Router API] CRITICAL ERROR in handler:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // Redirect to close window page with error
        const closeUrl = new URL('/redirect/close_window', baseUrl);
        closeUrl.searchParams.set('type', 'error');
        closeUrl.searchParams.set('message', `Authentication failed: ${errorMsg}`);
        
        return NextResponse.redirect(closeUrl.toString(), 302);
    }
}