import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get usage summary
    const usageSummary = await db('usage_logs')
        .where('user_id', authenticated.user.id)
        .where('date', '>=', startDate)
        .select(
            db.raw('COUNT(*) as total_requests'),
            db.raw('SUM(cost_requests) as total_cost'),
            db.raw('COUNT(DISTINCT model) as models_used')
        )
        .first();

    // Get daily breakdown
    const dailyUsage = await db('usage_logs')
        .where('user_id', authenticated.user.id)
        .where('date', '>=', startDate)
        .select(
            db.raw('DATE(date) as day'),
            db.raw('COUNT(*) as requests'),
            db.raw('SUM(cost_requests) as cost')
        )
        .groupBy('day')
        .orderBy('day', 'desc');

    // Get model breakdown
    const modelUsage = await db('usage_logs')
        .where('user_id', authenticated.user.id)
        .where('date', '>=', startDate)
        .select(
            'model',
            db.raw('COUNT(*) as requests'),
            db.raw('SUM(cost_requests) as cost')
        )
        .groupBy('model')
        .orderBy('requests', 'desc');

    return NextResponse.json(
        {
            data: {
                summary: usageSummary,
                daily: dailyUsage,
                models: modelUsage
            }
        },
        { status: 200 }
    );
}