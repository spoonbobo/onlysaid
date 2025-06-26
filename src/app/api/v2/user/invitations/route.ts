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
    const userEmail = authenticated.user.email;

    if (!userEmail) {
        return NextResponse.json(
            { message: "User email not found" },
            { status: 400 }
        );
    }

    const invitations = await db(DBTABLES.WORKSPACE_INVITATIONS)
        .join(DBTABLES.USERS, `${DBTABLES.WORKSPACE_INVITATIONS}.inviter_id`, '=', `${DBTABLES.USERS}.id`)
        .join(DBTABLES.WORKSPACES, `${DBTABLES.WORKSPACE_INVITATIONS}.workspace_id`, '=', `${DBTABLES.WORKSPACES}.id`)
        .where(`${DBTABLES.WORKSPACE_INVITATIONS}.invitee_email`, userEmail)
        .where(`${DBTABLES.WORKSPACE_INVITATIONS}.status`, status)
        .select(
            `${DBTABLES.WORKSPACE_INVITATIONS}.*`,
            `${DBTABLES.USERS}.username as inviter_username`,
            `${DBTABLES.USERS}.avatar as inviter_avatar`,
            `${DBTABLES.WORKSPACES}.name as workspace_name`,
            `${DBTABLES.WORKSPACES}.image as workspace_image`
        );

    return NextResponse.json(
        { message: "User invitations retrieved", data: invitations },
        { status: 200 }
    );
} 