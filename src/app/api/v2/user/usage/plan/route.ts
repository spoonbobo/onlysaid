import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    const plan = await db('user_plans')
        .where('user_id', authenticated.user.id)
        .first();

    return NextResponse.json(
        { data: plan },
        { status: 200 }
    );
}

export async function POST(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    const body = await request.json();
    const { plan_type, monthly_limit, reset_date } = body;

    const plan = await db('user_plans')
        .insert({
            user_id: authenticated.user.id,
            plan_type,
            monthly_limit: monthly_limit || 0.0,
            current_usage: 0.0,
            reset_date,
        })
        .returning('*');

    return NextResponse.json(
        { data: plan[0] },
        { status: 201 }
    );
}

export async function PUT(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    const body = await request.json();

    const updatedPlan = await db('user_plans')
        .where('user_id', authenticated.user.id)
        .update(body)
        .returning('*');

    return NextResponse.json(
        { data: updatedPlan[0] },
        { status: 200 }
    );
}