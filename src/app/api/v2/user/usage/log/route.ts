import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    const body = await request.json();
    const { kind, max_mode, model, cost_requests } = body;

    const usageLog = await db('usage_logs')
        .insert({
            user_id: authenticated.user.id,
            kind,
            max_mode: max_mode || false,
            model,
            cost_requests: cost_requests || 0.0,
        })
        .returning('*');

    return NextResponse.json(
        { data: usageLog[0] },
        { status: 201 }
    );
}

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const logs = await db('usage_logs')
        .where('user_id', authenticated.user.id)
        .orderBy('date', 'desc')
        .limit(limit)
        .offset(offset)
        .select('*');

    return NextResponse.json(
        { data: logs },
        { status: 200 }
    );
} 