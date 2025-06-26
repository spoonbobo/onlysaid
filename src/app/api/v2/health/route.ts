import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    // Simple health check - if we can authenticate, we're healthy
    return NextResponse.json(
        { 
            status: "healthy",
            timestamp: new Date().toISOString(),
            user_id: authenticated.user.id,
            service: "onlysaid-api"
        },
        { status: 200 }
    );
} 