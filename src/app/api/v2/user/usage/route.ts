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

    // Get usage summary (removed total_cost)
    const usageSummary = await db('usage_logs')
        .where('user_id', authenticated.user.id)
        .where('date', '>=', startDate)
        .select(
            db.raw('COUNT(*) as total_requests'),
            db.raw('COUNT(DISTINCT model) as models_used')
        )
        .first();

    // Get daily breakdown (removed cost)
    const dailyUsage = await db('usage_logs')
        .where('user_id', authenticated.user.id)
        .where('date', '>=', startDate)
        .select(
            db.raw('DATE(date) as day'),
            db.raw('COUNT(*) as requests')
        )
        .groupBy('day')
        .orderBy('day', 'desc');

    // Get model breakdown (removed cost)
    const modelUsage = await db('usage_logs')
        .where('user_id', authenticated.user.id)
        .where('date', '>=', startDate)
        .select(
            'model',
            db.raw('COUNT(*) as requests')
        )
        .groupBy('model')
        .orderBy('requests', 'desc');

    // Ensure numeric values are properly converted (removed total_cost)
    const summary = {
        total_requests: parseInt(usageSummary?.total_requests || '0'),
        models_used: parseInt(usageSummary?.models_used || '0')
    };

    const daily = dailyUsage.map(item => ({
        day: item.day,
        requests: parseInt(item.requests || '0')
    }));

    const models = modelUsage.map(item => ({
        model: item.model,
        requests: parseInt(item.requests || '0')
    }));

    return NextResponse.json(
        {
            data: {
                summary,
                daily,
                models
            }
        },
        { status: 200 }
    );
}