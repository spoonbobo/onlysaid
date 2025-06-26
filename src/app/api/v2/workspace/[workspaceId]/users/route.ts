import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";
import { inDevelopment } from "@/utils/common";
import { IAddUserToWorkspaceRequest } from "@/../../types/Workspace/Workspace";

const findUserByEmail = async (email: string) => {
    const user = await db(DBTABLES.USERS)
        .where('email', email)
        .first();
    console.log("existingUser", user);
    return user;
};

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const userRequests = await request.json();
    const { workspaceId } = await context.params;

    const usersToInsert = await Promise.all(userRequests.map(async (user: IAddUserToWorkspaceRequest) => {
        if (user.email) {
            const existingUser = await findUserByEmail(user.email);
            if (existingUser) {
                return {
                    workspace_id: workspaceId,
                    user_id: existingUser.id,
                    role: user.role
                };
            }
        }
        return {
            workspace_id: workspaceId,
            user_id: user.user_id,
            role: user.role
        };
    }));

    const invalidUsers = usersToInsert.filter(user =>
        user.workspace_id === undefined ||
        user.user_id === undefined ||
        user.role === undefined
    );

    if (invalidUsers.length > 0) {
        return NextResponse.json(
            { message: "Failed to add users: Missing required fields", invalidUsers },
            { status: 400 }
        );
    }

    const workspace = await db(DBTABLES.WORKSPACE_USERS)
        .insert(usersToInsert)
        .returning('*');

    return NextResponse.json(
        { message: "Users added to workspace", data: workspace },
        { status: 200 }
    );
}

export async function GET(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await context.params;

    const wu = DBTABLES.WORKSPACE_USERS;
    const u = DBTABLES.USERS;

    const workspaceUsers = await db(wu)
        .join(u, `${wu}.user_id`, '=', `${u}.id`)
        .where(`${wu}.workspace_id`, workspaceId)
        .where(`${u}.is_human`, true)
        .select(`${wu}.*`, `${u}.username`, `${u}.avatar`, `${u}.last_login`, `${u}.level`, `${u}.agent_id`)
        .returning('*');

    return NextResponse.json(
        { message: "Workspace users retrieved", data: workspaceUsers },
        { status: 200 }
    );
}

export async function PUT(request: Request) {
    return inDevelopment();
}

export async function DELETE(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const { workspaceId } = await context.params;

    if (!userId) {
        return NextResponse.json(
            { message: "User ID is required" },
            { status: 400 }
        );
    }

    const deleted = await db(DBTABLES.WORKSPACE_USERS)
        .where('workspace_id', workspaceId)
        .where('user_id', userId)
        .delete()
        .returning('*');

    return NextResponse.json(
        { message: "Users removed from workspace", data: deleted },
        { status: 200 }
    );
}