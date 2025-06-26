import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";
import { inDevelopment } from "@/utils/common";
import { ICreateWorkspaceArgs } from "@/../../types/Workspace/Workspace";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const body: ICreateWorkspaceArgs = await request.json();

    const workspace = await db(DBTABLES.WORKSPACES)
        .insert(body)
        .returning('*');

    const storageDir = path.join(process.cwd(), 'storage', `${workspace[0].id}`);
    await fs.promises.mkdir(storageDir, { recursive: true });

    return NextResponse.json(
        { message: "Workspace created", data: workspace },
        { status: 200 }
    );
}

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json(
            { message: "User ID is required" },
            { status: 400 }
        );
    }

    const ws = DBTABLES.WORKSPACES;
    const wu = DBTABLES.WORKSPACE_USERS;

    const workspaces = await db(ws)
        .join(wu, `${ws}.id`, '=', `${wu}.workspace_id`)
        .where(`${wu}.user_id`, userId)
        .select(`${ws}.*`, `${wu}.role`)
        .returning('*');

    return NextResponse.json(
        { message: "Workspaces fetched", data: workspaces },
        { status: 200 }
    );
}

export async function PUT(request: Request) {
    return inDevelopment();
}

export async function DELETE(request: Request) {
    return inDevelopment();
}
