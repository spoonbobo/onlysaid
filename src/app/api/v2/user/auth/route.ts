import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { DBTABLES } from "@/lib/db";
import { inDevelopment } from "@/utils/common";

export async function POST(request: Request) {
    return inDevelopment();
}

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    // Update last_login timestamp
    await db(DBTABLES.USERS)
        .where('id', authenticated.user.id)
        .update({ last_login: new Date() });

    const user = await db(DBTABLES.USERS)
        .where('id', authenticated.user.id)
        .select('*')
        .first();

    return NextResponse.json(
        { data: user },
        { status: 200 }
    );
}

export async function PUT(request: Request) {
    return inDevelopment();
}

export async function DELETE(request: Request) {
    return inDevelopment();
}

