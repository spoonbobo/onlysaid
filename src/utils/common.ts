import { NextResponse } from "next/server";

/**
 * Returns a standardized response for API endpoints that are still under development
 */
export const inDevelopment = () => {
    return NextResponse.json(
        { message: "This endpoint is under development" },
        { status: 501 }
    );
};