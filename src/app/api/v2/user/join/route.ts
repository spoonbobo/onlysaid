import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const userId = authenticated.user.id;

    if (!userId) {
        return NextResponse.json(
            { message: "User ID not found" },
            { status: 400 }
        );
    }

    const joinRequests = await db(DBTABLES.WORKSPACE_JOIN)
        .join(DBTABLES.WORKSPACES, `${DBTABLES.WORKSPACE_JOIN}.workspace_id`, '=', `${DBTABLES.WORKSPACES}.id`)
        .where(`${DBTABLES.WORKSPACE_JOIN}.user_id`, userId)
        .where(`${DBTABLES.WORKSPACE_JOIN}.status`, status)
        .select(
            `${DBTABLES.WORKSPACE_JOIN}.*`,
            `${DBTABLES.WORKSPACES}.name as workspace_name`,
            `${DBTABLES.WORKSPACES}.image as workspace_image`,
            `${DBTABLES.WORKSPACES}.invite_code`
        )
        .orderBy(`${DBTABLES.WORKSPACE_JOIN}.created_at`, 'desc');

    return NextResponse.json(
        { message: "User join requests retrieved", data: joinRequests },
        { status: 200 }
    );
}
