import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { DBTABLES } from "@/lib/db";

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!email || email.trim().length < 2) {
        return NextResponse.json(
            { data: [] },
            { status: 200 }
        );
    }

    // Search for users by email pattern (case-insensitive)
    const users = await db(DBTABLES.USERS)
        .select('id', 'username', 'email', 'avatar')
        .whereILike('email', `%${email.trim()}%`)
        .limit(limit);

    return NextResponse.json(
        { data: users },
        { status: 200 }
    );
} 